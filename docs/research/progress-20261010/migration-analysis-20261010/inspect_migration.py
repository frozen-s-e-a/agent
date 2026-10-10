"""Static migration evidence. Never import or execute legacy business modules."""
from pathlib import Path
from collections import Counter
import ast
import hashlib
import json
import marshal
import re
import struct
import sys
import types
import zipfile
import xml.etree.ElementTree as ET

PROJECT = Path(__file__).resolve().parents[2]
LEGACY = Path(r"C:\Users\Install\Desktop\SW审计工具箱")
OUT = Path(__file__).resolve().parent

PACKAGES = {
    "P01_table": "add_column asist_split dropsummary fill_column headers_process insert_column merge_column pickup_value select_column multi_collect_file multi_collect_folder data_field_check text_match auxiliary_selection".split(),
    "P02_subject": "tool_preview tool_execute subject_clean_after subject_allocation".split(),
    "P03_checks_sampling": "jet_test_inspect jet_test_execute voucher_check ledger_check cutoff_sampling".split(),
    "P04_bank": "bank_digit2 bank_paper1 bank_paper2 bank_flow bankflowmerge".split(),
    "P05_analysis": "monthly_preview monthly_detect_structure monthly_execute monthly_ai_analysis gross_margin_analysis".split(),
    "P06_workpapers": "detailed_table_inspect detailed_table_inspect_template detailed_table_save_config detailed_table_validate detailed_table_generate xlsx_writer".split(),
    "P07_workbook_structure": "link_extractor link_ref_replace link_replace_range link_replace_text link_replace_workbook extract_disclosure_scope extract_disclosure_tables insert_footnote_comments".split(),
    "P08_remote": "ipo_bj ipo_sh ipo_sz announcement cicpa_query currency".split(),
    "P09_relationships": "qcc_processor related_party".split(),
    "P10_documents_ai": "address_split id_card ai_formula_filler file_classification info_extract info_extract_multi paper_verify photo_rename".split(),
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def pe_machine(data):
    if data[:2] != b"MZ":
        return None
    offset = struct.unpack_from("<I", data, 0x3C)[0]
    return hex(struct.unpack_from("<H", data, offset + 4)[0])

DEPENDENCIES = "PySide6 pandas numpy openpyxl xlwings win32com pythoncom requests httpx aiohttp playwright selenium jionlp docx pypdf pdfplumber fitz duckdb sqlalchemy bs4 lxml PIL rapidfuzz".split()

binary_evidence = []
for f in sorted((LEGACY / "modules").rglob("*.pyd")):
    raw = f.read_bytes()
    tokens = set(x.decode("ascii") for x in re.findall(rb"[\x20-\x7e]{4,}", raw))
    combined = "\n".join(tokens)
    binary_evidence.append({
        "file": f.relative_to(LEGACY).as_posix(),
        "size": len(raw), "sha256": sha(raw), "machine": pe_machine(raw),
        "cythonMarker": b"__pyx_" in raw,
        "dependencyStringHints": [x for x in DEPENDENCIES if re.search(r"(?<!\w)" + re.escape(x) + r"(?:\.|\b)", combined)],
        "domainStringHints": sorted(set(x.decode("ascii").lower() for x in re.findall(rb"https?://([a-zA-Z0-9.-]+)", raw))),
    })

templates = []
ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
for f in sorted((LEGACY / "_template").rglob("*")):
    if not f.is_file():
        continue
    item = {"file": f.relative_to(LEGACY).as_posix(), "size": f.stat().st_size, "sha256": sha(f.read_bytes())}
    if f.suffix.lower() in {".xlsx", ".xlsm"}:
        with zipfile.ZipFile(f) as z:
            names = z.namelist()
            wb = ET.fromstring(z.read("xl/workbook.xml"))
            item.update({
                "sheets": [x.attrib["name"] for x in wb.findall("s:sheets/s:sheet", ns)],
                "vbaProject": "xl/vbaProject.bin" in names,
                "externalLinkParts": sum(bool(re.match(r"xl/externalLinks/externalLink\d+\.xml$", x)) for x in names),
                "drawingParts": sum(bool(re.match(r"xl/drawings/[^/]+\.xml$", x)) for x in names),
                "commentParts": sum(bool(re.search(r"(?:^|/)comments\d*\.xml$|^xl/comments/comment\d+\.xml$", x)) for x in names),
                "formulaCells": sum(len(ET.fromstring(z.read(x)).findall(".//s:f", ns)) for x in names if re.match(r"xl/worksheets/sheet\d+\.xml$", x)),
            })
    templates.append(item)

catalog = json.loads((PROJECT / "src/resources/legacy-mcp-tools.json").read_text(encoding="utf-8"))
builtin = json.loads((PROJECT / "src/resources/tools.json").read_text(encoding="utf-8"))
tools = {x["name"]: x for x in catalog}
flat = [name for names in PACKAGES.values() for name in names]
assert len(flat) == len(set(flat)) == len(catalog) == 63
assert set(flat) == set(tools)
skills = []
for f in sorted((PROJECT / "src/skills").glob("*/SKILL.md")):
    text = f.read_text(encoding="utf-8")
    skills.append({"id": f.parent.name, "file": f.relative_to(PROJECT).as_posix(), "sha256": sha(f.read_bytes()),
                   "mentionsRegisteredTools": [name for name in sorted(tools) if re.search(r"(?<![\w])(?:legacy_)?" + re.escape(name) + r"(?![\w])", text)]})

def code_tree(code):
    if isinstance(code, types.CodeType):
        yield code
        for item in code.co_consts:
            yield from code_tree(item)

def constant_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, types.CodeType):
        for item in value.co_consts:
            yield from constant_strings(item)
    elif isinstance(value, (tuple, list, set, frozenset)):
        for item in value:
            yield from constant_strings(item)

frozen = []
for name in ["registry.bin", "mcp_server.bin"]:
    f = PROJECT / "src/legacy-mcp" / name
    raw = f.read_bytes()
    # Only deserialize project-owned extracted code, with the installed 3.12 interpreter.
    # No exec, eval, import, or invocation of functions inside this data.
    code = marshal.loads(raw)
    codes = list(code_tree(code))
    strings = set(constant_strings(code))
    frozen.append({"file": f.relative_to(PROJECT).as_posix(), "sha256": sha(raw), "type": type(code).__name__,
                   "codeObjects": [{"name": c.co_name, "filename": c.co_filename, "firstLine": c.co_firstlineno} for c in codes],
                   "moduleStrings": sorted(x for x in strings if x.startswith("modules.") and len(x) < 160),
                   "registeredNameStrings": sorted(set(tools).intersection(strings)),
                   "registryEntries": [list(x) for x in code.co_consts if name == "registry.bin" and isinstance(x, tuple) and len(x) > 20 and all(isinstance(y, str) for y in x)],
                   "topLevelNames": list(code.co_names) if isinstance(code, types.CodeType) else []})

worker_ast = ast.parse((PROJECT / "src/audit-worker/worker.py").read_text(encoding="utf-8"))
result = {
    "date": "2026-10-10", "projectVersion": json.loads((PROJECT / "package.json").read_text(encoding="utf-8"))["version"],
    "sourceRoot": str(LEGACY), "method": "static file/PE/ZIP/code-object inspection; no legacy business execution",
    "python": sys.version.split()[0],
    "moduleExtensionCounts": dict(Counter(f.suffix for f in (LEGACY / "modules").rglob("*") if f.is_file())),
    "sourceExtensionCounts": dict(Counter(f.suffix for f in (LEGACY / "src").rglob("*") if f.is_file())),
    "templateExtensionCounts": dict(Counter(Path(x["file"]).suffix for x in templates)),
    "cythonMarkers": sum(x["cythonMarker"] for x in binary_evidence),
    "builtinCount": len(builtin), "registeredMcpCount": len(catalog), "skillCount": len(skills),
    "packages": [{"id": key, "count": len(names), "operations": names} for key, names in PACKAGES.items()],
    "operations": [{"id": x["name"], "description": x["description"], "parameters": list(x["inputSchema"].get("properties", {})),
                    "required": x["inputSchema"].get("required", []), "schema": x["inputSchema"]} for x in catalog],
    "builtinOperations": [{"id": x["id"], "name": x["name"]} for x in builtin],
    "binaryEvidence": binary_evidence, "templates": templates, "skills": skills, "frozenBytecode": frozen,
    "workerFunctions": [x.name for x in worker_ast.body if isinstance(x, (ast.FunctionDef, ast.AsyncFunctionDef))],
    "limitations": ["String hints are observations, not verified dependency graphs or algorithms.",
                    "No real credentials, user configuration, databases, projects, or outputs were read.",
                    "No dynamic legacy execution or independent migration verification occurred in this analysis."],
}
(OUT / "evidence.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({key: result[key] for key in ["date", "projectVersion", "python", "moduleExtensionCounts", "sourceExtensionCounts", "templateExtensionCounts", "cythonMarkers", "builtinCount", "registeredMcpCount", "skillCount"]}, ensure_ascii=False))
print(json.dumps({"vbaTemplates": [x["file"] for x in templates if x.get("vbaProject")],
                  "templatesWithDrawings": sum(bool(x.get("drawingParts")) for x in templates),
                  "templatesWithComments": sum(bool(x.get("commentParts")) for x in templates),
                  "templatesWithFormulas": sum(bool(x.get("formulaCells")) for x in templates),
                  "packages": [{"id": x["id"], "count": x["count"]} for x in result["packages"]]}, ensure_ascii=False))
for item in binary_evidence:
    if Path(item["file"]).stem in {"ipo_sh", "ipo_sz", "ipo_bj", "bank_flow", "_core", "cicpa_query", "related_party", "paper_verify", "address_split", "id_card", "qcc_processor", "currency", "announcement", "xlsx_writer"}:
        print(json.dumps({key: item[key] for key in ["file", "dependencyStringHints", "domainStringHints"]}, ensure_ascii=False))
for item in frozen:
    print(json.dumps({key: item[key] for key in ["file", "moduleStrings", "registeredNameStrings", "registryEntries", "topLevelNames"]}, ensure_ascii=False))
