"""Recovered deterministic paper matching and AI-output parsing kernels."""
import json
import os
import re
from .kernels import normalize_paper_value

def comparison_value(value):
    text=normalize_paper_value(value)
    text=''.join(chr(ord(ch)-65248) if 65281<=ord(ch)<=65374 else ch for ch in text)
    return text.lower()

def match_and_compare(book_records,extracted_records,match_keys,field_names):
    matched=[]
    used=set()
    unmatched=[]
    for book in book_records:
        found=None
        for normalized in [False,True]:
            for index,record in enumerate(extracted_records):
                if index in used:
                    continue
                same=all((comparison_value(book.get(key))==comparison_value(record.get(key)) if normalized
                          else book.get(key)==record.get(key)) for key in match_keys)
                if same:
                    found=index
                    break
            if found is not None:
                break
        if found is None:
            unmatched.append(book)
            continue
        used.add(found)
        record=extracted_records[found]
        results={field:'一致' if comparison_value(book.get(field))==comparison_value(record.get(field)) else '不一致' for field in field_names}
        matched.append({'book':book,'extracted':record,'file_path':record.get('_source_file',''),'field_results':results})
    return {'matched':matched,'unmatched_book':unmatched,'unmatched_extracted':[record for i,record in enumerate(extracted_records) if i not in used]}

def process_extract_result(data,file_path):
    absolute=os.path.abspath(file_path)
    if isinstance(data,list):
        rows=data
    elif isinstance(data,dict):
        arrays=[value for value in data.values() if isinstance(value,list)]
        rows=max(arrays,key=len) if arrays else [data]
    else:
        return []
    records=[]
    for value in rows:
        record=value if isinstance(value,dict) else {'_value':value}
        record['_source_file']=absolute
        records.append(record)
    return records

def extract_json_from_text(text):
    cleaned=re.sub(r'^```(?:json)?\s*|\s*```$','',text.strip()).strip()
    match=re.search(r'\{.*\}',cleaned,re.S)
    if match:
        try:
            return json.loads(match.group(0))
        except (TypeError,ValueError):
            pass
    return {'提取结果':cleaned}

REGISTRY={
 ('paper_verify','match_and_compare'):match_and_compare,
 ('paper_verify','_process_extract_result'):process_extract_result,
 ('text_match','extract_json_from_text'):extract_json_from_text,
}
