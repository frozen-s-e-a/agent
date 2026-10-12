# Agent 能力绑定矩阵

由 `scripts/export-agent-contracts.mjs` 从实际程序生成。79 项能力映射到 9 条流程。输入字段、节点依赖、通过条件、失败分支、版本和合同哈希保存在同目录的 `Agent节点与能力合同.json`。登记的远程能力在当前本机测试版本中受网络限制。

|精确工具编号|能力名称|执行器|流程/节点|
|---|---|---|---|
|inspect|查看数据结构|builtin|data/inspect、ledger/inspect、monthly/preview、sampling/population|
|select_column|选择列|builtin|data/process|
|fill_column|向下填充空值|builtin|data/process|
|merge_files|多表汇集|builtin|data/process|
|merge_column|多列合并|builtin|data/process|
|add_column|新增固定值列|builtin|data/process|
|dropsummary|删除合计行|builtin|data/process|
|text_match|文本筛选匹配|builtin|data/process|
|subject_clean|科目字段清理|builtin|ledger/normalize|
|voucher_check|凭证借贷核对|builtin|ledger/test|
|monthly_analysis|月间分析|builtin|monthly/analysis|
|duplicates|全局重复检查|builtin|data/process|
|jet_test|JET 会计分录测试|builtin|ledger/test|
|file_inventory|文件资料清单|builtin|data/inspect|
|pdf_text|PDF 文本提取|builtin|data/process、aux/extract|
|link_extract|Excel 链接提取|builtin|disclosure/links|
|mcp_add_column|合并同名列|mcp|data/process|
|mcp_address_split|函证地址拆分成省市区|mcp|aux/extract|
|mcp_ai_formula_filler|AI 智能公式填充 🎯|mcp|aux/extract|
|mcp_announcement|公告下载|mcp|external/query|
|mcp_asist_split|辅助项拆分工具|mcp|ledger/normalize|
|mcp_auxiliary_selection|辅助项智能选择|mcp|ledger/normalize|
|mcp_bank_digit2|银行函证表格生成-电子格式二|mcp|bank/letter|
|mcp_bank_flow|序时账与流水双向核对|mcp|bank/reconcile|
|mcp_bank_paper1|银行函证表格生成-纸质格式一|mcp|bank/letter|
|mcp_bank_paper2|银行函证表格生成-纸质格式二|mcp|bank/letter|
|mcp_bankflowmerge|按账户汇集银行流水|mcp|bank/merge|
|mcp_cicpa_query|注协系统工商信息获取|mcp|external/query|
|mcp_currency|查询汇率|mcp|aux/extract|
|mcp_cutoff_sampling|截止测试抽样|mcp|sampling/sample|
|mcp_data_field_check|资料字段检查|mcp|data/process|
|mcp_detailed_table_generate|明细底稿生成|mcp|workpaper/generate|
|mcp_detailed_table_inspect|明细表-检查数据源|mcp|workpaper/source|
|mcp_detailed_table_inspect_template|明细表-检查模板|mcp|workpaper/template|
|mcp_detailed_table_save_config|明细表-保存配置|mcp|workpaper/configure|
|mcp_detailed_table_validate|明细表-校验配置|mcp|workpaper/validate|
|mcp_dropsummary|删除合计行工具|mcp|data/process|
|mcp_extract_disclosure_scope|披露口径提取 📋|mcp|disclosure/scope|
|mcp_extract_disclosure_tables|披露表提取 📋|mcp|disclosure/tables|
|mcp_file_classification|文件自动分类|mcp|data/process|
|mcp_fill_column|向下填充空值工具|mcp|data/process|
|mcp_gross_margin_analysis|收入成本与毛利率分析|mcp|monthly/analysis|
|mcp_headers_process|表头处理工具|mcp|data/process|
|mcp_id_card|身份证信息解析|mcp|aux/extract|
|mcp_info_extract|文件关键信息提取|mcp|aux/extract|
|mcp_info_extract_multi|多公司多类型文件关键信息提取|mcp|aux/extract|
|mcp_insert_column|插入列工具|mcp|data/process|
|mcp_insert_footnote_comments|插附注批注|mcp|disclosure/links|
|mcp_ipo_bj|北交所IPO披露文件下载|mcp|external/query|
|mcp_ipo_sh|上交所IPO披露文件下载|mcp|external/query|
|mcp_ipo_sz|深交所IPO披露文件下载|mcp|external/query|
|mcp_jet_test_execute|执行 JET 规则|mcp|ledger/test|
|mcp_jet_test_inspect|预览 JET 数据|mcp|ledger/inspect|
|mcp_ledger_check|小账套校验工具|mcp|ledger/test|
|mcp_link_extractor|外部链接提取|mcp|disclosure/links|
|mcp_link_ref_replace|链接替换-参考替换|mcp|disclosure/links|
|mcp_link_replace_range|链接替换-单元格区域替换|mcp|disclosure/links|
|mcp_link_replace_text|链接替换-文件夹路径替换|mcp|disclosure/links|
|mcp_link_replace_workbook|链接替换-文件名替换|mcp|disclosure/links|
|mcp_merge_column|多列合并工具|mcp|data/process|
|mcp_monthly_ai_analysis|月间分析-AI变动分析|mcp|monthly/explain|
|mcp_monthly_detect_structure|月间分析-编码结构分析|mcp|monthly/structure|
|mcp_monthly_execute|本期与上期月间分析|mcp|monthly/analysis|
|mcp_monthly_preview|月间分析-数据预览|mcp|monthly/preview|
|mcp_multi_collect_file|多表汇集-文件|mcp|data/process|
|mcp_multi_collect_folder|多表汇集-文件夹|mcp|data/process|
|mcp_paper_verify|纸质信息核对|mcp|aux/extract|
|mcp_photo_rename|AI图片智能重命名|mcp|aux/extract|
|mcp_pickup_value|提取值工具|mcp|data/process|
|mcp_qcc_processor|企查查信用报告处理工具|mcp|external/query|
|mcp_related_party|关联方核查|mcp|external/related|
|mcp_select_column|按配置提取 Excel 列|mcp|data/process|
|mcp_subject_allocation|科目分配派工|mcp|ledger/normalize|
|mcp_tool_execute|科目余额表处理|mcp|ledger/normalize|
|mcp_tool_preview|科目余额表预览|mcp|ledger/inspect|
|mcp_subject_clean_after|科目余额表后处理|mcp|ledger/normalize|
|mcp_text_match|按配置提取匹配文本|mcp|data/process|
|mcp_voucher_check|批量凭证检查|mcp|ledger/test|
|mcp_xlsx_writer|批量生成小账套|mcp|workpaper/generate|
