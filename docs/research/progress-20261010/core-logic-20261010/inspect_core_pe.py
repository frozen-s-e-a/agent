"""Read-only PE inspection of selected audit modules; no legacy code execution."""
from pathlib import Path
import hashlib
import json
import re
import struct

OUT = Path(__file__).resolve().parent
LEGACY = Path(r"C:\Users\Install\Desktop\SW审计工具箱")

class PE:
    def __init__(self, raw):
        self.raw = raw
        self.pe = struct.unpack_from("<I", raw, 0x3c)[0]
        self.machine, count, _, _, _, optional_size, _ = struct.unpack_from("<HHIIIHH", raw, self.pe + 4)
        optional = self.pe + 24
        assert struct.unpack_from("<H", raw, optional)[0] == 0x20b
        self.base = struct.unpack_from("<Q", raw, optional + 24)[0]
        self.sections = []
        for index in range(count):
            off = optional + optional_size + index * 40
            name, virtual_size, rva, file_size, offset = struct.unpack_from("<8sIIII", raw, off)
            flags = struct.unpack_from("<I", raw, off + 36)[0]
            self.sections.append({"name": name.rstrip(b"\0").decode("ascii"), "size": virtual_size,
                                  "rva": rva, "fileSize": file_size, "offset": offset, "executable": bool(flags & 0x20000000)})

    def offset_to_va(self, offset):
        for s in self.sections:
            if s["offset"] <= offset < s["offset"] + s["fileSize"]:
                return self.base + s["rva"] + offset - s["offset"]

    def va_to_offset(self, va):
        rva = va - self.base
        for s in self.sections:
            if s["rva"] <= rva < s["rva"] + s["fileSize"]:
                return s["offset"] + rva - s["rva"]

    def executable_va(self, va):
        return any(s["executable"] and self.base + s["rva"] <= va < self.base + s["rva"] + s["size"] for s in self.sections)

    def cstring(self, va, limit=4000):
        offset = self.va_to_offset(va)
        if offset is None:
            return None
        end = self.raw.find(b"\0", offset, min(len(self.raw), offset + limit))
        if end < 0:
            return None
        try:
            return self.raw[offset:end].decode("utf-8")
        except UnicodeError:
            return None

records = []
for module in ["modules/jet_test/_core.pyd", "modules/bank_flow.pyd", "modules/monthly_analysis/_core.pyd"]:
    source = LEGACY / module
    raw = source.read_bytes()
    pe = PE(raw)
    tokens = []
    for match in re.finditer(rb"[\x20-\x7e]{4,}", raw):
        value = match.group().decode("ascii")
        if re.search(r"eval|condition|match|rule|feature|threshold|group|amount|date|tolerance|month|core\.|bank_flow\.", value, re.I):
            tokens.append({"va": hex(pe.offset_to_va(match.start()) or 0), "offset": match.start(), "text": value[:500]})
    methods = []
    for s in pe.sections:
        if s["executable"]:
            continue
        for offset in range(s["offset"], s["offset"] + s["fileSize"] - 31, 8):
            name, address, flags, doc = struct.unpack_from("<QQQQ", raw, offset)
            if flags > 0xffff or not flags or not pe.executable_va(address):
                continue
            method_name = pe.cstring(name, 200)
            if not method_name or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]{0,160}", method_name):
                continue
            methods.append({"name": method_name, "va": hex(address), "methodDefVa": hex(pe.offset_to_va(offset)),
                            "flags": flags, "doc": pe.cstring(doc) if doc else None})
    record = {"module": module, "sha256": hashlib.sha256(raw).hexdigest(), "imageBase": hex(pe.base),
              "sections": pe.sections, "methodCandidates": methods, "asciiClues": tokens}
    records.append(record)
    print(json.dumps({"module": module, "methodCandidates": methods, "clues": tokens[:30]}, ensure_ascii=False))
(OUT / "pe-evidence.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
