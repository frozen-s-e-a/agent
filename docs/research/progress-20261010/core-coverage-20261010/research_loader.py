"""Load compiled business modules in a restricted research process, never the UI.

Network is disabled. User config, databases and project documents are blocked.
The frozen library is used only as an import fallback for packaged dependencies.
"""
from pathlib import Path
import builtins
import importlib.abc
import importlib.util
import io
import os
import socket
import sys
import types

ROOT = Path(__file__).resolve().parent
LEGACY = Path(r'C:\Users\Install\Desktop\SW审计工具箱')

def prepare():
    import pandas  # Prefer the independent runtime's supported numerical stack.
    import openpyxl
    workspace = ROOT / 'sandbox'
    workspace.mkdir(exist_ok=True)
    os.chdir(workspace)
    os.environ['USERPROFILE'] = str(workspace)
    os.environ['APPDATA'] = str(workspace / 'appdata')
    os.environ['LOCALAPPDATA'] = str(workspace / 'localappdata')
    os.environ['QT_QPA_PLATFORM'] = 'offscreen'
    original_open = builtins.open
    def guarded_open(file, *args, **kwargs):
        if isinstance(file, (str, bytes, os.PathLike)):
            path = Path(os.fsdecode(file)).resolve()
            if path.is_relative_to(LEGACY):
                mode = args[0] if args else kwargs.get('mode', 'r')
                if any(flag in mode for flag in 'wax+'):
                    raise PermissionError('Research probe cannot write to the original installation')
                if path.suffix.lower() not in {'.pyd', '.dll', '.py', '.pyc', '.pem'}:
                    raise PermissionError('Research probe blocks original user files: ' + path.name)
        return original_open(file, *args, **kwargs)
    builtins.open = guarded_open
    io.open = guarded_open
    def blocked_network(*args, **kwargs):
        raise RuntimeError('Network is disabled for core-logic research')
    socket.create_connection = blocked_network
    socket.socket.connect = blocked_network
    socket.socket.connect_ex = blocked_network
    sys.path.append(str(ROOT / 'frozen'))
    sys.path.append(str(LEGACY / 'modules'))
    sys.path.append(str(LEGACY / '_internal'))
    if hasattr(os, 'add_dll_directory'):
        for folder in [LEGACY / '_internal', LEGACY / '_internal/PySide6', LEGACY / '_internal/shiboken6']:
            if folder.exists():
                os.add_dll_directory(str(folder))
    class NativeFallback(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path=None, target=None):
            relative = Path(*fullname.split('.'))
            for base in [LEGACY / '_internal', LEGACY, LEGACY / 'modules']:
                candidate = (base / relative).with_suffix('.pyd')
                if candidate.exists():
                    return importlib.util.spec_from_file_location(fullname, candidate)
            return None
    sys.meta_path.append(NativeFallback())
    # Inert namespace packages prevent launching the original application.
    package = types.ModuleType('modules')
    package.__path__ = [str(LEGACY / 'modules')]
    sys.modules['modules'] = package

def load(relative):
    path = LEGACY / relative
    parts = Path(relative).with_suffix('').parts
    fullname = '.'.join(parts)
    for count in range(2, len(parts)):
        name = '.'.join(parts[:count])
        if name not in sys.modules:
            package = types.ModuleType(name)
            package.__path__ = [str(LEGACY.joinpath(*parts[:count]))]
            sys.modules[name] = package
    spec = importlib.util.spec_from_file_location(fullname, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[fullname] = module
    spec.loader.exec_module(module)
    return module
