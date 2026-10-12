from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook


TABLES = {'.xlsx', '.xlsm', '.csv', '.tsv'}
EXCEL = {'.xlsx', '.xlsm'}


def plain(value):
    """Convert dataframe scalars to strict JSON, including missing values."""
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [plain(v) for v in value]
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (pd.Timestamp,)):
        return None if pd.isna(value) else value.isoformat()
    if hasattr(value, 'item'):
        return plain(value.item())
    if value is None:
        return None
    if isinstance(value, float):
        import math
        if not math.isfinite(value): return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return value


def json_value(value, default=None):
    if value is None or value == '':
        return default
    return json.loads(value) if isinstance(value, str) else value


def split(value, sep=r'[,，;；\n]'):
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [v.strip() for v in re.split(sep, str(value or '')) if v.strip()]


def number(series):
    return pd.to_numeric(series.astype(str).str.replace(',', '', regex=False), errors='coerce').fillna(0)


def safe_name(value):
    value = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', str(value)).strip(' .')[:140]
    if re.match(r'^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',value,re.I):value='_'+value
    return value or '结果'


class Context:
    def __init__(self, request, emit=lambda event: None, session=None):
        self.root = Path(request['root']).resolve(strict=True)
        self.task_id = str(request.get('taskId', 'manual'))
        if not re.fullmatch(r'[\w-]{1,100}', self.task_id):
            raise ValueError('任务编号无效')
        self.args = request.get('arguments', {})
        self.settings = request.get('settings', {})
        output_base = self.path('outputs')
        output_base.mkdir(exist_ok=True)
        self.output = self.path(output_base / self.task_id)
        self.output.mkdir(parents=True, exist_ok=False)
        self.emit = emit
        self.outputs = []
        self.warnings = []
        self.session = session
        self._copies = {}

    def path(self, value, exists=False):
        if not isinstance(value, (str, Path)) or not str(value).strip():
            raise ValueError('文件路径不能为空')
        p = Path(value)
        p = (p if p.is_absolute() else self.root / p).resolve()
        if not p.is_relative_to(self.root):
            raise ValueError('路径超出当前项目: ' + p.name)
        if exists and not p.exists():
            raise FileNotFoundError('项目内文件不存在: ' + str(p.relative_to(self.root)))
        return p

    def files(self, value, extensions=TABLES, keyword=''):
        paths = value if isinstance(value, list) else [value]
        found = []
        for v in paths:
            p = self.path(v, True)
            if p.is_file():
                if extensions and p.suffix.lower() not in extensions:
                    raise ValueError('不支持的文件格式: ' + p.suffix)
                found.append(p)
            else:
                for f in sorted(p.rglob('*')):
                    if f.is_symlink() or not f.is_file() or f.name.startswith('~$'):
                        continue
                    if any(x in {'outputs', 'output', '.git', '.legacy-home'} for x in f.relative_to(p).parts):
                        continue
                    if (not extensions or f.suffix.lower() in extensions) and (not keyword or keyword in f.name):
                        found.append(self.path(f, True))
                    if len(found) > 1000:
                        raise ValueError('一次最多处理 1000 个文件，请缩小目录范围')
        found = list(dict.fromkeys(found))
        if not found:
            raise ValueError('所选资料中没有本任务支持的文件')
        return found

    def table(self, value, sheet=None, header=1, **kwargs):
        p = self.path(value, True)
        if p.suffix.lower() in {'.csv', '.tsv'}:
            for encoding in ['utf-8-sig', 'gb18030']:
                try:
                    return pd.read_csv(p, sep='\t' if p.suffix.lower() == '.tsv' else ',', encoding=encoding,
                                       header=int(header)-1, **kwargs)
                except UnicodeDecodeError:
                    continue
            raise ValueError('CSV 编码无法识别')
        if p.suffix.lower() not in EXCEL:
            raise ValueError('请使用 XLSX / XLSM / CSV / TSV 文件')
        return pd.read_excel(p, sheet_name=sheet or 0, header=int(header)-1, **kwargs)

    def merged(self, value, sheet=None, header=1, **kwargs):
        frames = []
        for p in self.files(value):
            df = self.table(p, sheet, header, **kwargs)
            df['_来源文件'] = str(p.relative_to(self.root))
            df['_来源行'] = range(int(header)+1, int(header)+1+len(df))
            frames.append(df)
        return pd.concat(frames, ignore_index=True)

    def destination(self, filename):
        p=Path(filename)
        return self.output / (safe_name(p.stem)+p.suffix if p.suffix else safe_name(filename))

    def register(self, p):
        p = self.path(p, True)
        if not p.is_file():
            raise ValueError('成果必须是文件')
        relative = str(p.relative_to(self.root))
        if not any(x['path'] == relative for x in self.outputs):
            self.outputs.append({'name': p.name, 'path': relative, 'size': p.stat().st_size,
                                 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
        return p

    def report(self, sheets, filename='处理结果.xlsx'):
        path = self.destination(filename)
        if isinstance(sheets, pd.DataFrame):
            sheets = {'处理结果': sheets}
        used = set()
        with pd.ExcelWriter(path, engine='openpyxl') as writer:
            for name, frame in sheets.items():
                name = re.sub(r'[\[\]:*?/\\]', '_', str(name))[:31] or '结果'
                while name in used:
                    name = name[:27] + str(len(used))
                used.add(name)
                df = frame if isinstance(frame, pd.DataFrame) else pd.DataFrame(frame)
                # External document strings are data, never spreadsheet formulas.
                def cell_value(v):
                    if isinstance(v, (dict,list,tuple,set)):return json.dumps(plain(v),ensure_ascii=False)
                    return "'"+v if isinstance(v,str) and v.startswith(('=', '+', '@')) else v
                df = df.map(cell_value)
                if len(df) > 1048575:
                    raise ValueError('结果超过 Excel 行数上限，请拆分输入')
                df.to_excel(writer, sheet_name=name, index=False)
                ws = writer.sheets[name]
                ws.freeze_panes = 'A2'
                if len(df.columns):
                    ws.auto_filter.ref = ws.dimensions
        return self.register(path)

    def json(self, data, filename='结果说明.json'):
        path = self.destination(filename)
        path.write_text(json.dumps(plain(data), ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
        return self.register(path)

    def copy(self, source, folder='处理副本'):
        source = self.path(source, True)
        if source in self._copies:
            return self._copies[source]
        target_dir = self.output / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / source.name
        if target.exists():
            target = target_dir / (source.stem+'_'+hashlib.sha256(str(source).encode()).hexdigest()[:8]+source.suffix)
        shutil.copy2(source, target)
        self._copies[source] = target
        return target

    def config(self, value=None):
        value = value or self.args.get('config_file')
        if not value:
            raise ValueError('请准备并选择本任务的配置表')
        p = self.path(value, True)
        if p.suffix.lower() not in EXCEL:
            raise ValueError('配置表必须是 XLSX 或 XLSM')
        wb = load_workbook(p, data_only=True)
        return wb

    def kv(self, wb, sheet='配置表'):
        if sheet not in wb:
            raise ValueError('配置表缺少工作表: ' + sheet)
        return {str(row[0]).strip(): row[1] for row in wb[sheet].values if len(row)>1 and row[0] is not None}

    def rows(self, wb, sheet='配置表', start=2):
        if sheet not in wb:
            raise ValueError('配置表缺少工作表: ' + sheet)
        values = list(wb[sheet].values)
        headers = [str(v or '').strip() for v in values[0]]
        return [{k: v for k, v in zip(headers, row) if k} for row in values[start-1:] if any(v is not None for v in row)]

    def result(self, data=None, frame=None):
        result = {'success': True, 'status': 'success', 'outputs': self.outputs,
                  'warnings': self.warnings, 'runtime': 'independent-python', **(data or {})}
        if frame is not None:
            result.update(rowCount=len(frame), columns=list(frame.columns), preview=plain(frame.head(20).to_dict('records')))
        return plain(result)

    def require(self, df, columns):
        missing = [str(c) for c in columns if c and c not in df.columns]
        if missing:
            raise ValueError('数据源缺少列: ' + '、'.join(missing))

