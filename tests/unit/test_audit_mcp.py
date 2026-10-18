import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SERVER=ROOT/'src'/'audit-mcp'/'server.py'
sys.path.insert(0,str(SERVER.parent))
import server as audit_mcp

def run(messages, project=None, **env):
    environment={**os.environ,**env}
    environment.pop('AUDIT_PROJECT_ROOT',None)
    if project:environment['AUDIT_PROJECT_ROOT']=str(project)
    lines='\n'.join(json.dumps(m,ensure_ascii=False) for m in messages)+'\n'
    out=subprocess.run([sys.executable,'-X','utf8',str(SERVER)],input=lines.encode('utf-8'),capture_output=True,env=environment,timeout=120)
    replies=[json.loads(line) for line in out.stdout.decode('utf-8').splitlines() if line.strip()]
    return {r['id']:r for r in replies if 'id' in r},[r for r in replies if 'id' not in r]

def call(rid,name,arguments,token=None):
    params={'name':name,'arguments':arguments}
    if token:params['_meta']={'progressToken':token}
    return {'jsonrpc':'2.0','id':rid,'method':'tools/call','params':params}

INIT={'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'test','version':'1'}}}

class AuditMcpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.project=Path(cls.tmp.name)
        import pandas as pd
        pd.DataFrame({'科目':['1001','1122'],'期末余额':[100.5,35000]}).to_excel(cls.project/'余额表.xlsx',index=False)
    @classmethod
    def tearDownClass(cls): cls.tmp.cleanup()

    def test_initialize_and_list(self):
        replies,_=run([INIT,{'jsonrpc':'2.0','id':2,'method':'tools/list'}],self.project)
        self.assertEqual(replies[1]['result']['protocolVersion'],'2025-06-18')
        self.assertEqual(replies[1]['result']['serverInfo']['interface'],'audit-tools/1')
        names={t['name'] for t in replies[2]['result']['tools']}
        self.assertIn('select_column',names)
        self.assertFalse(names & audit_mcp.NETWORK_TOOLS,'联网工具默认不提供')
        import audit_tools
        self.assertTrue(set(audit_tools.TOOLS)<=names,'底稿任务的新工具都在清单里')
        self.assertEqual(len(names),63-len(audit_mcp.NETWORK_TOOLS)+len(audit_tools.TOOLS))

    def test_unknown_protocol_version_answers_latest(self):
        replies,_=run([{**INIT,'params':{**INIT['params'],'protocolVersion':'2099-01-01'}}],self.project)
        self.assertEqual(replies[1]['result']['protocolVersion'],audit_mcp.PROTOCOL_VERSIONS[0])

    def test_tool_allow_and_deny_lists(self):
        replies,_=run([INIT,{'jsonrpc':'2.0','id':2,'method':'tools/list'}],self.project,AUDIT_MCP_TOOLS='select_column,tool_preview,announcement',AUDIT_MCP_DENY='tool_preview')
        self.assertEqual([t['name'] for t in replies[2]['result']['tools']],['select_column'])

    def test_call_returns_envelope_and_progress(self):
        args={'folder_path':'余额表.xlsx','should_merge':'是','sheet_keywords':'','columns_to_keep':'科目,期末余额'}
        replies,notes=run([INIT,call(2,'select_column',args,token='p')],self.project)
        result=replies[2]['result']
        self.assertFalse(result['isError'])
        envelope=result['structuredContent']
        self.assertEqual(json.loads(result['content'][0]['text']),envelope)
        self.assertTrue(envelope['ok']);self.assertEqual(envelope['data']['rowCount'],2)
        self.assertEqual(set(envelope),{'ok','data','warnings','refs','truncated','next'})
        self.assertTrue(all((self.project/ref).is_file() for ref in envelope['refs']))
        self.assertTrue(any(n['method']=='notifications/progress' and n['params']['progressToken']=='p' for n in notes))

    def test_path_outside_project_is_argument_error(self):
        replies,_=run([INIT,call(2,'select_column',{'folder_path':'../','should_merge':'是','sheet_keywords':'','columns_to_keep':'x'})],self.project)
        envelope=replies[2]['result']['structuredContent']
        self.assertTrue(replies[2]['result']['isError'])
        self.assertEqual(envelope['error']['code'],'ARG_INVALID');self.assertTrue(envelope['error']['retryable'])

    def test_no_project_and_unknown_tool(self):
        replies,_=run([INIT,call(2,'select_column',{}),call(3,'announcement',{})])
        self.assertEqual(replies[2]['result']['structuredContent']['error']['code'],'ENV_NO_PROJECT')
        self.assertEqual(replies[3]['result']['structuredContent']['error']['code'],'ARG_UNKNOWN_TOOL')

    def test_large_results_are_compacted(self):
        result={'success':True,'status':'success','outputs':[{'path':'outputs/x/a.xlsx'}],'preview':[{'i':i,'text':'很长'*300} for i in range(200)]}
        envelope=audit_mcp.envelope_from_result(result)
        self.assertTrue(envelope['truncated'])
        self.assertLessEqual(len(audit_mcp.dumps(envelope)),audit_mcp.TEXT_BUDGET)
        self.assertEqual(envelope['refs'],['outputs/x/a.xlsx'])

    def test_failed_result_maps_to_error_envelope(self):
        envelope=audit_mcp.envelope_from_result({'success':False,'status':'failed','message':'没有匹配的工作表'})
        self.assertEqual(envelope,{'ok':False,'error':{'code':'TOOL_FAILED','message':'没有匹配的工作表','retryable':True}})

if __name__=='__main__':unittest.main()
