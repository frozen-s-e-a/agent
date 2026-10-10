"""Generate a proposed per-entry migration ledger from static evidence."""
from pathlib import Path
import json
import re

OUT = Path(__file__).resolve().parent
PROJECT = OUT.parents[1]
evidence = json.loads((OUT / "evidence.json").read_text(encoding="utf-8"))
registry = next(x for x in evidence["frozenBytecode"] if x["file"].endswith("registry.bin"))["registryEntries"][0]
module_by_name = {x.rsplit(".", 1)[-1]: x for x in registry}
operations = {x["id"]: x for x in evidence["operations"]}
assert set(module_by_name) == set(operations)

packages = {
    "P01_table": ("表格与字段处理", "src/audit-domain/table_ops.py"),
    "P02_subject": ("科目与余额表", "src/audit-domain/subjects.py"),
    "P03_checks_sampling": ("分录/账套校验与抽样", "src/audit-domain/checks.py；cutoff_sampling → sampling.py"),
    "P04_bank": ("银行", "src/audit-domain/bank.py"),
    "P05_analysis": ("分析", "src/audit-domain/analysis.py"),
    "P06_workpapers": ("明细底稿与小账套", "src/audit-domain/workpapers.py"),
    "P07_workbook_structure": ("工作簿链接、披露与批注", "src/audit-domain/workbook_structure.py"),
    "P08_remote": ("外部查询与下载", "src/connectors/{来源适配器}.py"),
    "P09_relationships": ("工商资料与关联关系", "src/audit-domain/relationships.py"),
    "P10_documents_ai": ("文档、文本解析与 AI", "src/audit-domain/documents_ai.py"),
}

behavior = {
    "add_column": "同名列合并、分隔符、最多列数与 keyword 范围；不能映射成新增固定值列。",
    "address_split": "结构化地址解析；测试简称、缺层级、重复地址与无法解析；核对原词典和结果字段。",
    "ai_formula_filler": "读取配置表、由模型提出公式、校验目标/引用后填副本；核对公式文本与实际计算。",
    "announcement": "直接来源查询、分页、代码/日期/市场/类别/关键词筛选，下载附件及索引；核对失效链接。",
    "asist_split": "按键值/项目分隔符拆辅助核算；测试空项、重复键、嵌套/异常文本与 Sheet 范围。",
    "auxiliary_selection": "解析辅助项配置与筛选口径；模型建议与确定性提取分开，测试缺项和重复辅助项。",
    "bank_digit2": "电子格式二配置及函证模板填充；核对账户分组、金额与版面。",
    "bank_flow": "方向/日期/对手标准化及真实双向匹配；核对重复占用、拆合、跨日、未匹配和控制合计。",
    "bank_paper1": "纸质格式一函证配置和模板填充；核对账户、银行、打印设置与全部字段。",
    "bank_paper2": "纸质格式二函证配置和模板填充；与格式一区分，核对字段、分组与版面。",
    "bankflowmerge": "每文件参数数组一一对应；统一时间、收支、账户与余额，保留原文件/原行。",
    "cicpa_query": "search/detail/export/subsidiary/check_cookies 分别实现；会话失效、分页、导出目录和实际来源验证。",
    "currency": "核对数据来源、汇率日期、币种与输出范围；当前空参数 schema 不能说明具体业务行为。",
    "cutoff_sampling": "解析期间/截止日/范围/样本量；核对随机性、顺序、边界、异常与样本行来源。",
    "data_field_check": "配置驱动必填、类型、格式等真实规则；模型建议不替代判定，定位缺失/异常字段。",
    "detailed_table_generate": "使用保存的各类映射与模板批注批量填底稿；校验公司/科目/期间、金额和工作簿保真。",
    "detailed_table_inspect": "检查文件/目录真实结构，返回公司/科目/行数/列与样本；区别普通前 N 行预览。",
    "detailed_table_inspect_template": "扫描模板实际 Sheet 与批注映射标记；识别隐藏、命名范围、VBA/链接等资源。",
    "detailed_table_save_config": "固定配置类型及自定义批注配置；规范 JSON、合并/覆盖语义、原子保存与恢复。",
    "detailed_table_validate": "验证字段/科目/模板配置完整性和引用；给出实际缺项，禁止把保存成功当校验通过。",
    "dropsummary": "关键词匹配方式、作用列、空行与 Sheet 范围；核对排除记录和剩余顺序。",
    "extract_disclosure_scope": "配置定位及披露口径提取；核对数据范围、科目/公司/期间与输出字段。",
    "extract_disclosure_tables": "定位并提取披露表及其标题/层级/口径；核对公式、合并格与空值。",
    "file_classification": "解析多维分类配置；读取不同文档/图片、模型分类、输出路由与无法确认项。",
    "fill_column": "空值定义、列列表、keyword 匹配与 Sheet 边界；跨文件/工作表不能串填。",
    "gross_margin_analysis": "模式、字段映射、维度、本期上期及收入/成本方向；核对零收入/负数/汇总层级和结果。",
    "headers_process": "多行表头、合并格、重复字段与关键词定位；核对列顺序和数据起始行。",
    "id_card": "号码校验/解析和非法号码；核对原库/地区字典及结构化输出，保护前导零和未知项。",
    "info_extract": "按角色任务读取目录文件、并行提取；来源页/表/单元格、结构化结果及失败文件清单。",
    "info_extract_multi": "配置中的公司/文件类型/字段分别解析提取；核对多维结果、缺资料与模型失败。",
    "insert_column": "插入位置/列名/固定值/Sheet；核对原列顺序、公式引用调整和样式。",
    "insert_footnote_comments": "配置定位附注和批注范围；核对批注内容、位置与原有批注合并/覆盖。",
    "ipo_bj": "北交所直接适配器；项目/文件更新、日期范围、分页/附件/增量、hash 与失败清单。",
    "ipo_sh": "上交所直接适配器；科创/主板范围、项目/文件更新、分页/附件/增量与版本。",
    "ipo_sz": "深交所直接适配器；板块/日期/更新模式、项目详情与附件下载、增量及失败恢复。",
    "jet_test_execute": "自定义特征与规则矩阵、映射/settings；核对边界、作用域、疑点集合和来源。",
    "jet_test_inspect": "列类型/样本/规则模板及 include_templates；检查非规则表头、空值和完整字段。",
    "ledger_check": "账套借贷、总额与序时账、一级/二级科目及余额勾稽；核对全部检查分支和定位。",
    "link_extractor": "配置范围内外链/公式/命名范围提取；索引到原工作簿、Sheet 与单元格。",
    "link_ref_replace": "参考轴/目标轴/example_cell 的替换规则；核对绝对/相对引用、范围与多 Sheet。",
    "link_replace_range": "按配置替换单元格区域引用；保护不在目标范围的公式和链接。",
    "link_replace_text": "路径片段替换与大小写/转义规则；测试中文/空格路径、公式和外链部件。",
    "link_replace_workbook": "工作簿名替换和实际目标关系；核对名称冲突、路径、公式及外链关系。",
    "merge_column": "空值/分隔符/插入位置/新列名/Sheet 筛选；核对是否保留原列及输出顺序。",
    "monthly_ai_analysis": "读取已生成结果与实际凭证样本，按阈值解释/生成程序；结果引用、模型失败与来源可查。",
    "monthly_detect_structure": "映射列中编码的层级、分隔符/步长和 top_n；含例外编码时给实际不确定项。",
    "monthly_execute": "主体/科目方向/层级、本期上期、阈值和所有月份；核对合计、零基数、缺上期。",
    "monthly_preview": "Excel/CSV 的实际类型、样本与基础统计；预览不能替代全量核查。",
    "multi_collect_file": "配置指定文件/表/范围的复制与汇集；核对格式、公式、来源和重名 Sheet。",
    "multi_collect_folder": "目录关键词/文件/表筛选与复制；核对递归、排序、排除规则和重名。",
    "paper_verify": "纸质资料字段识别与 match_keys 对齐；差异、识别不确定、无法核对项及页/图像定位。",
    "photo_rename": "图像识别→重命名计划→实际执行；重名、非法文件名、识别失败与恢复清单。",
    "pickup_value": "按 field_mappings 逐文件取指定单元格；核对空值、公式缓存/公式文本与多级目录。",
    "qcc_processor": "解析 DOCX 报告目录和结构统计；空目录、不同报告版本、表格/标题层级对照。",
    "related_party": "离线工商关系与线上股权穿透拆分；阈值/层数/环路/人员/地址/离任高管及证据。",
    "select_column": "目录、should_merge、Sheet 关键词、字段选择与顺序全部实现；核对缺列、多文件和来源。",
    "subject_allocation": "配置的科目/人员/派工口径与模型建议；核对重复派工、未分配和成果可复核。",
    "tool_execute": "科目编码/名称拆分、辅助核算、层级、期初、主体/分组；核对余额方向和控制合计。",
    "tool_preview": "实际余额表预览、表头识别与参数建议；建议保留置信/证据，不默认当成已确认配置。",
    "subject_clean_after": "配置驱动余额表后处理各分支；核对原科目/辅助项结构和处理前后控制合计。",
    "text_match": "配置与模型参与的原提取规则；不能映射为简单包含关键词筛选，输出来源和无法确认项。",
    "voucher_check": "文件/文件夹 source_paths 的真实检查分支；不只当前凭证借贷不平规则。",
    "xlsx_writer": "配置驱动生成小账套；核对模板宏、主体/科目/期间、公式、原总额与文件命名。",
}
assert set(behavior) == set(operations)

config_text = (PROJECT / "src/workflows/templates.mjs").read_text(encoding="utf-8")
templates_by_tool = {name: re.findall(r"'([^']+)'", values) for name, values in re.findall(r"(\w+):\[([^\]]*)\]", config_text)}
remote = {"ipo_bj", "ipo_sh", "ipo_sz", "announcement", "cicpa_query", "currency"}
text = {"address_split", "id_card"}
ai = {"ai_formula_filler", "auxiliary_selection", "data_field_check", "file_classification", "info_extract", "info_extract_multi", "monthly_ai_analysis", "paper_verify", "photo_rename", "subject_allocation", "text_match"}
conditional_ai = {"gross_margin_analysis"}
collision = set(operations).intersection(x["id"] for x in evidence["builtinOperations"])
ledger = []
doc = ["# 63 项 MCP 入口独立迁移逐项清单", "", "日期：2026-10-10。与 [实现分析](独立迁移实现分析-20261010.md) 配套。", "", "本清单是拟定实现与待验收范围；当前这 63 个入口全部仍走旧程序 MCP 调用。目标源码文件均为建议，尚未实现。旧模块路径由提取的注册字节码核对，63 项无重复无遗漏。", "", "输入/成果列是根据接口、配置模板和 Skill 制定的目标契约，具体后缀和输出行为仍需原行为核对；不能据此声称已验证格式兼容。未注册的 GUI 子功能和其他模板仍需追踪，63 项不是完整原产品功能数量。", "", "状态、参数 schema、原模块映射及资源对应另存于 [机器可读台账](../artifacts/migration-analysis-20261010/feature-ledger.json)。", ""]

def formats(name):
    if name in text:
        return "文本列表 → 结构化 JSON / 表格"
    if name in {"ipo_bj", "ipo_sh", "ipo_sz", "announcement"}:
        return "查询条件 → 披露原文件（PDF 等）、索引、失败清单"
    if name == "cicpa_query":
        return "查询/授权 → JSON、Excel / ZIP（依模式核对）"
    if name == "currency":
        return "当前无参数 → 汇率数据（来源/格式待核对）"
    if name == "qcc_processor":
        return "DOCX 目录 → 结构化目录/统计成果（待核对）"
    if name == "related_party":
        return "XLSX 配置及工商导出目录 → 关系明细/报告"
    if name == "photo_rename":
        return "图像目录 → 重命名计划、实际文件、失败/恢复清单"
    if name in {"info_extract", "paper_verify"}:
        return "文档/图片 → 结构化提取/核对成果（后缀待核对）"
    if name in {"detailed_table_save_config", "detailed_table_validate"}:
        return "配置 JSON 与表格/模板引用 → 配置或实际校验结果"
    if name == "detailed_table_inspect_template":
        return "XLSX / XLSM 模板目录 → Sheet/批注/部件结构"
    if name in {"monthly_preview", "monthly_detect_structure", "monthly_execute"}:
        return "CSV / Excel 与映射 → 预览/层级或分析表"
    if name == "monthly_ai_analysis":
        return "分析结果表/序时账 → 变动解释/程序与证据"
    if name in templates_by_tool:
        return "XLSX 配置、相应数据/模板 → 业务成果（逐项核对）"
    return "Excel 文件/目录与参数 → 预览/JSON 或处理后表格（逐项核对）"

def target(name, package):
    if name in remote:
        return {"ipo_sh": "src/connectors/ipo_sse.py", "ipo_sz": "src/connectors/ipo_szse.py", "ipo_bj": "src/connectors/ipo_bse.py", "announcement": "src/connectors/announcements.py", "cicpa_query": "src/connectors/cicpa.py", "currency": "src/connectors/exchange_rates.py"}[name]
    if name == "cutoff_sampling":
        return "src/audit-domain/sampling.py"
    return packages[package][1].split("；")[0]

for package in evidence["packages"]:
    key = package["id"]
    doc += [f"## {key.split('_')[0]} {packages[key][0]}（{package['count']} 项）", "", f"拟定源码：`{packages[key][1]}`。", "", "|入口 / 原模块|输入与成果（目标）|必须实现与验收的行为|", "|---|---|---|"]
    for name in package["operations"]:
        module = module_by_name[name]
        legacy_file = "/".join(module.split(".")) + ".pyd"
        assert (Path(evidence["sourceRoot"]) / legacy_file).is_file(), legacy_file
        depends = []
        if name in remote:
            depends.append("network")
        if name in ai:
            depends.append("model")
        if name in conditional_ai:
            depends.append("model_if_ai_mode")
        if name in {"cicpa_query", "related_party"}:
            depends.append("service_authorization_if_online")
        if name == "detailed_table_generate":
            depends.append("64_bit_excel_in_original_contract; new_writer_selection_pending")
        if name in {"bank_digit2", "bank_paper1", "bank_paper2", "xlsx_writer", "link_extractor", "link_ref_replace", "link_replace_range", "link_replace_text", "link_replace_workbook", "insert_column", "insert_footnote_comments", "multi_collect_file", "multi_collect_folder"}:
            depends.append("workbook_fidelity_validation")
        ledger.append({"id": "mcp_" + name, "legacyName": name, "legacyModule": module, "legacyFile": legacy_file,
                       "package": key, "currentExecution": "legacy_executable_mcp", "migrationStatus": "observed_not_independently_migrated",
                       "proposedImplementation": target(name, key), "schema": operations[name]["schema"],
                       "inputOutputProposal": formats(name), "templatesObserved": templates_by_tool.get(name, []),
                       "dependencyProposal": depends, "baselineAndAcceptanceNeeded": behavior[name],
                       "nameCollisionWithBuiltin": name in collision, "independentVerified": False, "behaviorVerifiedInThisAnalysis": False})
        doc.append(f"|`{name}`<br>`{legacy_file}`|{formats(name)}|{behavior[name]}|")
    doc.append("")
doc += ["## 8 个 Skill 的落实范围", "", "|Skill|独立实现对应|仍需补齐的部分|", "|---|---|---|"]
skill_notes = {
    "monthly-analysis-mcp": ("monthly_preview / detect_structure / execute / ai_analysis", "更新真实参数契约、科目/方向确认与各阶段成果；不能只接当前按月汇总。"),
    "jet-test": ("jet_test_inspect / execute", "自定义特征/规则与实际字段映射、规则确认及异常成果。"),
    "detailed-table-generation": ("五个 detailed_table_* 入口", "数据/模板检查→配置→校验→生成全链条，改为应用内资源。"),
    "cicpa-query": ("cicpa_query 各 query_mode", "会话/授权、实际连接器和输出格式；旧浏览器工具名与 Cookie 描述须重核。"),
    "related-party-identification": ("related_party + cicpa_query 数据供应", "离线关系规则、可选在线穿透、阈值与证据成果。"),
    "find-skills": ("技能维护服务（不是 63 项审计业务接口）", "真实发现/安装工具、来源/版本及安装验收；当前仅有说明文件。"),
    "skill-creator": ("技能维护服务", "真实 create_skill 注册与工作区写入/校验；当前仅有说明文件。"),
    "skill-vetter": ("技能维护服务", "真实 Skill 内容读取/检查及安装前审查结果；当前仅有说明文件。"),
}
assert set(skill_notes) == {x["id"] for x in evidence["skills"]}
for skill in evidence["skills"]:
    correspondence, missing = skill_notes[skill["id"]]
    doc.append(f"|`{skill['id']}`|{correspondence}|{missing}|")
doc += ["", "## 用于完成判定的约束", "", "- 全部条目目前标记为未独立迁移，不能把本表的目标实现位置作为已有代码。", "- 7 个与内置操作同名的入口不能直接替换；需按参数、默认值、格式和输出逐项核对。", "- 23 个入口在现有模板映射中有明确资源名；其余入口是否还间接使用模板须继续研究。", "- 接口 JSON schema 是观察依据，具体输出、后缀范围、默认模板和处理顺序仍需行为对照。", "- 只有参数分支、模板、输出对照与无旧程序环境实际验证均通过，才能标记该功能完成。", ""]
(PROJECT / "docs/独立迁移逐项清单-20261010.md").write_text("\n".join(doc), encoding="utf-8")
(OUT / "feature-ledger.json").write_text(json.dumps({"date": "2026-10-10", "status": "analysis_and_proposals_only", "entries": ledger, "skillImplementationProposals": skill_notes}, ensure_ascii=False, indent=2), encoding="utf-8")
assert len(ledger) == len({x["id"] for x in ledger}) == 63
print(json.dumps({"entryCount": len(ledger), "skillCount": len(skill_notes), "builtinNameCollisions": sorted(collision), "explicitTemplateMappings": len(templates_by_tool), "allLegacyEntryFilesExist": True, "document": "docs/独立迁移逐项清单-20261010.md"}, ensure_ascii=False))
