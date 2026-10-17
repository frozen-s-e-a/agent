"""Measured relation-matching normalization rules, without native dependencies."""
import re

def typed_text(value):
    if not isinstance(value,str):raise TypeError('Expected str')
    return value

def email_domain(value):
    text=typed_text(value).strip().lower()
    return text.rsplit('@',1)[1] if '@' in text else ''

def person_key(value):
    return str(value).strip() if value else ''

def address_core(value):
    text=typed_text(value)
    match=re.search(r'([\u4e00-\u9fff]{2,6}(?:路|大道|街|道|巷|弄))(\d+号?)',text)
    if match:return match.group(0)
    match=re.search(r'([\u4e00-\u9fff]{2,8})(\d{1,5}号)',text)
    return match.group(0) if match else ''

def address_road(value):
    text=typed_text(value)
    match=re.search(r'([\u4e00-\u9fff]{2,6}(?:路|大道|街|道|巷|弄)\d+号)',text)
    if match:return match.group(0)
    match=re.search(r'([\u4e00-\u9fff]{2,8}\d{1,5}号)',text)
    return match.group(0) if match else ''

def parse_phones(value):
    return {part.strip() for part in re.split(r'[,，\s;；]+',typed_text(value)) if len(part.strip())>=6}

def parse_ratio(value):
    text=typed_text(value)
    try:return float(text.rstrip('%'))
    except ValueError:return 0.0

REGISTRY={('related_party','_extract_email_domain'):email_domain,('related_party','_person_key'):person_key,
          ('related_party','_extract_address_core'):address_core,('related_party','_extract_address_road'):address_road,
          ('related_party','_parse_phones'):parse_phones,('related_party','_parse_ratio'):parse_ratio}
