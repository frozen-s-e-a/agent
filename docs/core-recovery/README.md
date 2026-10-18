# 63 项原生核心与独立源代码索引

这是实际产物索引。全部 63 项有原生汇编证据，55 项入口有 C 伪代码。**生产独立迁移完成仍为 0/63。**

|入口|C 函数/候选数（含共享依赖）|独立成果与范围|详细记录|
|---|---|---|---|
|add_column|8/8|独立 XLSX 核心 merge_same_name_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/add_column.md>)|
|address_split|4/4|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/address_split.md>)|
|ai_formula_filler|19/19|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/ai_formula_filler.md>)|
|announcement|7/7|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/announcement.md>)|
|asist_split|6/6|独立 XLSX 核心 split_auxiliary_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/asist_split.md>)|
|auxiliary_selection|8/8|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/auxiliary_selection.md>)|
|bank_digit2|2/3|与 bank_paper1 / bank_paper2 共享 bank_confirmation_core；原生完整主体有汇编，run_core_logic 的 C 反编译超时。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/bank_digit2.md>)|
|bank_flow|48/48|已独立验证名称清洗、相似度、日期格式和组合金额 helper。L1–L9 完整匹配顺序、占用和报告尚未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/bank_flow.md>)|
|bank_paper1|2/3|共享 bank_confirmation_core。COM、函证模板表头系统编码和成果导出尚未独立验证。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/bank_paper1.md>)|
|bank_paper2|2/3|共享 bank_confirmation_core。COM、函证模板表头系统编码和成果导出尚未独立验证。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/bank_paper2.md>)|
|bankflowmerge|22/23|列名去重与列字母递增已独立验证；多文件、多账户、日期口径和成果写出待移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/bankflowmerge.md>)|
|cicpa_query|24/27|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/cicpa_query.md>)|
|currency|4/4|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/currency.md>)|
|cutoff_sampling|7/8|截止日期、日期清洗、凭证去重合并已独立验证。完整抽样窗口、实际凭证抽取和输出尚未迁移。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/cutoff_sampling.md>)|
|data_field_check|7/8|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/data_field_check.md>)|
|detailed_table_generate|71/71|共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/detailed_table_generate.md>)|
|detailed_table_inspect|71/71|共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/detailed_table_inspect.md>)|
|detailed_table_inspect_template|71/71|共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/detailed_table_inspect_template.md>)|
|detailed_table_save_config|73/73|共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/detailed_table_save_config.md>)|
|detailed_table_validate|71/71|共享底稿核心的账龄、汇总、映射、数据检查、模板批注扫描和配置校验已独立验证；尚未完成执行计划、完整模板回填与配置持久化入口。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/detailed_table_validate.md>)|
|dropsummary|4/4|独立 XLSX 核心 remove_summary_rows 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/dropsummary.md>)|
|extract_disclosure_scope|3/4|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/extract_disclosure_scope.md>)|
|extract_disclosure_tables|4/5|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/extract_disclosure_tables.md>)|
|file_classification|14/14|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/file_classification.md>)|
|fill_column|8/8|独立 XLSX 核心 fill_down_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/fill_column.md>)|
|gross_margin_analysis|37/38|PVM、阈值和标准字段透视已独立验证。任意字段映射、按月完整流程、AI 分析和成果模板仍待移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/gross_margin_analysis.md>)|
|headers_process|8/8|独立 XLSX 核心 flatten_headers 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/headers_process.md>)|
|id_card|4/4|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/id_card.md>)|
|info_extract|23/24|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/info_extract.md>)|
|info_extract_multi|18/18|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/info_extract_multi.md>)|
|insert_column|25/25|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/insert_column.md>)|
|insert_footnote_comments|9/9|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/insert_footnote_comments.md>)|
|ipo_bj|7/7|独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/ipo_bj.md>)|
|ipo_sh|7/7|独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/ipo_sh.md>)|
|ipo_sz|6/6|独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/ipo_sz.md>)|
|jet_test_execute|24/24|独立 JET 条件判断、11 类特征及 33 条原生内置规则；5,185 个值对照和 4 组原 EXE 成果对照。完整输入检查/成果写出入口仍未接入。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/jet_test_execute.md>)|
|jet_test_inspect|19/19|独立 JET 条件判断、11 类特征及 33 条原生内置规则；5,185 个值对照和 4 组原 EXE 成果对照。完整输入检查/成果写出入口仍未接入。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/jet_test_inspect.md>)|
|ledger_check|11/11|借贷平衡、上下级汇总及方向规则已独立验证。完整账套输入适配和异常报告尚未迁移。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/ledger_check.md>)|
|link_extractor|23/23|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/link_extractor.md>)|
|link_ref_replace|26/26|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/link_ref_replace.md>)|
|link_replace_range|29/29|A1 范围尺寸解析已验证；COM 外链替换及 Excel 重算未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/link_replace_range.md>)|
|link_replace_text|30/30|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/link_replace_text.md>)|
|link_replace_workbook|30/30|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/link_replace_workbook.md>)|
|merge_column|10/10|独立 XLSX 核心 merge_named_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/merge_column.md>)|
|monthly_ai_analysis|29/29|共享月间核心已安全加载；科目编码、层级、名称和父级识别已独立验证。完整月间计算及 AI 流程尚未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/monthly_ai_analysis.md>)|
|monthly_detect_structure|30/30|共享月间核心已安全加载；科目编码、层级、名称和父级识别已独立验证。完整月间计算及 AI 流程尚未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/monthly_detect_structure.md>)|
|monthly_execute|28/29|共享月间核心已安全加载；科目编码、层级、名称和父级识别已独立验证。完整月间计算及 AI 流程尚未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/monthly_execute.md>)|
|monthly_preview|29/29|共享月间核心已安全加载；科目编码、层级、名称和父级识别已独立验证。完整月间计算及 AI 流程尚未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/monthly_preview.md>)|
|multi_collect_file|10/10|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/multi_collect_file.md>)|
|multi_collect_folder|10/10|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/multi_collect_folder.md>)|
|paper_verify|41/43|标准化、提取结果装配及一对一先精确后标准化比对已独立验证。图片/PDF 识别及完整写表未迁移。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/paper_verify.md>)|
|photo_rename|29/30|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/photo_rename.md>)|
|pickup_value|4/4|独立 XLSX 核心 collect_values 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/pickup_value.md>)|
|qcc_processor|7/7|目录清洗、排序和企业名称提取已独立验证。完整 DOCX 解析、合并和输出未移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/qcc_processor.md>)|
|related_party|51/52|独立 13 维度规则在已索引数据上通过 195 项对照，每个维度均有命中样例。53 类工商文件加载、线上股权穿透、完整报表及其他未覆盖分支尚未迁移。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/related_party.md>)|
|select_column|6/6|独立 XLSX 核心 select_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/select_column.md>)|
|subject_allocation|10/10|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/subject_allocation.md>)|
|subject_clean_after|4/5|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/subject_clean_after.md>)|
|text_match|8/8|JSON 文本提取已独立验证；批次、AI 提示和结果校验有原生证据，未独立运行 AI。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/text_match.md>)|
|tool_execute|30/31|共享科目核心的末级识别、列名去重及数字前缀清洗已独立验证。编码推断、辅助核算与余额校验完整流程待移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/tool_execute.md>)|
|tool_preview|30/31|共享科目核心的末级识别、列名去重及数字前缀清洗已独立验证。编码推断、辅助核算与余额校验完整流程待移植。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/tool_preview.md>)|
|voucher_check|54/56|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/voucher_check.md>)|
|xlsx_writer|29/29|原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。|[打开](<C:/Users/Install/Desktop/ai助手/docs/core-recovery/xlsx_writer.md>)|

[机器可读的完整覆盖台账](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/recovery-ledger.json>)
