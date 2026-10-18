"""Recovered date cleaning and voucher de-duplication used by cutoff sampling."""
import re
import pandas as pd

def determine_cutoff_date(start_date,end_date):
    candidate=pd.Timestamp(year=start_date.year,month=12,day=31)
    return candidate if start_date<=candidate<=end_date else None

def clean_and_parse_dates(series):
    text=series.astype(str).str.strip().str.replace(r'\.0$','',regex=True)
    text=text.str.replace('年','-',regex=False).str.replace('月','-',regex=False).str.replace('日','',regex=False).str.replace('/','-',regex=False)
    dashed=pd.to_datetime(text,format='%Y-%m-%d',errors='coerce')
    compact=pd.to_datetime(text,format='%Y%m%d',errors='coerce')
    return dashed.fillna(compact)

def deduplicate_and_merge_subjects(df,company_col,date_col,voucher_col,subject_col):
    keys=[company_col,date_col,voucher_col]
    subjects=df.groupby(keys,sort=False)[subject_col].agg(lambda values:'|'.join(dict.fromkeys(str(value) for value in values if pd.notna(value)))).reset_index()
    first=df.drop_duplicates(keys,keep='first').drop(columns=[subject_col]).merge(subjects,on=keys,how='left')
    return first.reindex(columns=df.columns).reset_index(drop=True)

REGISTRY={
 ('cutoff_sampling','_determine_cutoff_date'):determine_cutoff_date,
 ('cutoff_sampling','_clean_and_parse_dates'):clean_and_parse_dates,
 ('cutoff_sampling','_deduplicate_and_merge_subjects'):deduplicate_and_merge_subjects,
}
