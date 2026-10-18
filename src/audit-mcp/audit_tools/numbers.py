"""严格的数值和日期解析（实现设计 6.3）。

能识别千分位、括号负数、全角数字、"-" 占位和空白；认不出的值标为无效，不静默当作 0。
"""
import datetime
import re
from decimal import Decimal, InvalidOperation

FULLWIDTH = str.maketrans('０１２３４５６７８９．，－＋（）　', '0123456789.,-+() ')
DASHES = {'-', '--', '—', '——', '－', '/', '／'}
NUMBER = re.compile(r'^[+-]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$|^[+-]?\.\d+$')
BLANK, INVALID = object(), object()


def parse_decimal(value):
    """→ Decimal、BLANK（空白）或 INVALID。'-' 等占位按 0。"""
    if value is None:
        return BLANK
    if isinstance(value, bool):
        return INVALID
    if isinstance(value, Decimal):
        return value if value.is_finite() else INVALID
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, float):
        if value != value or value in (float('inf'), float('-inf')):
            return INVALID
        # 浮点只来自已经是数字的单元格；按最短表示转换，避免 0.1 变成 0.1000000000000000055…
        return Decimal(repr(value))
    if isinstance(value, (datetime.date, datetime.datetime)):
        return INVALID
    text = str(value).translate(FULLWIDTH).strip().replace(' ', '')
    if not text:
        return BLANK
    if text in DASHES:
        return Decimal(0)
    negative = False
    if text.startswith('(') and text.endswith(')'):
        negative, text = True, text[1:-1]
    text = text.lstrip('¥￥$')
    if text.endswith('%'):
        number = parse_decimal(text[:-1])
        return number / 100 if isinstance(number, Decimal) else INVALID
    if not NUMBER.match(text):
        return INVALID
    try:
        number = Decimal(text.replace(',', ''))
    except InvalidOperation:
        return INVALID
    return -number if negative else number


DATE_TEXT = [
    (re.compile(r'^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$'), (1, 2, 3)),
    (re.compile(r'^(\d{4})(\d{2})(\d{2})$'), (1, 2, 3)),
]


def parse_date(value):
    """→ datetime.date、BLANK 或 INVALID。Excel 序列号只接受数字单元格。"""
    if value is None:
        return BLANK
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        # Excel 1900 日期系统的序列号（读到的是未设日期格式的数字单元格）。
        if 20000 <= value <= 80000:
            return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(value)))
        return INVALID
    text = str(value).translate(FULLWIDTH).strip()
    if not text:
        return BLANK
    text = text.split(' ')[0].split('T')[0]
    for pattern, (y, m, d) in DATE_TEXT:
        match = pattern.match(text)
        if match:
            try:
                return datetime.date(int(match.group(y)), int(match.group(m)), int(match.group(d)))
            except ValueError:
                return INVALID
    return INVALID


def parse_text(value):
    if value is None:
        return BLANK
    if isinstance(value, float) and value == int(value):
        value = int(value)
    if isinstance(value, Decimal):
        value = format(value.normalize(), 'f')
    if isinstance(value, datetime.datetime):
        value = value.date().isoformat() if (value.hour, value.minute, value.second) == (0, 0, 0) else value.isoformat()
    elif isinstance(value, datetime.date):
        value = value.isoformat()
    text = str(value).replace('　', ' ').strip()
    return text if text else BLANK


def parse_integer(value):
    number = parse_decimal(value)
    if number is BLANK or number is INVALID:
        return number
    return int(number) if number == number.to_integral_value() else INVALID


PARSERS = {'decimal': parse_decimal, 'date': parse_date, 'text': parse_text, 'integer': parse_integer}


def kind_of(value):
    """data_inspect 用的值类型：date、decimal、text 或 None（空白）。"""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if isinstance(value, (datetime.date, datetime.datetime)):
        return 'date'
    if isinstance(value, (int, float, Decimal)) and not isinstance(value, bool):
        return 'decimal'
    text = str(value).strip()
    if parse_date(text) not in (BLANK, INVALID) and re.search(r'\d{4}', text):
        return 'date'
    if parse_decimal(text) not in (BLANK, INVALID) and text not in DASHES:
        return 'decimal'
    return 'text'
