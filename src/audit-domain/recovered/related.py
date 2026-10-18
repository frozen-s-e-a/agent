"""Recovered relation detection core for an explicit, indexed company dataset.

The caller supplies the company_* mappings. Loading the original 53 workbook
types, live CICPA penetration and formatted workbook export are separate
adapters. This module neither imports native code nor reads user settings.
"""
from difflib import SequenceMatcher
from itertools import combinations
import json
import re
from .kernels import normalize_company_name
from .relation_helpers import person_key,email_domain,parse_phones,parse_ratio,address_core,address_road

DIMENSIONS={1:'股权穿透',2:'共同股东',3:'实际控制人与受益人穿透',4:'关键管理人员重叠',
            5:'法定代表人交叉',6:'法定代表人变更轨迹',7:'同址经营',8:'联系方式共用',
            9:'变更时间窗口',10:'企业名称相似度',11:'参保人数异常',12:'交易对手状态异常','E01':'补充人员关联'}
PUBLIC_DOMAINS={'qq.com','163.com','126.com','139.com','189.cn','foxmail.com','gmail.com',
                'hotmail.com','outlook.com','sina.com','sohu.com','yahoo.com'}
VIRTUAL_WORDS=['产业园','孵化器','集中办公','商务秘书','集群注册','众创空间','创业园']

class RelatedPartyScanner:
    def __init__(self,index,audit_target,customers,suppliers,subsidiaries=None,former_execs=None,
                 auto_subsidiary_threshold=50.0,equity_data=None):
        self.index=index
        self.audit_target=audit_target
        self.audit_entities={normalize_company_name(name) for name in [audit_target]+(subsidiaries or [])}
        self.audit_group=set(self.audit_entities)
        self.auto_subsidiaries={}
        if auto_subsidiary_threshold>0:
            for entity in self.audit_entities:
                for record in self.rows('company_subsidiaries',entity):
                    name=normalize_company_name(record.get('subsidiary',''))
                    ratio=parse_ratio(str(record.get('ratio','')))
                    if name and ratio>=auto_subsidiary_threshold:
                        self.auto_subsidiaries[name]={'ratio':ratio,'source':'参控股企业'}
                        self.audit_group.add(name)
        self.customers=[normalize_company_name(name) for name in customers]
        self.suppliers=[normalize_company_name(name) for name in suppliers]
        self.check_targets=list(set(self.customers+self.suppliers))
        self.former_execs={person_key(name) for name in former_execs or []}
        self.equity_data=equity_data or {}
        self.registration_statuses=index.get('company_registration_status',{}).copy()
        self.findings=[]

    def rows(self,category,company):return self.index.get(category,{}).get(company,[])
    def basic(self,company):return self.index.get('company_basic',{}).get(company,{})
    def values(self,category,company,key):return {record.get(key,'') for record in self.rows(category,company) if record.get(key,'')}
    def executives(self,company):return self.values('company_executives',company,'person')
    def legal_persons(self,company):
        result={person_key(self.basic(company).get('法定代表人',''))}
        for row in self.rows('company_legal_changes',company):result.update([person_key(row.get('before','')),person_key(row.get('after',''))])
        return result-{''}
    def audit_persons(self):return set().union(*(self.executives(company)|self.legal_persons(company) for company in self.audit_group))
    def shareholders(self,company):
        if self.equity_data:
            return set(self.equity_data.get(company,{}).get('holders',{}))
        return self.values('company_shareholders',company,'shareholder')
    def _add(self,number,target,confidence,evidence,detail=None):
        role='客户' if target in self.customers else '供应商' if target in self.suppliers else '其他'
        if target in self.auto_subsidiaries:
            role='分子公司('+role+')' if role!='其他' else '分子公司'
        code=number if isinstance(number,str) else 'D'+str(number).zfill(2)
        self.findings.append({'维度':code+'-'+DIMENSIONS[number],'置信度':confidence,'被审计单位':self.audit_target,
                              '疑似关联方':target,'角色':role,'关联证据':evidence,'详情':json.dumps(detail or {},ensure_ascii=False)})

    def check_dimension_01(self):
        related=set()
        for company in self.audit_group:
            related|=self.values('company_subsidiaries',company,'subsidiary')
            related|=self.values('company_investments',company,'investee')
        for target in self.check_targets:
            if target in related:self._add(1,target,'高','审计方实体组直接投资 '+target)

    def check_dimension_02(self):
        audited=set().union(*(self.shareholders(company) for company in self.audit_group))
        for target in self.check_targets:
            common=audited&self.shareholders(target)
            if common:self._add(2,target,'中',('穿透后' if self.equity_data else '直接')+'共同股东: '+', '.join(sorted(common)),
                                {'common_shareholders':sorted(common),'penetrated':bool(self.equity_data)})
        for left,right in combinations(self.check_targets,2):
            common=self.shareholders(left)&self.shareholders(right)
            if common:self._add(2,left+' & '+right,'中','共同股东: '+', '.join(sorted(common)),{'common_shareholders':sorted(common)})

    def check_dimension_03(self):
        for category,key,label in [('company_controllers','controller','共同实际控制人: '),('company_beneficiaries','beneficiary','共同最终受益人: ')]:
            audited=set().union(*(self.values(category,company,key) for company in self.audit_group))
            for target in self.check_targets:
                common=audited&self.values(category,target,key)
                if common:self._add(3,target,'高',label+', '.join(sorted(common)))

    def check_dimension_04(self):
        audited=set().union(*(self.executives(company) for company in self.audit_group))
        for target in self.check_targets:
            common=audited&self.executives(target)
            if common:self._add(4,target,'高','共同高管: '+', '.join(sorted(common)),{'common_persons':sorted(common)})

    def check_dimension_05(self):
        audited=set().union(*(self.legal_persons(company) for company in self.audit_group))
        for target in self.check_targets:
            common=audited&self.legal_persons(target)
            if common:self._add(5,target,'高','共同法定代表人: '+', '.join(sorted(common)),{'common_persons':sorted(common)})

    def check_dimension_06(self):
        audited=self.audit_persons()
        for target in self.check_targets:
            for row in self.rows('company_legal_changes',target):
                before,after,date=row.get('before',''),row.get('after',''),row.get('date','')
                if before and before!=after and before in audited:
                    self._add(6,target,'中',f"{target} 前法定代表人 '{before}' 是审计方实体组关联人员（变更日期: {date}）",
                              {'former_legal':before,'current_legal':after,'change_date':date})
                if after and before!=after and after in audited:
                    self._add(6,target,'中',f"{target} 现法定代表人 '{after}' 是审计方实体组关联人员（变更日期: {date}）",
                              {'former_legal':before,'current_legal':after,'change_date':date})

    def check_dimension_07(self):
        addresses={self.basic(company).get('企业地址','') for company in self.audit_group}-{''}
        for target in self.check_targets:
            target_address=self.basic(target).get('企业地址','')
            if not target_address:continue
            for audited in addresses:
                evidence=''
                if audited==target_address:evidence='注册地址相同: '+target_address
                elif address_core(audited) and address_core(audited)==address_core(target_address):
                    evidence=f"注册地址同门牌号({address_core(audited)}): 审计方='{audited}', 目标='{target_address}'"
                if not evidence:continue
                virtual=any(word in audited or word in target_address for word in VIRTUAL_WORDS)
                if virtual:evidence+='（虚拟地址，可能误报）'
                self._add(7,target,'低' if virtual else '中',evidence,
                          {'address_audit':audited,'address_target':target_address,'virtual':virtual})
                break

    def check_dimension_08(self):
        phones=set().union(*(parse_phones(str(self.basic(company).get('电话',''))) for company in self.audit_group))
        domains={email_domain(str(self.basic(company).get('邮箱',''))) for company in self.audit_group}-{''}-PUBLIC_DOMAINS
        target_phones={target:parse_phones(str(self.basic(target).get('电话',''))) for target in self.check_targets}
        target_domains={}
        target_emails={}
        for target in self.check_targets:
            for phone in sorted(phones&target_phones[target]):self._add(8,target,'中','与审计方共用电话: '+phone,{'phone':phone})
            domain=email_domain(str(self.basic(target).get('邮箱','')))
            if domain in domains:self._add(8,target,'中','与审计方共用邮箱域名: @'+domain,{'email_domain':domain})
            emails={email.strip().lower() for email in re.split(r'[,，\s;；]+',str(self.basic(target).get('邮箱',''))) if '@' in email}
            target_emails[target]=emails
            target_domains[target]={email_domain(email) for email in emails}-PUBLIC_DOMAINS-{''}
        for left,right in combinations(self.check_targets,2):
            name=left+' & '+right
            for phone in sorted(target_phones[left]&target_phones[right]):self._add(8,name,'中','两者共用电话: '+phone,{'phone':phone})
            for domain in sorted(target_domains[left]&target_domains[right]):self._add(8,name,'中','两者共用邮箱域名: @'+domain,{'email_domain':domain})
            for email in sorted(target_emails[left]&target_emails[right]):self._add(8,name,'高','两者使用相同邮箱: '+email,{'email':email})

    def check_dimension_09(self):
        audited=self.audit_persons()
        for target in self.check_targets:
            for row in self.rows('company_changes',target):
                item,before,after,date=row.get('item',''),row.get('before',''),row.get('after',''),row.get('date','')
                if '法定代表人' not in item and '股东' not in item:continue
                for person in audited:
                    if person and (person in before or person in after):
                        self._add(9,target,'中',f"{target} 于 {date} 发生{item}: '{before}' → '{after}'，涉及审计方人员 '{person}'",
                                  {'change_date':date,'change_item':item,'before':before,'after':after,'related_person':person})

    def check_dimension_10(self):
        def strip(name):return re.sub(r'(股份有限公司|有限责任公司|有限公司|股份公司|公司)$','',name)
        for target in self.check_targets:
            for audited in self.audit_group:
                ratio=SequenceMatcher(None,strip(target),strip(audited)).ratio()
                if .8<ratio<1:
                    formatted=f'{ratio:.0%}'
                    self._add(10,target,'低',f"与审计方名称相似度 {formatted}: '{target}' vs 审计方实体",{'similarity':formatted})
                    break

    def check_dimension_11(self):
        for target in self.check_targets:
            value=self.basic(target).get('参保人数','')
            try:insured=int(str(value).strip())
            except (TypeError,ValueError):continue
            if insured<=1:
                role='客户' if target in self.customers else '供应商' if target in self.suppliers else ''
                self._add(11,target,'低',f'参保人数仅 {insured} 人，作为{role}需关注交易真实性',{'insured_count':insured})

    def check_registration_status(self):
        for target in self.check_targets:
            status=self.registration_statuses.get(target,'')
            if status in ['注销','吊销']:
                role='客户' if target in self.customers else '供应商' if target in self.suppliers else ''
                self._add(12,target,'中',f'该{role}登记状态为「{status}」，与已{status}企业发生交易需关注交易真实性',{'registration_status':status})

    def check_dimension_e01(self):
        for target in self.check_targets:
            for persons,label in [(self.executives(target),'补充人员在目标企业任职: '),(self.legal_persons(target),'补充人员担任法定代表人: ')]:
                common=self.former_execs&persons
                if common:self._add('E01',target,'中',label+', '.join(sorted(common)),{'supplemental_persons':sorted(common)})

    def run_all(self):
        for number in range(1,12):getattr(self,'check_dimension_'+str(number).zfill(2))()
        self.check_registration_status()
        self.check_dimension_e01()
        return self.findings
