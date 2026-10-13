// Windows single-file distribution. Business code is the verified embedded app.
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Drawing;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections;
using System.Collections.Generic;

internal static class PortableLauncher {
    const string Version="__VERSION__";
    const string PayloadHash="__PAYLOAD_HASH__";
    const string ManifestHash="__MANIFEST_HASH__";
    const string Footer="AUDIT-SFX-1-END";
    [STAThread] static int Main() {
        AppContext.SetSwitch("Switch.System.IO.UseLegacyPathHandling",false);
        AppContext.SetSwitch("Switch.System.IO.BlockLongPaths",false);
        // The portable EXE contains a compressed application directory. Windows
        // cannot execute files directly from that appended archive, so a first
        // launch (or payload update) must release and verify it in the user cache.
        // Do that synchronously and silently; the preparation form was only a
        // progress affordance and is intentionally not created anymore.
        try {LaunchApp(Prepare());return 0;}
        catch(Exception error) {
            Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
            MessageBox.Show("程序未能打开："+error.Message,"AI 审计助手",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;
        }
    }
    static string GetCacheBase() {
        string cacheBase=Environment.GetEnvironmentVariable("AUDIT_PORTABLE_ROOT");
        if(String.IsNullOrWhiteSpace(cacheBase))cacheBase=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"AuditAssistant","app");
        cacheBase=Path.GetFullPath(cacheBase);Directory.CreateDirectory(cacheBase);return cacheBase;
    }
    static string GetCacheTarget(string cacheBase) {
        string pointer=Path.Combine(cacheBase,"active-"+PayloadHash.Substring(0,12)+".txt");
        if(File.Exists(pointer)) {
            try {
                string name=File.ReadAllText(pointer,Encoding.UTF8).Trim();
                if(!String.IsNullOrEmpty(name)) {
                    string candidate=Path.GetFullPath(Path.Combine(cacheBase,name));CheckInside(cacheBase,candidate);
                    if(Directory.Exists(candidate))return candidate;
                }
            } catch(IOException) {} catch(ArgumentException) {}
        }
        return Path.Combine(cacheBase,PayloadHash.Substring(0,12));
    }
    static string Prepare() {
        string cacheBase=GetCacheBase();string target=GetCacheTarget(cacheBase);
        using(var mutex=new Mutex(false,"Local\\AuditAssistantPortable-"+PayloadHash.Substring(0,20))) {
            bool locked=false;
            try {
                try {locked=mutex.WaitOne(120000);}catch(AbandonedMutexException){locked=true;}
                if(!locked)throw new IOException("另一个窗口仍在准备程序，请稍后再试。");
                if(!CacheValid(target)) {
                    string stage=Path.Combine(cacheBase,"prepare-"+Guid.NewGuid().ToString("N"));
                    Directory.CreateDirectory(stage);
                    Extract(stage);
                    if(!CacheValid(stage))throw new IOException("程序文件验证未通过，请重新获取完整程序。");
                    if(!Directory.Exists(target)) {
                        CheckInside(cacheBase,stage);CheckInside(cacheBase,target);Directory.Move(stage,target);
                    } else target=stage;
                    // Retain a repaired cache as the active directory so an
                    // old damaged cache does not trigger extraction every time.
                    string pointer=Path.Combine(cacheBase,"active-"+PayloadHash.Substring(0,12)+".txt"),pending=pointer+".pending";
                    File.WriteAllText(pending,Path.GetFileName(target),Encoding.UTF8);
                    if(File.Exists(pointer))File.Replace(pending,pointer,null);else File.Move(pending,pointer);
                }
            } finally {if(locked)mutex.ReleaseMutex();}
        }
        return target;
    }
    static void LaunchApp(string target) {
        string executable=Path.Combine(target,"AI助手.exe");
        var info=new ProcessStartInfo(executable) {WorkingDirectory=target,UseShellExecute=false};
        info.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
        info.EnvironmentVariables.Remove("AUDIT_NODE");info.EnvironmentVariables.Remove("AUDIT_PYTHON");
        info.EnvironmentVariables.Remove("AUDIT_WORKBENCH_PREVIEW");
        var app=Process.Start(info);if(app==null)throw new IOException("无法打开审计工作台。");
        string record=Environment.GetEnvironmentVariable("AUDIT_PORTABLE_TEST_RECORD");
        if(!String.IsNullOrEmpty(record))File.WriteAllText(record,new JavaScriptSerializer().Serialize(new {version=Version,path=target,processId=app.Id,payloadSha256=PayloadHash,launcherHasWindow=Process.GetCurrentProcess().MainWindowHandle!=IntPtr.Zero}),Encoding.UTF8);
    }
    static void CheckInside(string root,string candidate) {
        string prefix=Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
        string resolved=Path.GetFullPath(candidate);
        if(!resolved.StartsWith(prefix,StringComparison.OrdinalIgnoreCase))throw new IOException("程序文件路径无效。");
    }
    static string Hash(Stream stream) {using(var algorithm=SHA256.Create())return BitConverter.ToString(algorithm.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}
    static string FileHash(string file) {using(var input=File.OpenRead(file))return Hash(input);}
    static bool CacheValid(string root) {
        try {
            string manifest=Path.Combine(root,"package-files.json");
            if(!File.Exists(manifest)||FileHash(manifest)!=ManifestHash)return false;
            var serializer=new JavaScriptSerializer {MaxJsonLength=16000000};
            var files=serializer.Deserialize<List<Dictionary<string,object>>>(File.ReadAllText(manifest,Encoding.UTF8));
            foreach(var file in files) {
                string relative=(string)file["path"];string path=Path.GetFullPath(Path.Combine(root,relative));CheckInside(root,path);
                var info=new FileInfo(path);if(!info.Exists||info.Length!=Convert.ToInt64(file["size"]))return false;
                if(relative=="AI助手.exe"||relative=="resources\\app\\runtime\\node.exe"||relative=="resources\\app\\runtime\\python\\python.exe"||relative=="resources\\app\\src\\audit-domain\\task_worker.py"||relative=="resources\\app\\src\\host\\service.mjs")if(FileHash(path)!=(string)file["sha256"])return false;
            }
            return true;
        } catch {return false;}
    }
    static void Extract(string target) {
        using(var file=File.OpenRead(Application.ExecutablePath)) {
            byte[] marker=Encoding.ASCII.GetBytes(Footer);file.Position=file.Length-marker.Length;
            byte[] actual=new byte[marker.Length];if(file.Read(actual,0,actual.Length)!=actual.Length||Encoding.ASCII.GetString(actual)!=Footer)throw new IOException("程序包不完整。");
            file.Position=file.Length-marker.Length-8;long length=new BinaryReader(file).ReadInt64();
            long offset=file.Length-marker.Length-8-length;if(length<=0||offset<=0)throw new IOException("程序包长度无效。");
            using(var content=new SliceStream(file,offset,length)) {
                if(Hash(content)!=PayloadHash)throw new IOException("程序包校验失败，请重新获取文件。");
                content.Position=0;
                using(var zip=new ZipArchive(content,ZipArchiveMode.Read,true,Encoding.UTF8)) {
                    foreach(var entry in zip.Entries) {
                        const string prefix="AI助手/";
                        if(!entry.FullName.StartsWith(prefix,StringComparison.Ordinal))throw new IOException("程序包目录结构无效。");
                        string name=entry.FullName.Substring(prefix.Length);if(name.Length==0)continue;
                        string path=Path.GetFullPath(Path.Combine(target,name.Replace('/',Path.DirectorySeparatorChar)));CheckInside(target,path);
                        if(entry.Name.Length==0){Directory.CreateDirectory(path);continue;}
                        Directory.CreateDirectory(Path.GetDirectoryName(path));
                        using(var input=entry.Open())using(var output=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None))input.CopyTo(output);
                    }
                }
            }
        }
    }
    sealed class SliceStream:Stream {
        readonly Stream source;readonly long offset,length;long position;
        public SliceStream(Stream source,long offset,long length){this.source=source;this.offset=offset;this.length=length;}
        public override bool CanRead{get{return true;}}public override bool CanSeek{get{return true;}}public override bool CanWrite{get{return false;}}
        public override long Length{get{return length;}}
        public override long Position{get{return position;}set{Seek(value,SeekOrigin.Begin);}}
        public override int Read(byte[] buffer,int start,int count){source.Position=offset+position;int read=source.Read(buffer,start,(int)Math.Min(count,length-position));position+=read;return read;}
        public override long Seek(long value,SeekOrigin origin){long next=origin==SeekOrigin.Begin?value:origin==SeekOrigin.Current?position+value:length+value;if(next<0||next>length)throw new IOException("程序包读取范围无效。");return position=next;}
        public override void Flush(){}public override void SetLength(long value){throw new NotSupportedException();}public override void Write(byte[] buffer,int start,int count){throw new NotSupportedException();}
    }
}
