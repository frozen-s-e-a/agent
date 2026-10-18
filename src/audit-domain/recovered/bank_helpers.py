"""Recovered deterministic bank matching helpers, without the original pyd."""
from itertools import combinations
import re
import pandas as pd
from .kernels import clean_bank_name

def subset_sum_lines(candidates,target):
    for size in range(2,len(candidates)+1):
        for group in combinations(candidates,size):
            if abs(sum(row['abs_amt'] for row in group)-target)<0.005:return list(group)
    return None

def similarity(left,right):
    a,b=clean_bank_name(str(left) if left else ''),clean_bank_name(str(right) if right else '')
    if not a or not b:return 0.0
    if a in b or b in a:return 1.0
    a=' '.join(sorted(a.split()))
    b=' '.join(sorted(b.split()))
    previous=[0]*(len(b)+1)
    for char in a:
        row=[0]
        for index,other in enumerate(b):
            row.append(previous[index]+1 if char==other else max(previous[index+1],row[-1]))
        previous=row
    return 2*previous[-1]/(len(a)+len(b))

def format_date(value):
    if value is None:return None
    text=str(value).strip().replace('年','-').replace('月','-').replace('日','')
    # The compact-date path slices digits and deliberately does not validate
    # the calendar: native format_date('20240230') returns '2024-02-30'.
    if re.fullmatch(r'\d{8}',text):return text[:4]+'-'+text[4:6]+'-'+text[6:]
    date=pd.to_datetime(text,errors='coerce')
    return None if pd.isna(date) else date.strftime('%Y-%m-%d')

REGISTRY={('bank_flow','_find_subset_sum_lines'):subset_sum_lines,('bank_flow','compute_similarity'):similarity,
          ('bank_flow','format_date'):format_date}
