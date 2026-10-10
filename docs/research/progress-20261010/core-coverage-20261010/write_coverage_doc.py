"""Render an honest entry-by-entry recovery status, rather than claiming algorithms from names."""
from pathlib import Path
import json
import re

ROOT=Path(__file__).resolve().parents[2]
data=json.loads((Path(__file__).parent/'core-coverage.json').read_text(encoding='utf-8'))
groups={
    'P01_table':'表格与字段处理','P02_subject':'科目及余额表整理','P03_checks_sampling':'分录、账套检查及抽样',
    'P04_bank':'银行处理与核对','P05_analysis':'月间及毛利分析','P06_workpapers':'底稿及小账套',
    'P07_workbook_structure':'工作簿、外链及披露表','P08_remote':'下载与在线查询',
    'P09_relationships':'工商资料与关联方','P10_documents_ai':'文件、信息及 AI 辅助处理',
}
lines=[
    '# 63 项 MCP 核心逻辑提取范围与进展', '',
    '日期：2026-10-10。范围是原程序注册的全部 **63 个 MCP 入口**，没有限定为 JET。JET 是先行验证的方法试点。', '',
    '## 1. 数量与实际进展', '',
    '- 63 个入口都已核对到原业务文件，映射完整，无重复无遗漏。',
    '- 静态扫描覆盖 `modules` 下 216 个原生扩展；其中 201 个找到方法定义候选，扫描错误为 0。107 个文件含 Cython 标记；不能把其他文件的编译器猜成同一种。',
    '- 全部 63 个入口本身或其同目录支撑模块都找到函数线索。这里的“找到”指定位到原生函数声明、地址或说明，不代表已经取得完整算法。',
    '- 已独立重写并通过对照的是 JET 的条件判断及 13 个内置特征计算。银行、月间分析、底稿、IPO 等已找到继续分析的目标函数，尚未完成相同程度的独立重写验证。',
    '- 当前 63 个生产 MCP 入口仍调用旧工具箱；生产独立迁移完成数仍是 0。研究验证不能代替接入和安装验收。', '',
    '63 是公开入口数，216 是实现文件数，二者都不是 63 套独立算法。例如月间分析的 4 个入口共享 `_core.pyd`；底稿的 5 个入口共享另一份 `_core.pyd`。另一方面，一个银行核对入口内部就包含多层匹配算法。因此工作应追踪共享核心和实际处理分支，同时保证最终 63 个入口的契约都被覆盖。', '',
    '证据：[全量静态覆盖清单](../artifacts/core-coverage-20261010/core-coverage.json)、[现有 63 项接口和迁移契约](独立迁移逐项清单-20261010.md)、[JET 独立验证](JET核心逻辑提取与验证-20261010.md)。', '',
    '## 2. 已定位到的其他核心目标', '',
    '|功能|实际定位的函数或处理层|接下来需要取得的逻辑|',
    '|---|---|---|',
    '|表格选列|`_find_excel_files`、`_filter_sheets_by_keywords`、`_process_single_file`|目录与工作表筛选、缺列策略、列顺序、合并成果|',
    '|辅助核算拆分|`_parse_auxiliary_item`、`get_val`、`_process_single_file`|字段分隔、重复辅助项及异常输入的解析|',
    '|科目整理|`detect_code_structure`、`_filter_leaf_accounts`、`_add_account_hierarchy_columns`、`_validate_balance_differences`|编码层级、末级识别、辅助核算及余额校验|',
    '|账套检查|`judge_balance`、`judge_father_equal_children`、`filter_and_sum`、`sum_amounts_by_code`|余额方向、上下级科目汇总和勾稽条件|',
    '|银行核对|`_l1_partner_exact` 至 `_l9_cross_month_boundary`，含拆分、汇总、模糊和凑数匹配|顺序、金额容差、候选分组、已匹配占用、跨月边界、原行溯源|',
    '|月间分析|`calc_sub_code`、`calc_level`、`remove_parent_code`、`_prepare_df`、`monthly_analysis`|科目层级、金额方向、月份计算、本期上期对比|',
    '|毛利分析|`pivot_by_dimension`、`build_monthly_analysis_table`、`pvm_decompose`、`mark_threshold`|收入成本口径、维度汇总、价量结构分解及异常阈值|',
    '|明细底稿|`build_master_plan`、`computing_annotation_relationships`、`age_count`、`execute_master_plan`、`write_data_to_sheet`|模板批注、映射、账龄、执行计划、底稿回填和样式处理|',
    '|沪深北 IPO 下载|三个独立入口中的 `download_file`、`process_jsonp`、`_extract_info`、`get_date_key` 等|分别核实查询、分页、文件筛选、命名、下载和索引；目前未执行网络下载|',
    '|公告下载|`code2id`、`fetch_cninfo_data`、`download_pdf`、`normalize_date`|代码转查询标识、日期范围、分页和 PDF 成果|',
    '|关联方|`check_dimension_01` 等检查方法、`_penetrate_holders`、`_parse_ratio`、`_extract_address_core`|各判断维度、股权比例、穿透停止条件和名称地址规范化|',
    '|AI 公式填充|`find_tables_by_borders`、`get_flattened_headers`、`get_source_table_info_bfs`、`get_writable_cell_position`|表格识别、信息提取、提示配置、公式输出校验和可写位置|', '',
    '函数名称提供研究位置；每项仍要检查实际分支、常量和结果。不能仅凭 `pvm_decompose` 或 `judge_balance` 的名字自行发明算法。', '',
    '月间核心的独立加载探测还发现了 `openai` 与 `ai_utils` 的导入耦合。研究进程用一个永远拒绝 AI 调用的临时类型隔离前者，但仍缺少后者，因此未成功加载、未执行月间计算。这个失败记录保留在 [加载探测](../artifacts/core-coverage-20261010/monthly-callable-signatures.json)。它提示需要继续拆依赖；不代表只能提取 JET，也不能把探测写成月间功能已经运行。', '',
    '## 3. 全部入口逐项覆盖', '',
    '以下按实现研究分组排列，便于核对工作范围，**不是新客户端界面板块设计**。每个入口的输入/输出完整契约仍见独立迁移清单。', '',
]
ignored={'run','__init__','get_description','get_excel_config_schema','get_category','get_planning_guide','get_input_file_path','log','print_summary'}
for group,title in groups.items():
    entries=[entry for entry in data['entries'] if entry['package']==group]
    lines += [f'### {title}（{len(entries)} 个入口）','',
              '|MCP 入口|原业务文件|共享核心候选|函数线索举例|当前状态|','|---|---|---|---|---|']
    for entry in entries:
        names=[]
        for method in entry['candidateMethods']:
            name=method['name']
            if name not in ignored and name not in names:
                names.append(name)
        if not names:
            names=['run（需继续追内部调用）']
        methods='、'.join(f'`{name}`' for name in names[:4])
        support='<br>'.join(f'`{file}`' for file in entry['coreSupportFiles']) or '入口文件内继续追踪'
        state='共享 JET 计算已验证；入口未迁移' if entry['name'] in ['jet_test_inspect','jet_test_execute'] else '函数定位；算法未完成验证'
        lines.append(f"|`{entry['name']}`|`{entry['entryFile']}`|{support}|{methods}|{state}|")
    lines.append('')
lines += [
    '## 4. 接下来的完整提取标准', '',
    '研究要覆盖全部入口。对每个共享核心和处理分支，交付以下四项：', '',
    '1. 输入字段、参数、文件格式及输出契约。',
    '2. 实际规则、公式、匹配顺序、阈值、异常与边界处理，并标记来源和不确定部分。',
    '3. 可维护的自有实现，正式运行不导入旧业务模块。',
    '4. 合成数据的预期结果、原程序对照及客户端任务/成果验收。', '',
    '可以先推进纯表格计算、科目和共享分析核心，再深入银行匹配、底稿、在线服务等依赖较多的处理。已定位、已恢复、已验证、已接入是不同阶段，后续台账分别登记，不把前一阶段当成后一阶段完成。', '',
]
target=ROOT/'docs/63项MCP核心逻辑提取范围与进展-20261010.md'
target.write_text('\n'.join(lines),encoding='utf-8')
text=target.read_text(encoding='utf-8')
assert sum(text.count(f"|`{entry['name']}`|") for entry in data['entries'])==63
assert all(text.count(f"|`{entry['name']}`|")==1 for entry in data['entries'])
print(json.dumps({'document':str(target),'entryRows':63,'bytes':target.stat().st_size},ensure_ascii=False))
