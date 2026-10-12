"""Copy installed, licensed third-party distributions into the app runtime."""
from pathlib import Path
import importlib.metadata as metadata
import json
import shutil

root = Path(__file__).resolve().parents[1]
destination = root / 'build/python-packages'
destination.mkdir(parents=True, exist_ok=True)
records = []
for name in ['pandas', 'numpy', 'python-dateutil', 'tzdata', 'six', 'pillow']:
    dist = metadata.distribution(name)
    count = 0
    for relative in dist.files:
        if '..' in relative.parts or '__pycache__' in relative.parts or relative.suffix == '.pyc':
            continue
        source = dist.locate_file(relative)
        target = destination / relative
        if not source.is_file():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        count += 1
    records.append({'name': name, 'version': dist.version, 'files': count})
(destination / 'independent-dependencies.json').write_text(json.dumps(records, indent=2), encoding='utf-8')
print(json.dumps(records))
