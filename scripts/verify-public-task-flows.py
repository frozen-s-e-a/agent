"""Run the shipping task implementations against public disclosure services.

No model or CICPA credentials are read. Downloaded files and the verification
record remain in a separate synthetic project for inspection.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import hashlib
import json
from pathlib import Path
import sys
import traceback
import uuid

from runtime.context import Context
from runtime.registry import dispatch
import pandas as pd
from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'artifacts' / 'independent-live-validation' / ('public-tasks-' + uuid.uuid4().hex[:8])
ROOT.mkdir(parents=True)


def verify(task, arguments):
    record = {'task': task, 'arguments': arguments, 'serviceMode': 'live-public', 'startedAt': datetime.now().isoformat()}
    print('START ' + task, flush=True)
    try:
        ctx = Context({'root': str(ROOT), 'taskId': task + '-' + uuid.uuid4().hex[:8], 'arguments': arguments})
        result = dispatch(ctx, task)
        assert result['success'], result
        pdfs = []
        for item in result['outputs']:
            path = ROOT / item['path']
            assert path.is_file()
            assert hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']
            if path.suffix.lower() == '.pdf':
                reader = PdfReader(path)
                assert len(reader.pages) > 0
                pdfs.append({'name': path.name, 'pages': len(reader.pages), 'size': path.stat().st_size})
        if task.startswith('ipo_') or task == 'announcement':
            assert pdfs, 'No actual PDF was downloaded; this does not verify the download flow'
            indexes = [ROOT / item['path'] for item in result['outputs'] if item['name'].endswith('.xlsx')]
            assert indexes, 'No disclosure index'
            assert len(pd.read_excel(indexes[0])) == len(pdfs)
        if task == 'currency':
            df = pd.read_excel(next(ROOT / x['path'] for x in result['outputs'] if x['name'].endswith('.xlsx')))
            assert len(df) > 1000 and '日期' in df and not df['日期'].duplicated().any()
            assert df.drop(columns=['日期']).notna().any().any()
            assert pd.to_datetime(df['日期']).max() >= pd.Timestamp('2026-10-01'), 'Recent rates were not appended'
            record['rows'] = len(df)
            record['latestDate'] = str(pd.to_datetime(df['日期']).max().date())
        record.update(passed=True, outputs=result['outputs'], pdfs=pdfs)
        print('PASS ' + task + ' (' + str(len(pdfs)) + ' PDFs)', flush=True)
    except Exception as error:
        record.update(passed=False, error=str(error), traceback=traceback.format_exc())
        print('FAIL ' + task + ': ' + str(error), flush=True)
    record['finishedAt'] = datetime.now().isoformat()
    return record


def main():
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--tasks',nargs='+');options=parser.parse_args()
    cases = [(task, {'start_date': '2026-10-09', 'end_date': '2026-10-09', 'update_mode': '文件'})
             for task in ['ipo_sz', 'ipo_sh', 'ipo_bj']]
    cases += [('currency', {}), ('announcement', {'stock_codes': ['000001'], 'start_date': '2026-03-01', 'end_date': '2026-04-30', 'market_type': '京沪深', 'category_name': '年报', 'keyword': '2025年年度报告'})]
    if options.tasks:cases=[c for c in cases if c[0] in options.tasks]
    if not cases:raise ValueError('No matching public task')
    records = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        for future in as_completed([pool.submit(verify, task, args) for task, args in cases]):
            records.append(future.result())
    report = {'project': str(ROOT), 'passed': sum(r['passed'] for r in records), 'total': len(records), 'CICPA': 'skipped-by-user', 'records': records}
    (ROOT / '公开服务实测.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'records'}, ensure_ascii=False), flush=True)
    return 0 if report['passed'] == report['total'] else 1


if __name__ == '__main__':
    sys.exit(main())
