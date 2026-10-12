# gross_margin_analysis 核心还原记录

毛利率分析 (AI智能版)

**本项状态：** PVM、阈值和标准字段透视已独立验证。任意字段映射、按月完整流程、AI 分析和成果模板仍待移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|mode|string|否|执行模式: auto=全自动（推荐，自动检测列映射和维度后执行分析），preview=只预览数据列信息不执行分析，analyze=手动指定配置执行分析 可选值：["auto", "preview", "analyze"]|
|this_data_path|string|是|本期数据路径: 本期收入成本明细 Excel 文件路径（相对于 input/ 目录或绝对路径）|
|this_data_sheet|string|否|本期数据表名: 本期数据所在 Sheet 名称（preview 模式可省略，默认读第一个 Sheet）|
|last_data_path|string|否|上期数据路径: 上期收入成本明细 Excel 文件路径（仅 analyze 模式，不填则不做两期对比）|
|last_data_sheet|string|否|上期数据表名: 上期数据所在 Sheet 名称|
|field_mapping|string|否|字段映射: 可选。不传则自动检测列名。JSON 对象，键为标准字段名，值为数据源列名。必填标准字段: 营业收入, 营业成本, 数量。可选标准字段: 材料费用, 人工费用, 制造费用, 日期, 会计主体。示例: {"营业收入":"销售金额","营业成本":"成本金额","数量":"销量","日期":"记账日期"}|
|dimensions|string|否|透视维度: 可选。不传则自动检测分类列作为维度。JSON 数组，每个元素指定一个分析维度。每个元素: {"name":"维度名称","column":"数据源列名","threshold":0.05,"revenue_threshold":0}。示例: [{"name":"产品","column":"产品类别","threshold":0.05}]|
|output_path|string|否|输出路径: 分析结果输出路径（默认自动生成到 output/毛利率分析/ 目录）|
|thread_count|integer|否|AI并发线程数: AI分析并发线程数，默认5|
|confirmed|boolean|否|用户确认: 【重要】必须等待用户确认后才能设为 true。首次调用不传此参数，工具会返回自动检测的字段映射和维度供审查。你必须将检测结果展示给用户，等用户明确确认无误后，才能在下次调用时传 confirmed=true。绝对不要自行设置 confirmed=true。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/gross_margin_analysis.pyd**

【功能名称】毛利率分析 (AI智能版)
【输入数据】input/毛利率分析配置表.xlsx
【输出结果】output/毛利率分析/毛利率分析结果表.xlsx
【功能说明】
本工具用于对收入成本大表进行多维度毛利率分析。
1. 配置驱动：通过配置表定义数据源、字段映射和透视维度，适配不同项目。
2. 两期对比：自动计算本期与上期的毛利率变动，标记超阈值项。
3. PVM归因：对超阈值项执行Price-Volume-Mix分层穿透归因分析。
4. AI分析：结合大模型技术，自动生成变动原因和审计应对建议。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/gross_margin_analysis.pyd|37/38|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__gross_margin_analysis.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__gross_margin_analysis.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__gross_margin_analysis.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/gross_margin_analysis.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|21|_clean_illegal_chars(value)|value|清理字符串中的非法 XML 字符，防止 openpyxl 写入报错。|
|139|_get_work_dir(ctx)|ctx|兼容 GUI (AuditTool) 和 MCP (MCPContext) 的 work_dir 获取|
|148|_is_stop_requested(ctx)|ctx|兼容 GUI 和 MCP 的停止请求检查|
|155|_get_settings(ctx)|ctx|兼容 GUI 和 MCP 的 settings_data 获取|
|160|_auto_detect_columns(df)|df, KEYWORD_MAP, PRIORITY_MAP, result, used_cols, std_field, keywords, priority_keys, matched, pk, col, kw|自动检测列名与标准字段的映射关系。<br><br>    通过列名关键字匹配，返回建议的 field_mapping 字典。<br>    |
|221|_suggest_dimensions(df, field_mapping)|df, field_mapping, used_cols, suggestions, col, dtype, n_unique, n_total, unique_ratio, sample_vals, numeric_count, v|根据数据自动建议透视维度。<br><br>    策略：找出字符串列（非数值），且唯一值比例适中（分类维度），排除已映射字段。<br>    额外过滤：排除样本值大部分可转为数字的列（实际是数值型但 dtype=object）。<br>    最多返回 5 个维度。<br>    |
|282|_resolve_path(path, work_dir)|path, work_dir|解析路径：绝对路径直接用，相对路径基于 work_dir/input/ 解析|
|291|_mcp_preview(ctx, config_data)|ctx, config_data, work_dir, this_path, resolved_path, this_sheet, xls, sheet_names, target_sheet, df, columns_info, col, dtype_str, n_unique, samples, non_null, auto_mapping, mapping_result, k, v, dim_suggestions, e, s, k, v|preview 模式：读取 Excel 数据，返回列信息和自动检测结果供 AI 判断|
|366|_execute_analysis(ctx, df_this, df_last, field_mapping, dimensions, entity_column, api_settings, thread_count, output_path, silent=False)|ctx, df_this, df_last, field_mapping, dimensions, entity_column, api_settings, thread_count, output_path, silent, ai_available, dimension_results, cost_structure_results, monthly_results, all_findings, dim_count, threshold_count, ai_count, dim_idx, dim, dim_name, dim_column, threshold, revenue_threshold, result, over_threshold_items, over_count, cs_table, monthly_table, pvm_cols, ai_tasks, current_over_idx, row_pos, idx, row, dim_val, ent_label, this_rev, this_cost, this_qty, last_rev, last_cost, last_qty, no_this, no_last, cause, pvm, ent_val, cost_info, k, threading, progress_lock, ai_done_count, _ai_worker, _ai_worker, executor, futures, future, task_idx, ai_result, t, f, e, v, tmp_path, t|核心分析逻辑 — GUI 和 MCP 模式共享。<br><br>    参数:<br>        ctx: GUI 或 MCP 上下文<br>        df_this: 本期 DataFrame（已应用字段映射）<br>        df_last: 上期 DataFrame（已应用字段映射），可为 None<br>        field_mapping: 字段映射字典<br>        dimensions: 维度配置列表<br>        entity_column: 会计主体列名或 None<br>        api_settings: AI API 配置字典<br>        thread_count: AI 并发线程数<br>        output_path: 输出文件路径<br>        silent: True 时抑制 print 输出（MCP 模式）<br><br>    返回:<br>        dict: {<br>            'dimension_results': [(dim_name, DataFrame), ...],<br>            'cost_structure_results': [(dim_name, DataFrame), ...],<br>            'monthly_results': [(dim_name, DataFrame), ...],<br>            'all_findings': [...],<br>            'dim_count': int,<br>            'threshold_count': int,<br>            'ai_count': int,<br>        }<br>    |
|618|_mcp_analyze(ctx, config_data)|ctx, config_data, start_time, work_dir, this_path, this_sheet, last_path, last_sheet, output_path, thread_count, fm_raw, field_mapping, required_fields, missing, opt, dims_raw, dimensions, source, df_this, df_last, auto_detected, detected_info, entity_column, confirmed, mapping_summary, dim_summary, d, settings, api_settings, output_dir, analysis_result, dr, end_time, result, e, f, f, k, v, c, c, k, v, genexpr, genexpr, k, v, d|analyze 模式：解析参数 → 自动检测 → 确认 → 执行分析|
|806|load_config(config_path)|config_path, xls, sheet_names, required_sheets, missing_sheets, df_source, source_row, this_path, this_sheet, last_path, last_sheet, raw_thread_count, thread_count, source_config, df_mapping, all_fields, required_fields, field_mapping, field, matched, col_name, missing_fields, df_dims, dimensions, _, row, enabled, dim_name, dim_col, raw_threshold, dim_threshold, cleaned, val, raw_rev_threshold, dim_rev_threshold, s, f|<br>    读取配置表，返回结构化配置字典。<br><br>    参数:<br>        config_path: 配置表 Excel 路径<br><br>    返回:<br>        {<br>            'source': { 'this_path', 'this_sheet', 'last_path', 'last_sheet', 'thread_count' },<br>            'field_mapping': { '营业收入': str, '营业成本': str, '数量': str, ... },<br>            'dimensions': [ {'name': str, 'column': str, 'threshold': float, 'revenue_threshold': float}, ... ]<br>        }<br><br>    异常:<br>        ValueError: Sheet 缺失或必填字段为空时抛出<br>    |
|950|load_data(source_config)|source_config, this_path, this_sheet, last_path, last_sheet, python_calamine, engine, df_this, df_last|<br>    根据数据源配置加载本期和上期 Excel 数据。<br><br>    参数:<br>        source_config: load_config 返回的 source 字典<br><br>    返回:<br>        (df_this, df_last)，df_last 可为 None<br><br>    异常:<br>        ValueError: 文件不存在时抛出，包含文件路径<br>    |
|990|apply_field_mapping(df, field_mapping)|df, field_mapping, rename_dict, standard_name, source_col, missing_cols, dup_cols, reverse_map, dup, numeric_fields, col, col, k, v|<br>    根据字段映射将数据源列名重命名为标准字段名。<br><br>    参数:<br>        df: 原始 DataFrame<br>        field_mapping: load_config 返回的 field_mapping 字典<br>            键为标准字段名，值为数据源列名（None 表示未映射）<br><br>    返回:<br>        重命名后的 DataFrame（数值列的 NaN 已填充为 0）<br><br>    异常:<br>        ValueError: 数据源列名在 DataFrame 中不存在时抛出，包含所有缺失列名<br>    |
|1048|pivot_by_dimension(df_this, df_last, dim_column, field_mapping, entity_column=None)|df_this, df_last, dim_column, field_mapping, entity_column, group_keys, agg_this, agg_last, result, fill_cols, col|<br>    按单个维度对明细数据进行分组聚合，生成两期对比表。<br><br>    参数:<br>        df_this: 本期明细数据（已完成字段映射）<br>        df_last: 上期明细数据（已完成字段映射），可为 None<br>        dim_column: 透视维度的数据源列名<br>        field_mapping: 字段映射字典<br>        entity_column: 会计主体列名（如已映射）<br><br>    返回:<br>        DataFrame，包含两期对比指标和毛利率变动<br>    |
|1125|mark_threshold(result_df, threshold, revenue_threshold=0)|result_df, threshold, revenue_threshold, _check, _check|<br>    对两期对比表标记毛利率变动超阈值项。<br><br>    参数:<br>        result_df: pivot_by_dimension 返回的 DataFrame<br>            （包含 本期营业收入, 上期营业收入, 毛利率变动 列）<br>        threshold: 毛利率变动阈值（正数）<br>        revenue_threshold: 收入阈值，本期或上期收入需大于此值才标记<br><br>    返回:<br>        添加了 '超阈值标记' 列的 DataFrame<br>    |
|1158|pvm_decompose(row)|row, V_this, V_last, _safe, _safe, R_this, R_last, C_this_total, C_last_total, P_this, P_last, C_this, C_last, delta_P, delta_C, delta_V, price_impact, volume_impact, mix_cost_impact, factors, sorted_factors, max_abs, second_abs, main_cause|<br>    对单行两期对比数据执行 PVM 分解。<br><br>    参数:<br>        row: pd.Series，包含键:<br>            '本期营业收入', '本期营业成本', '本期数量',<br>            '上期营业收入', '上期营业成本', '上期数量'<br><br>    返回:<br>        {<br>            'price_impact': float,<br>            'volume_impact': float,<br>            'mix_cost_impact': float,<br>            'main_cause': str<br>        }<br>    |
|1244|detect_cost_structure(df_this, df_last, dim_column, dim_value, field_mapping, entity_column=None, entity_value=None)|df_this, df_last, dim_column, dim_value, field_mapping, entity_column, entity_value, cost_fields, f, _filter_and_sum, _filter_and_sum, this_sums, this_total_cost, last_sums, last_total_cost, _filter_qty, _filter_qty, this_qty, last_qty, result, this_ratio, last_ratio, this_unit, last_unit, f|<br>    计算料工费占比变动。仅当变动主因涉及成本且料工费字段已映射时调用。<br><br>    参数:<br>        df_this: 本期明细数据（已完成字段映射）<br>        df_last: 上期明细数据（已完成字段映射），可为 None<br>        dim_column: 透视维度列名<br>        dim_value: 该维度的具体值<br>        field_mapping: 字段映射字典<br>        entity_column: 会计主体列名（可选）<br>        entity_value: 会计主体值（可选）<br><br>    返回:<br>        {<br>            '材料费用': {'本期占比': float, '上期占比': float, '变动': float},<br>            '人工费用': {...},<br>            '制造费用': {...},<br>        }<br>        或 None（任一料工费字段未映射时）<br>    |
|1331|build_cost_structure_table(df_this, df_last, dim_column, field_mapping, entity_column=None)|df_this, df_last, dim_column, field_mapping, entity_column, cost_fields, f, group_keys, agg_dict, agg_this, col, agg_dict_last, agg_last, result, _calc_change, _calc_change, out_cols, c|<br>    为一个维度生成成本结构表，显示所有主体对应的料工费占比及单位成本。<br><br>    参数:<br>        df_this: 本期明细数据<br>        df_last: 上期明细数据，可为 None<br>        dim_column: 透视维度列名<br>        field_mapping: 字段映射字典<br>        entity_column: 会计主体列名（可选）<br><br>    返回:<br>        DataFrame 或 None（料工费字段未映射时）<br>    |
|1425|build_monthly_analysis_table(df_this, df_last, dim_column, field_mapping, entity_column=None)|df_this, df_last, dim_column, field_mapping, entity_column, _smart_parse_date, _smart_parse_date, _add_month, _add_month, agg_this, agg_last, dim_keys, all_dim_vals, all_dim_vals_last, months, month_df, skeleton, merge_keys, result, fill_cols, c, out_cols, sort_keys, c, c|<br>    为一个维度生成月度毛利率分析表，列出1-12月的收入、成本、毛利率。<br><br>    参数:<br>        df_this: 本期明细数据（已完成字段映射）<br>        df_last: 上期明细数据（已完成字段映射），可为 None<br>        dim_column: 透视维度列名<br>        field_mapping: 字段映射字典<br>        entity_column: 会计主体列名（可选）<br><br>    返回:<br>        DataFrame 或 None（日期字段未映射时）<br>    |
|1566|build_feature_summary(pvm_result, cost_structure, df_this, df_last, dim_column, dim_value, field_mapping, entity_column=None, entity_value=None)|pvm_result, cost_structure, df_this, df_last, dim_column, dim_value, field_mapping, entity_column, entity_value, sections, pi, vi, mi, total, _pct, _pct, lines, key, info, this_unit, last_unit, unit_change, _filter, _filter, detail_this, detail_last, tmp, n, sorted_df, top, bottom, avg_margin, outliers, show_cols, _, r, parts, c, id_cols, this_keys, last_keys, new_items, lost_items, trend, c, c|为单个超阈值项构建特征摘要文本。|
|1688|ai_analyze_item(feature_summary, api_settings, stop_requested_fn)|feature_summary, api_settings, stop_requested_fn, url, headers, payload, max_retries, attempt, resp, content, _re, json_match, result, reason, procedure, e, genexpr, genexpr, genexpr|<br>    调用 LLM API 分析单个超阈值项。<br><br>    参数:<br>        feature_summary: 特征摘要文本<br>        api_settings: {'base_url': str, 'api_key': str, 'model_name': str}<br>        stop_requested_fn: 检查是否需要停止的回调<br><br>    返回:<br>        {'reason': str, 'procedure': str}<br>    |
|1759|_run_gui(ctx, config_data: 'dict')|ctx, config_data, start_time, analysis_result, config_path, config, source, field_mapping, dimensions, df_this, df_last, entity_key, entity_column, settings, api_settings, thread_count, output_path, dr, e, end_time, dim_count, threshold_count, ai_count|GUI 模式：从 Excel 配置表读取参数执行（保持原有行为不变）|
|1843|_run_mcp(ctx, config_data: 'dict')|ctx, config_data, mode|MCP 模式入口 — 根据 mode 分派到 preview / analyze / auto|
|1856|run(ctx, config_mode='gui', config_data=None)|ctx, config_mode, config_data|模块执行入口 — 支持 GUI 和 MCP 双模式|
|1876|_format_worksheet(ws)|ws, get_column_letter, FILL_THIS, FILL_LAST, amount_keywords, qty_keywords, pct_keywords, headers, col_name, col_idx, col_letter, header_cell, is_amount, is_qty, is_pct, row, cell, cell, genexpr, genexpr, genexpr, genexpr|对工作表应用数字格式和表头颜色。|
|1921|write_output(dimension_results, cost_structure_results=None, monthly_results=None, output_path=None)|dimension_results, cost_structure_results, monthly_results, output_path, writer, dim_name, df, col, has_entity, ordered, extra_cols, insert_pos, i, ec, out_df, cs_df, matched_dim, main_df, cost_rows, dim_col, merge_keys, ai_cols, non_entity_cols, cs_dim_col, sheet_name, entity_col, dim_col_name, other_cols, cs_df_clean, m_df, m_df_clean, c, c, c, dn, df, c, c, c, c|<br>    将分析结果写入 Excel 文件。<br><br>    参数:<br>        dimension_results: list of (dim_name, DataFrame) 元组<br>        cost_structure_results: list of (dim_name, DataFrame) 元组，成本结构表<br>        monthly_results: list of (dim_name, DataFrame) 元组，月度分析表<br>        output_path: 输出文件路径<br><br>    返回:<br>        输出文件路径<br>    |
|2040|Tool.__init__(self)|self, config_path, f||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180054af0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/__init____0x180054910.annotated.c>)|
|_add_month|0x1800386d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_add_month__0x180037e80.annotated.c>)|
|_ai_worker|0x18000aea0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_ai_worker__0x18000ab40.annotated.c>)|
|_auto_detect_columns|0x180003590|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_auto_detect_columns__0x1800033b0.annotated.c>)|
|_calc_change|0x18002fbd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_calc_change__0x18002f8e0.annotated.c>)|
|_check|0x180029a80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_check__0x1800298a0.annotated.c>)|
|_clean_illegal_chars|0x180001b00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_clean_illegal_chars__0x180001910.annotated.c>)|
|_execute_analysis|0x18000c730|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_execute_analysis__0x18000a6c0.asm>)|
|_filter|0x18003c2f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_filter__0x18003c110.annotated.c>)|
|_filter_and_sum|0x18002cfb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_filter_and_sum__0x18002cdd0.annotated.c>)|
|_filter_qty|0x18002dda0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_filter_qty__0x18002dbc0.annotated.c>)|
|_format_worksheet|0x18004c2d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_format_worksheet__0x18004b400.annotated.c>)|
|_get_settings|0x1800031a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_get_settings__0x180002fb0.annotated.c>)|
|_get_work_dir|0x180002920|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_get_work_dir__0x180002730.annotated.c>)|
|_is_stop_requested|0x180002e20|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_is_stop_requested__0x180002c30.annotated.c>)|
|_mcp_analyze|0x180017d90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_mcp_analyze__0x180017440.annotated.c>)|
|_mcp_preview|0x180007a80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_mcp_preview__0x180007860.annotated.c>)|
|_parse_single|0x180035a20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_parse_single__0x180035840.annotated.c>)|
|_pct|0x18003c000|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_pct__0x18003be20.annotated.c>)|
|_resolve_path|0x180007560|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_resolve_path__0x180007330.annotated.c>)|
|_run_gui|0x180045e30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_run_gui__0x180045be0.annotated.c>)|
|_run_mcp|0x18004ab30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_run_mcp__0x18004a8e0.annotated.c>)|
|_safe|0x18002ad00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_safe__0x18002ab10.annotated.c>)|
|_smart_parse_date|0x180037880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_smart_parse_date__0x180035660.annotated.c>)|
|_suggest_dimensions|0x1800055a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/_suggest_dimensions__0x180004fa0.annotated.c>)|
|ai_analyze_item|0x180042c50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/ai_analyze_item__0x180042010.annotated.c>)|
|apply_field_mapping|0x180024480|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/apply_field_mapping__0x180024260.annotated.c>)|
|build_cost_structure_table|0x180031c40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/build_cost_structure_table__0x18002f440.annotated.c>)|
|build_feature_summary|0x18003cbb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/build_feature_summary__0x18003b9a0.annotated.c>)|
|build_monthly_analysis_table|0x180039880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/build_monthly_analysis_table__0x180035280.annotated.c>)|
|detect_cost_structure|0x18002e390|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/detect_cost_structure__0x18002c870.annotated.c>)|
|load_config|0x18001e840|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/load_config__0x18001e660.annotated.c>)|
|load_data|0x180023440|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/load_data__0x180023260.annotated.c>)|
|mark_threshold|0x18002a650|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/mark_threshold__0x1800295b0.annotated.c>)|
|pivot_by_dimension|0x180027e50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/pivot_by_dimension__0x180026510.annotated.c>)|
|pvm_decompose|0x18002b410|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/pvm_decompose__0x18002a930.annotated.c>)|
|run|0x18004b160|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/run__0x18004add0.annotated.c>)|
|write_output|0x18004e640|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__gross_margin_analysis.pyd/write_output__0x18004e1e0.annotated.c>)|

## 独立源代码和验证范围

PVM、阈值和标准字段透视已独立验证。任意字段映射、按月完整流程、AI 分析和成果模板仍待移植。

|已独立 helper|自有代码|
|---|---|
|gross_margin_analysis._clean_illegal_chars|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|gross_margin_analysis.pvm_decompose|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|gross_margin_analysis.mark_threshold|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|
|gross_margin_analysis.pivot_by_dimension|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/accounting.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
