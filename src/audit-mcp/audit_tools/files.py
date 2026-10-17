"""输入文件和快照（《接口约定》2.1、2.6）。

工具参数里的文件可以是 F- 编号或项目内的相对路径。第一次用到一个文件时复制一份快照，之后按
快照计算：用户在 Excel 里继续改原文件，不影响已经开始的任务。F- 编号为文件内容 SHA-256 的前 12 位。
"""
import csv
import hashlib
import io
import shutil
from pathlib import Path

from .common import ToolError

SUPPORTED = ('.xlsx', '.xlsm', '.csv')


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


class Files:
    def __init__(self, store):
        self.store = store
        self.root = store.root
        self.snapshots = store.dir / 'snapshots'
        self.snapshots.mkdir(exist_ok=True)

    def _candidates(self):
        skip = {self.store.dir.resolve(), (self.root / '输出').resolve(), (self.root / 'outputs').resolve()}
        for path in self.root.rglob('*'):
            if path.suffix.lower() not in SUPPORTED or path.name.startswith('~$') or not path.is_file():
                continue
            if any(parent in skip for parent in path.resolve().parents):
                continue
            yield path

    def resolve(self, ref):
        """→ (F- 编号, 快照路径, 原文件名)。"""
        if not isinstance(ref, str) or not ref.strip():
            raise ToolError('ARG_INVALID', '文件参数应为 F- 编号或项目内的相对路径')
        index = self.store.index('files')
        if ref in index:
            entry = index[ref]
            return ref, self.snapshots / entry['snapshot'], entry['name']
        if ref.startswith('F-'):
            # 宿主登记的 F- 编号：在项目目录里按内容哈希找到对应文件。
            known = {e['source']: (fid, e) for fid, e in index.items()}
            for path in self._candidates():
                rel = path.relative_to(self.root).as_posix()
                stat = path.stat()
                cached = known.get(rel)
                if cached and cached[1].get('size') == stat.st_size and cached[1].get('mtime') == stat.st_mtime:
                    continue
                if 'F-' + sha256(path)[:12] == ref:
                    return self._snapshot(path, index)
            raise ToolError('REF_NOT_FOUND', '项目目录里找不到 %s 对应的文件' % ref, hint='文件可能已被修改或移走，请重新添加')
        path = (self.root / ref).resolve()
        if not path.is_relative_to(self.root) or not path.is_file():
            raise ToolError('IO_NOT_FOUND', '项目目录里找不到文件：%s' % ref)
        if path.suffix.lower() not in SUPPORTED:
            raise ToolError('IO_UNSUPPORTED', '暂不支持 %s 文件' % path.suffix, hint='.xls 请先用 Excel 另存为 .xlsx')
        return self._snapshot(path, index)

    def _snapshot(self, path, index):
        digest = sha256(path)
        fid = 'F-' + digest[:12]
        if fid not in index:
            target = self.snapshots / (fid + path.suffix.lower())
            shutil.copyfile(path, target)
            stat = path.stat()
            index[fid] = {'snapshot': target.name, 'name': path.name, 'source': path.relative_to(self.root).as_posix(), 'sha256': digest, 'size': stat.st_size, 'mtime': stat.st_mtime}
            self.store.save_index('files', index)
        entry = index[fid]
        return fid, self.snapshots / entry['snapshot'], entry['name']


def read_csv_rows(path):
    raw = Path(path).read_bytes()
    for encoding in ('utf-8-sig', 'gb18030'):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ToolError('IO_ENCODING', '无法识别 CSV 文件的编码')
    return [row for row in csv.reader(io.StringIO(text))]
