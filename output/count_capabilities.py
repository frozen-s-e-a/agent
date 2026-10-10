import json
from pathlib import Path
builtin=json.loads(Path('src/resources/tools.json').read_text(encoding='utf-8'))
legacy=json.loads(Path('src/resources/legacy-mcp-tools.json').read_text(encoding='utf-8'))
bi={x['id'] for x in builtin}; le={x['name'] for x in legacy}
print('builtin_count',len(builtin))
print('legacy_count',len(legacy))
print('overlap',len(bi & le),sorted(bi & le))
print('unique_tool_ids',len(bi|le))
print('builtin_groups')
from collections import Counter
print(Counter(x.get('group') for x in builtin))
print('skill_dirs')
skills=sorted([p.name for p in Path('src/skills').iterdir() if p.is_dir() and (p/'SKILL.md').exists()])
print(len(skills),skills)
mig=json.loads(Path('src/resources/mcp-migration.json').read_text(encoding='utf-8'))
print('migrated_count',len(mig.get('migrated',[])),mig.get('migrated'))
print('pending_external',len(mig.get('pendingExternal',[])),mig.get('pendingExternal'))
print('pending_algorithms',len(mig.get('pendingAlgorithms',[])),mig.get('pendingAlgorithms'))
