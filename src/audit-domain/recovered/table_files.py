"""Recovered local XLSX transformations; the caller chooses an explicit path.

File contents are implemented independently with openpyxl and pandas. Source
format and adapter compatibility are recorded in the recovery test manifest.
"""
from pathlib import Path
import re
import pandas as pd
from openpyxl import Workbook, load_workbook
from .kernels import parse_auxiliary_item, letter_to_number, parse_sheet_keywords, filter_sheets_by_keywords

def merge_same_name_columns(path, column_name, delimiter='', max_column_num=1):
    wb=load_workbook(path,keep_vba=Path(path).suffix.lower()=='.xlsm')
    ws=wb.active
    header=[cell.value for cell in ws[1]]
    matches=[index+1 for index,name in enumerate(header) if name==column_name]
    if not matches or len(matches)>int(max_column_num) or '合并_'+column_name in header:
        return False
    shortage=int(max_column_num)-len(matches)
    if shortage:
        position=matches[-1]+1
        ws.insert_cols(position,shortage)
        for index in range(shortage):
            ws.cell(1,position+index,column_name)
    target=ws.max_column+1
    ws.cell(1,target,'合并_'+column_name)
    for row in range(2,ws.max_row+1):
        values=[ws.cell(row,col).value for col in matches]
        ws.cell(row,target,str(delimiter).join(str(value) for value in values if value is not None and value!=''))
    wb.save(path)
    return True

def split_auxiliary_columns(path, col_name, kv_sep=':', item_sep=';'):
    df=pd.read_excel(path)
    if col_name not in df:
        return []
    rows=[parse_auxiliary_item(value,kv_sep,item_sep) for value in df[col_name]]
    names=list(dict.fromkeys(key for row in rows for key in row))
    wb=load_workbook(path,keep_vba=Path(path).suffix.lower()=='.xlsm')
    ws=wb.active
    first=ws.max_column+1
    for offset,name in enumerate(names):
        ws.cell(1,first+offset,name)
        for index,row in enumerate(rows,2):
            ws.cell(index,first+offset,row.get(name,''))
    wb.save(path)
    return names

def fill_down_columns(path, column_names):
    names=parse_sheet_keywords(column_names) if isinstance(column_names,str) else column_names
    sheets=pd.read_excel(path,sheet_name=None)
    with pd.ExcelWriter(path,engine='openpyxl') as writer:
        for name,df in sheets.items():
            for column in names:
                if column in df:
                    df[column]=df[column].ffill()
            df.to_excel(writer,sheet_name=name,index=False)

def flatten_headers(path, header_rows):
    headers=[int(value.strip())-1 for value in str(header_rows).split(',')]
    df=pd.read_excel(path,header=headers if len(headers)>1 else headers[0])
    if isinstance(df.columns,pd.MultiIndex):
        df.columns=[''.join(dict.fromkeys(str(value) for value in column if not str(value).startswith('Unnamed'))) for column in df.columns]
    df.to_excel(path,index=False)

def merge_named_columns(path, column_names, delimiter, insert_index, insert_name='合并列'):
    columns=[value.strip() for value in column_names.split(',')] if isinstance(column_names,str) else column_names
    fixed={value:value[1:-1] for value in columns if len(value)>=2 and value[0]==value[-1] and value[0] in '\"\''}
    sources=[value for value in columns if value not in fixed]
    df=pd.read_excel(path,dtype={name:str for name in sources})
    if any(name not in df for name in sources):
        return False
    def merge(row):
        parts=[]
        for column in columns:
            value=fixed[column] if column in fixed else str(row[column])
            if value!='':
                parts.append(value)
        return str(delimiter).join(parts)
    position=int(insert_index) if str(insert_index).isdigit() else letter_to_number(str(insert_index))
    df.insert(position-1,insert_name or '合并列',df.apply(merge,axis=1))
    df.to_excel(path,index=False)
    return True

def remove_summary_rows(path, keywords, column_name):
    df=pd.read_excel(path)
    if column_name not in df:
        return 0
    count=len(df)
    mask=df[column_name].astype(str).str.contains(keywords,na=False,regex=True)
    # Equal values across columns are summary/empty rows; repeated transactions
    # across different rows are retained by the original implementation.
    same=df.apply(lambda row:len(set(row.dropna().tolist()))==1,axis=1)
    df=df[~mask & ~same]
    df.to_excel(path,index=False)
    return count-len(df)

def select_columns(path, columns_to_keep, sheet_keywords=None):
    sheets=pd.read_excel(path,sheet_name=None)
    names=filter_sheets_by_keywords(list(sheets),parse_sheet_keywords(sheet_keywords))
    results=[]
    for name in names:
        df=sheets[name]
        selected=pd.DataFrame()
        if not columns_to_keep:
            selected=df.copy()
        else:
            for column in columns_to_keep:
                selected[column]=df[column] if column in df else None
        results.append(selected)
    return pd.concat(results,ignore_index=True) if results else pd.DataFrame()

def collect_values(paths, field_mappings):
    result=[]
    for path in paths:
        wb=load_workbook(path,data_only=True)
        row={'文件路径':str(Path(path).resolve()),'文件名':Path(path).name}
        for name,position in field_mappings.items():
            try:
                row[name]=wb.active[position].value
            except (TypeError,ValueError,IndexError,KeyError):
                row[name]='提取错误'
        result.append(row)
    return pd.DataFrame(result,columns=['文件路径','文件名',*field_mappings])
