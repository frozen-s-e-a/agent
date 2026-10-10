"""Record definitions and literal settings, without executing business entrypoints."""
from pathlib import Path
import inspect
import json
import sys
import types
import contextlib
import io
from research_loader import prepare, load

relative = sys.argv[1]
output = Path(sys.argv[2]).resolve()
record = {'file': relative, 'calledBusinessRun': False, 'networkDisabled': True}
def literal(value, depth=0):
    if depth > 8:
        return {'type': type(value).__name__, 'truncated': True}
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (tuple, list, set)):
        return [literal(item, depth+1) for item in value][:1000]
    if isinstance(value, dict):
        return {str(key):literal(item, depth+1) for key,item in list(value.items())[:1000]}
    return {'type':type(value).__name__}
def function_record(name, value):
    item = {'name': name, 'doc': getattr(value, '__doc__', None)}
    try:
        item['signature'] = str(inspect.signature(value))
    except (TypeError, ValueError):
        item['signature'] = None
    code = getattr(value, '__code__', None)
    if code:
        item['codeMetadata'] = {'file': code.co_filename, 'line': code.co_firstlineno,
                                'varnames': list(code.co_varnames), 'names': list(code.co_names),
                                'constants': literal(code.co_consts), 'bytecodeBytes':len(code.co_code)}
    return item
try:
    prepare()
    module = load(relative)
    record['loaded'] = True
    record['functions'] = []
    record['classes'] = []
    record['literals'] = {}
    for name, value in vars(module).items():
        if name.startswith('__'):
            continue
        if isinstance(value, (types.FunctionType, types.BuiltinFunctionType)) or type(value).__name__ == 'cython_function_or_method':
            record['functions'].append(function_record(name, value))
        elif isinstance(value, type) and getattr(value, '__module__', '') == module.__name__:
            methods = []
            for member, method in vars(value).items():
                if callable(method):
                    methods.append(function_record(member, method))
            record['classes'].append({'name': name, 'doc': value.__doc__, 'methods':methods})
        elif isinstance(value, (str, int, float, bool, list, tuple, dict, set)) or value is None:
            # Skip anything named as a credential even if an import produced it.
            if not any(word in name.lower() for word in ['secret', 'api_key', 'cookie', 'token', 'password']):
                record['literals'][name] = literal(value)
    record['staticMetadata'] = {}
    for name in ['get_category', 'get_description', 'get_input_file_path', 'get_excel_config_schema', 'get_planning_guide']:
        value = getattr(module, name, None)
        if not callable(value):
            continue
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                result = value()
            record['staticMetadata'][name] = literal(result)
        except Exception as error:
            record['staticMetadata'][name] = {'error':f'{type(error).__name__}: {error}'}
except Exception as error:
    record.update({'loaded': False, 'error':f'{type(error).__name__}: {error}'})
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'file':relative, 'loaded':record['loaded'], 'error':record.get('error'),
                  'functions':len(record.get('functions', [])), 'classes':len(record.get('classes', []))}, ensure_ascii=False))
