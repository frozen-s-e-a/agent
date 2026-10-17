"""信封、错误和数值格式（《接口约定》2.2、2.4）。"""
import json
from decimal import Decimal, ROUND_HALF_UP


class ToolError(Exception):
    """按 2.4 的错误分类返回给调用方。code 前缀决定由谁处理。"""

    def __init__(self, code, message, where=None, hint=None, detail=None):
        super().__init__(message)
        self.code, self.message, self.where, self.hint, self.detail = code, message, where, hint, detail

    def envelope(self):
        error = {'code': self.code, 'message': self.message, 'retryable': self.code.startswith(('ARG_', 'REF_', 'HEADER_'))}
        if self.where:
            error['where'] = self.where
        if self.hint:
            error['hint'] = self.hint
        if self.detail is not None:
            error['detail'] = self.detail
        return {'ok': False, 'error': error}


class Result:
    """工具的成功结果：data 之外可带 refs 和 warnings。"""

    def __init__(self, data, refs=None, warnings=None, truncated=False, next=None):
        self.data, self.refs, self.warnings, self.truncated, self.next = data, refs or [], warnings or [], truncated, next

    def envelope(self):
        return {'ok': True, 'data': self.data, 'warnings': self.warnings, 'refs': self.refs, 'truncated': self.truncated, 'next': self.next}


def require(args, key, kind=None):
    if key not in args or args[key] is None:
        raise ToolError('ARG_MISSING', '缺少参数 %s' % key)
    value = args[key]
    if kind is not None and not isinstance(value, kind):
        raise ToolError('ARG_INVALID', '参数 %s 的类型不对' % key)
    return value


def money(value):
    """十进制字符串：整分的保留两位，更细的去掉末尾的零。"""
    if value is None:
        return None
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    cents = value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if cents == value:
        return format(cents, 'f')
    return format(value.normalize(), 'f')


def plain(value):
    """结果表里的值 → 约定的 JSON 形式：金额、数量为十进制字符串，日期为 YYYY-MM-DD。"""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, Decimal):
        return money(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return money(Decimal(repr(value)))
    if hasattr(value, 'isoformat'):
        return value.isoformat()[:10] if not hasattr(value, 'hour') or (value.hour, value.minute, value.second) == (0, 0, 0) else value.isoformat()
    return str(value)


def dumps(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':'), default=str)
