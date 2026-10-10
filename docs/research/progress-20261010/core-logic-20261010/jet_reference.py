"""Independent research reconstruction. Does not import or call legacy code.

This preserves measured legacy semantics for comparison, including questionable
edge cases. It is not the production implementation or an audit-policy decision.
"""
import operator
import re
import numpy as np
import pandas as pd


def force_numeric(series):
    text = series.astype(str).str.replace(',', '', regex=False)
    return pd.to_numeric(text, errors='coerce').fillna(0)


def check_single_item(series, item):
    text = str(item).strip()
    match = re.match(r'^(>=|<=|!=|>|<|=)\s*(-?\d+\.?\d*)$', text)
    if match and match.group(1) != '=':
        op = {'>':operator.gt, '<':operator.lt, '>=':operator.ge,
              '<=':operator.le, '!=':operator.ne}[match.group(1)]
        return op(force_numeric(series), float(match.group(2)))
    if re.match(r'^(-?\d+\.?\d*)$', text):
        return force_numeric(series) == float(text)
    values = series.astype(str).fillna('')
    if text.startswith('!^'):
        return ~values.str.startswith(text[2:])
    if text.startswith('!'):
        return ~values.str.contains(re.escape(text[1:]), case=False)
    if text.startswith('^'):
        return values.str.startswith(text[1:])
    if text.startswith('#') or text.startswith('='):
        return values == text[1:]
    return values.str.contains(re.escape(text), case=False)


def check_condition(series, rule_value):
    if pd.isna(rule_value) or not str(rule_value).strip():
        return None
    expression = str(rule_value).strip()
    if expression in ['是', '否']:
        return series.astype(str) == expression
    if expression in ['[空]', '![空]']:
        normalized = series.replace(r'^\s*$', np.nan, regex=True)
        return normalized.isna() if expression == '[空]' else normalized.notna()
    items = [item.strip() for item in expression.replace('，', ',').split(',')]
    negative = [item for item in items if item.startswith('!') and not re.match(r'^!=',item)]
    positive = [item for item in items if not item.startswith('!') or re.match(r'^!=',item)]
    result = pd.Series(not positive,index=series.index)
    for item in positive:
        result = result | check_single_item(series,item)
    for item in negative:
        result = result & check_single_item(series,item)
    return result


def parse_cols(value):
    if value is None or pd.isna(value):
        return []
    return [column.strip() for column in str(value).replace('，',',').split(',') if column.strip()]


def apply_feature(df, tool, source_cols, param):
    columns = parse_cols(source_cols)
    if tool == '日期_计算月差':
        a,b = [pd.to_datetime(df[column],errors='coerce') for column in columns[:2]]
        return ((a.dt.year*12+a.dt.month)-(b.dt.year*12+b.dt.month)).abs().fillna(0).astype(int)
    if tool in ['日期_提取月份','日期_提取小时','日期_判断周末']:
        dates = pd.to_datetime(df[columns[0]],errors='coerce')
        if tool == '日期_判断周末':
            return pd.Series(np.where(dates.dt.dayofweek>=5,'是','否'),index=df.index)
        component = dates.dt.month if tool == '日期_提取月份' else dates.dt.hour
        return component.fillna(0).astype(int)
    if tool == '数值_求余数':
        return force_numeric(df[columns[0]]).replace(0,np.nan) % float(param)
    if tool == '文本_提取后几位':
        count = int(param)
        def tail(number):
            return '' if number == 0 else str(int(abs(number)))[-count:]
        parts = [force_numeric(df[column]).map(tail) for column in columns]
        return pd.Series(['|'.join(value for value in row if value) for row in zip(*parts)],index=df.index)
    if tool == '文本_计算长度':
        return df[columns[0]].astype(str).str.len()
    if tool == '逻辑_对比两列相同':
        a,b = [df[column].fillna('').astype(str) for column in columns[:2]]
        return pd.Series(np.where(a==b,'是','否'),index=df.index)
    if tool == '统计_组内计数':
        return df.groupby(columns)[columns[0]].transform('count')
    if tool == '统计_分组求和差额':
        debit,credit = parse_cols(param)[:2]
        prepared = df.copy()
        prepared[debit] = force_numeric(prepared[debit])
        prepared[credit] = force_numeric(prepared[credit])
        grouped = prepared.groupby(columns)
        return (grouped[debit].transform('sum')-grouped[credit].transform('sum')).abs()
    if tool == '逻辑_行内容重复':
        return pd.Series(np.where(df.duplicated(subset=columns or None,keep=False),'是','否'),index=df.index)
    raise ValueError(f'Unsupported research feature: {tool}')
