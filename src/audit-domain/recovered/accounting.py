"""Recovered ledger checks and two-period gross-margin arithmetic."""
import numpy as np
import pandas as pd

def judge_balance(df):
    return abs(df['借方金额'].sum()-df['贷方金额'].sum())<0.01

def sum_amounts_by_code(df,code):
    selected=df[df['科目代码'].str.startswith(code)]
    return selected['借方金额'].sum(),selected['贷方金额'].sum()

def filter_and_sum(df,code):
    selected=df[df['科目代码'].str.startswith(code) & (df['科目代码'].str.len()==len(code)+2)]
    return bool(len(selected)),*[selected[name].sum() for name in ['期初余额','借方金额','贷方金额','期末余额']]

def judge_father_equal_children(df,code):
    found,begin,debit,credit,end=filter_and_sum(df,code)
    if not found:
        return True
    row=df[df['科目代码']==code].iloc[0]
    children=df[df['科目代码'].str.startswith(code) & (df['科目代码'].str.len()==len(code)+2)]
    begin=(children['期初余额']*np.where(children['方\n向']=='贷',-1,1)).sum()
    end=(children['期末余额']*np.where(children['方\n向.1']=='贷',-1,1)).sum()
    expected_begin=row['期初余额']*(-1 if row['方\n向']=='贷' else 1)
    expected_end=row['期末余额']*(-1 if row['方\n向.1']=='贷' else 1)
    return all(abs(actual-expected)<0.01 for actual,expected in zip(
        [begin,debit,credit,end],[expected_begin,row['借方金额'],row['贷方金额'],expected_end]))

def judge_calc(df):
    for _,row in df.iterrows():
        begin=row['期初余额']*(-1 if row['方\n向']=='贷' else 1)
        end=row['期末余额']*(-1 if row['方\n向.1']=='贷' else 1)
        if abs(begin+row['借方金额']-row['贷方金额']-end)>=0.01:
            return False,row['科目名称']
    return True,''

def create_age_dict(num):
    return {index:0 for index in range(1,num+2)}

def reset_age_dict(age_dict):
    return {key:0 for key in age_dict}

def reverse_age_dict(age_dict):
    for key in age_dict:
        age_dict[key]=-age_dict[key]
    return age_dict

def age_dict_compute(age_dict,amount,num):
    if amount>=0:
        age_dict[num]+=amount
    else:
        remainder=-amount
        # Period 1 is the newest. Settlements consume the oldest balance first.
        for key in range(len(age_dict),0,-1):
            available=age_dict[key]
            if available>=remainder:
                age_dict[key]-=remainder
                break
            age_dict[key]=0
            remainder-=available
    return age_dict

def age_count_single(age_info,amount,num):
    if amount==0:
        return age_info
    total=age_info['total']
    current=total+amount
    side='front' if current>=0 else 'back'
    if side==age_info['direction']:
        age_dict_compute(age_info[side],amount if side=='front' else -amount,num)
    else:
        age_info['front']=reset_age_dict(age_info['front'])
        age_info['back']=reset_age_dict(age_info['back'])
        age_dict_compute(age_info[side],abs(current),num)
    age_info['total']=current
    age_info['direction']=side
    return age_info

def age_count(init,period_amount_debit,period_amount_credit,symbol):
    periods=len(period_amount_debit)
    front,back=create_age_dict(periods),create_age_dict(periods)
    side='front' if init>=0 else 'back'
    (front if side=='front' else back)[periods+1]=abs(init)
    info={'total':init,'direction':side,'front':front,'back':back}
    for index in range(periods-1,-1,-1):
        debit,credit=period_amount_debit[index],period_amount_credit[index]
        positive,negative=(debit,credit) if symbol=='借' else (credit,debit)
        age_count_single(info,positive,index+1)
        age_count_single(info,-negative,index+1)
    if info['direction']=='back':
        if symbol=='借':
            info['back']=reverse_age_dict(info['back'])
        elif symbol=='贷':
            # Original output aliases these dictionaries in the credit case.
            info['front']=reverse_age_dict(info['back'])
    return info

def mark_threshold(result_df,threshold,revenue_threshold=0):
    income=result_df[['本期营业收入','上期营业收入']].abs().max(axis=1)
    material=(result_df['毛利率变动'].abs()>threshold) | ((result_df['本期营业收入']==0) & (result_df['上期营业收入']!=0))
    result_df['超阈值标记']=np.where(material & (income>=revenue_threshold),'超阈值','')
    return result_df

def pivot_by_dimension(df_this,df_last,dim_column,field_mapping,entity_column=None):
    keys=[dim_column]+([entity_column] if entity_column else [])
    metrics=['营业收入','营业成本','数量']
    def aggregate(df,period):
        result=df.groupby(keys)[metrics].sum().reset_index()
        result=result.rename(columns={name:period+name for name in metrics})
        result[period+'毛利额']=result[period+'营业收入']-result[period+'营业成本']
        result[period+'毛利率']=np.where(result[period+'营业收入']!=0,result[period+'毛利额']/result[period+'营业收入'],0)
        return result
    result=aggregate(df_this,'本期')
    previous_metrics=['上期'+name for name in [*metrics,'毛利额','毛利率']]
    if df_last is not None and not df_last.empty:
        result=result.merge(aggregate(df_last,'上期'),on=keys,how='outer').fillna(0)
    else:
        for name in previous_metrics:
            result[name]=0
    for label,metric in [('单价','营业收入'),('单位成本','营业成本')]:
        for period in ['本期','上期']:
            result[period+label]=np.where(result[period+'数量']!=0,result[period+metric]/result[period+'数量'],0)
    result['毛利率变动']=result['本期毛利率']-result['上期毛利率']
    return result.sort_values(keys).reset_index(drop=True)

REGISTRY={
 ('ledger_check','judge_balance'):judge_balance,
 ('ledger_check','sum_amounts_by_code'):sum_amounts_by_code,
 ('ledger_check','filter_and_sum'):filter_and_sum,
 ('ledger_check','judge_father_equal_children'):judge_father_equal_children,
 ('ledger_check','judge_calc'):judge_calc,
 ('detailed_table/_core','_create_age_dict'):create_age_dict,
 ('detailed_table/_core','_age_dict_reset'):reset_age_dict,
 ('detailed_table/_core','_reverse_age_dict'):reverse_age_dict,
 ('detailed_table/_core','_age_dict_compute'):age_dict_compute,
 ('detailed_table/_core','_age_count_single'):age_count_single,
 ('detailed_table/_core','age_count'):age_count,
 ('gross_margin_analysis','mark_threshold'):mark_threshold,
 ('gross_margin_analysis','pivot_by_dimension'):pivot_by_dimension,
}
