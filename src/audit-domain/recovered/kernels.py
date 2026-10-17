"""Business rules reconstructed from original compiled-function observations.

No original executable or extension is imported. Compatibility quirks are
intentional here; changes to those rules require separate business review.
"""
from collections import Counter
import json
import math
import ntpath
import re

def is_missing(value):
    return value is None or isinstance(value, float) and math.isnan(value)

def require_string(value, argument):
    if not isinstance(value, str):
        raise TypeError(f"Argument '{argument}' has incorrect type (expected str, got {type(value).__name__})")

def parse_auxiliary_item(cell_value, kv_sep, item_sep):
    if is_missing(cell_value):
        return {}
    text = str(cell_value).strip()
    if not text:
        return {}
    if item_sep and len(item_sep) == 2:
        start, end = item_sep
        items = re.findall(re.escape(start) + '(.*?)' + re.escape(end), text)
        if not items:
            items = [text]
    elif item_sep:
        items = text.split(item_sep)
    else:
        items = [text]
    result = {}
    for item in items:
        if kv_sep in item:
            key, value = item.split(kv_sep, 1)
            key, value = key.strip(), value.strip()
            if not key:
                continue
            result[key] = result[key] + '; ' + value if key in result else value
    return result

def parse_sheet_keywords(raw_value):
    if is_missing(raw_value):
        return []
    return [part.strip() for part in str(raw_value).replace('，', ',').split(',') if part.strip()]

def filter_sheets_by_keywords(sheet_names, keywords):
    return [name for name in sheet_names if not keywords or any(keyword in name for keyword in keywords)]

def letter_to_number(column_letter):
    number = 0
    for char in column_letter.upper():
        number = number * 26 + ord(char) - ord('A') + 1
    return number

def rename_duplicate_columns(original_cols):
    counts = Counter(original_cols)
    seen = Counter()
    result = []
    for name in original_cols:
        seen[name] += 1
        result.append(f'{name}{seen[name]}' if counts[name] > 1 else name)
    return result

def increment_column(col):
    if col[-1] == 'Z':
        return increment_column(col[:-1]) + 'A' if len(col)>1 else 'AA'
    return col[:-1] + chr(ord(col[-1]) + 1)

def calc_sub_code(code, give_code, step=2, full_length=0, code_delimiter=None):
    length = len(give_code)
    sub_length = length + step + (len(code_delimiter) if code_delimiter and (not full_length or len(code)>full_length) else 0)
    sub_code = code[:sub_length]
    return sub_code.ljust(full_length, '0') if full_length else sub_code

def calc_level(give_code, step=2, init_length=4, code_delimiter=None):
    code = give_code.replace(code_delimiter, '') if code_delimiter else give_code
    return (len(code) - init_length) // step + 1

def calc_sub_name(name, flag, start, level, source_context='上下文未知'):
    if is_missing(name):
        return ''
    text = str(name)
    if not flag:
        return text
    names = text.split(flag)
    return names[min(start+level-1, len(names)-1)]

def find_parent_codes(codes):
    # The original sorts the passed list in place and returns an unordered list.
    codes.sort(key=len)
    return list({code for code in codes if any(other!=code and other.startswith(code) for other in codes)})

def remove_parent_code(df, code_column):
    parents = find_parent_codes(df[code_column].tolist())
    return df[~df[code_column].isin(parents)].copy()

def filter_leaf_accounts(df, code_column):
    df[code_column] = df[code_column].astype(str)
    codes = df[code_column].tolist()
    parents = {code for code in codes if any(other!=code and other.startswith(code) for other in codes)}
    return df[~df[code_column].isin(parents)].copy() if len(df) else df[[]].copy()

def clean_numeric_prefix(parts_list):
    if len(parts_list)>1 and isinstance(parts_list[0], str) and parts_list[0].isdigit():
        return parts_list[1:]
    return parts_list

def safe_float(value):
    if is_missing(value):
        return 0.0
    try:
        return float(str(value).replace(',', ''))
    except (TypeError, ValueError):
        return 0.0

def clean_bank_name(text):
    if not isinstance(text, str):
        return ''
    return re.sub(r'[（(].*?[）)]', '', text).strip()

def normalize_paper_value(value):
    text='' if value is None else re.sub(r'\s+', '', str(value))
    return ''.join(chr(ord(ch)-65248) if 65281<=ord(ch)<=65374 else ch for ch in text).lower()

def parse_match_keys(raw):
    require_string(raw, 'raw')
    return parse_sheet_keywords(raw)

def normalize_company_name(name):
    require_string(name, 'name')
    return re.sub(r'\s+', '', name).replace('（', '(').replace('）', ')')

def clean_toc_line(text):
    return re.sub(r'[.\s·…]*\d+\s*$', '', text).strip()

def get_sort_tuple(key_str):
    match = re.match(r'^(\d+(?:\.\d+)*)', key_str)
    return [int(item) for item in match.group(1).split('.')] if match else [99999]

def extract_company_name(filename):
    return ntpath.splitext(ntpath.basename(filename))[0].split('企业信用报告')[0].strip()

def sanitize_filename(filename):
    return re.sub(r'[\\/:*?"<>|]', '_', str(filename))

def process_jsonp(jsonp_str):
    try:
        text = jsonp_str.strip()
        if '(' in text:
            text = text[text.find('(')+1:-1]
        return json.loads(text)
    except (TypeError, AttributeError, ValueError):
        return None

def parse_range(cell_range):
    text = str(cell_range).upper()
    match = re.fullmatch(r'([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?', text)
    if not match:
        raise ValueError(f"格式错误 '{cell_range}'")
    col1, row1, col2, row2 = match.groups()
    return abs(int(row2 or row1)-int(row1))+1, abs(letter_to_number(col2 or col1)-letter_to_number(col1))+1

def clean_illegal_excel_chars(value):
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', value) if isinstance(value, str) else value

def pvm_decompose(row):
    def safe(key):
        value = row.get(key, 0)
        return 0.0 if is_missing(value) else float(value)
    r1, c1, v1 = [safe('本期'+key) for key in ['营业收入','营业成本','数量']]
    r0, c0, v0 = [safe('上期'+key) for key in ['营业收入','营业成本','数量']]
    if not v1 and not v0:
        return {'price_impact':0,'volume_impact':0,'mix_cost_impact':0,'main_cause':'数据异常-数量为零'}
    p1, p0 = (r1/v1 if v1 else 0), (r0/v0 if v0 else 0)
    unit0 = c0/v0 if v0 else 0
    price = (p1-p0)*v0
    volume = (v1-v0)*(p0-unit0) if v0 else 0
    unit1 = c1/v1 if v1 else 0
    cost = (p1-p0)*(v1-v0) - (unit1-unit0)*v1
    factors = sorted([(abs(price),'售价变动'),(abs(volume),'销量变动'),(abs(cost),'成本变动')],reverse=True)
    main = factors[0][1] if factors[0][0] and (factors[0][0]-factors[1][0])/factors[0][0]>0.2 else '综合变动'
    return {'price_impact':price,'volume_impact':volume,'mix_cost_impact':cost,'main_cause':main}

REGISTRY = {
    ('asist_split','_parse_auxiliary_item'):parse_auxiliary_item,
    ('select_column','_parse_sheet_keywords'):parse_sheet_keywords,
    ('select_column','_filter_sheets_by_keywords'):filter_sheets_by_keywords,
    ('merge_column','_letter_to_number'):letter_to_number,
    ('bankflowmerge','_get_renamed_columns_list'):rename_duplicate_columns,
    ('subject_clean/_core','_get_renamed_columns_list'):rename_duplicate_columns,
    ('bankflowmerge','increment_column'):increment_column,
    ('monthly_analysis/_core','calc_sub_code'):calc_sub_code,
    ('monthly_analysis/_core','calc_level'):calc_level,
    ('monthly_analysis/_core','calc_sub_name'):calc_sub_name,
    ('monthly_analysis/_core','find_parent_codes'):find_parent_codes,
    ('monthly_analysis/_core','remove_parent_code'):remove_parent_code,
    ('subject_clean/_core','_filter_leaf_accounts'):filter_leaf_accounts,
    ('subject_clean/_core','_clean_numeric_prefix'):clean_numeric_prefix,
    ('bank_flow','safe_float'):safe_float,
    ('bank_flow','clean_name'):clean_bank_name,
    ('paper_verify','normalize_value'):normalize_paper_value,
    ('paper_verify','_parse_match_keys'):parse_match_keys,
    ('related_party','normalize_name'):normalize_company_name,
    ('qcc_processor','_clean_toc_line'):clean_toc_line,
    ('qcc_processor','_get_sort_tuple'):get_sort_tuple,
    ('qcc_processor','_extract_company_name'):extract_company_name,
    ('ipo_bj','sanitize_filename'):sanitize_filename,
    ('ipo_sh','sanitize_filename'):sanitize_filename,
    ('ipo_sz','sanitize_filename'):sanitize_filename,
    ('ipo_bj','process_jsonp'):process_jsonp,
    ('ipo_sh','process_jsonp'):process_jsonp,
    ('link_replace_range','parse_range'):parse_range,
    ('gross_margin_analysis','_clean_illegal_chars'):clean_illegal_excel_chars,
    ('gross_margin_analysis','pvm_decompose'):pvm_decompose,
}
