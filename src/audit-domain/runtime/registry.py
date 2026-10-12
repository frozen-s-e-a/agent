"""The 63 public task contracts dispatch to owned Python implementations."""
import json
from pathlib import Path

from . import table_tasks, analysis_tasks, workbook_tasks, workpaper_tasks, document_tasks, bank_tasks, network_tasks, company_tasks

TASKS={}
for module in [table_tasks,analysis_tasks,workbook_tasks,workpaper_tasks,document_tasks,bank_tasks,network_tasks,company_tasks]:
    overlap=TASKS.keys() & module.TASKS.keys()
    if overlap:raise RuntimeError('Duplicate task implementations: '+','.join(overlap))
    TASKS.update(module.TASKS)


def contracts():
    source=Path(__file__).resolve().parents[2]/'resources'/'audit-task-tools.json'
    return json.loads(source.read_text(encoding='utf-8-sig'))


def dispatch(ctx,name):
    if name not in TASKS:raise ValueError('未知审计任务: '+str(name))
    return TASKS[name](ctx)


def verify_registry():
    declared={t['name'] for t in contracts()}
    if set(TASKS)!=declared:raise RuntimeError('Task registry mismatch: missing='+str(declared-set(TASKS))+' extra='+str(set(TASKS)-declared))
    return len(TASKS)
