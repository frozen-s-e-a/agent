# ai_formula_filler 核心还原记录

AI 智能公式填充 🎯

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|base_url|string|否|AI API Base URL|
|api_key|string|否|AI API Key|
|model_name|string|否|模型名称|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/ai_formula_filler.pyd**

【功能名称】AI 智能公式填充 🎯
【输入数据】input/公式填充配置表.xlsx
【输出结果】直接修改原 Excel 文件
【功能说明】
本工具利用 AI 自动为审计底稿生成勾稽公式，实现“披露表”与“明细表”的自动化联动：
1. 🔗 **自动勾稽关联**：根据项目名称，自动生成从“披露表”到“明细表”的取数公式。
2. ⚙️ **灵活配置模式**：在配置表中自定义公式类型，并可指定是“填充首行”还是“逐行匹配”。
3. 🛡️ **智能精准写入**：自动识别表格数据行，保护表头，并自动修正跨 Sheet 引用的路径错误（防 #REF!）。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/ai_formula_filler.pyd|17/17|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_formula_filler.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_formula_filler.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_formula_filler.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/ai_formula_filler.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|60|check_api_connection(client, model_name)|client, model_name, e||
|70|extract_json_from_text(text)|text, start_idx, end_idx||
|82|find_excel_files(path_val)|path_val, files, root, dirs, filenames, filename||
|100|check_has_border(cell)|cell, sides, side||
|107|has_bottom_border(ws, row, col_start, col_end)|ws, row, col_start, col_end, border_count, bottom_style_count, c, cell||
|119|trim_table_bottom(ws, table_rect)|ws, table_rect, min_r, max_r, min_c, max_c, current_bottom||
|131|find_tables_by_borders(ws, start_row, end_row)|ws, start_row, end_row, max_col, scan_end_row, bordered_cells, row, cell, tables, visited, directions, sorted_cells, r, c, queue, min_r, max_r, min_c, max_c, curr_r, curr_c, dr, dc, nr, nc, raw_rect, refined_rect||
|179|get_merged_value(ws, row, col)|ws, row, col, cell, range_||
|187|get_writable_cell_position(ws, row, col)|ws, row, col, cell, range_|<br>    获取可写入的单元格位置。<br>    如果目标单元格是合并单元格，返回合并区域左上角的坐标；否则返回原坐标。<br>    返回: (row, col) 元组<br>    |
|200|get_flattened_headers(ws, start_row, end_row, min_c, max_c)|ws, start_row, end_row, min_c, max_c, headers, c, parts, r, val, val_str, col_letter, full_name||
|214|detect_header_depth_simple(ws, rect)|ws, rect, row_start, row_end, col_start, col_end, max_merge_depth, merged_range, merge_depth, max_allowed, second_row, has_data, c, cell, val|<br>    基于合并单元格检测表头深度<br>    核心逻辑：表头区域通常有纵向合并单元格，找到最深的合并单元格底部即为表头结束行<br>    |
|269|get_source_table_info_bfs(ws)|ws, tables, main_table, header_depth, header_start, header_end, data_start, data_end, headers, valid_headers, total_info, scan_limit, r, val, k, v, k, v, genexpr, genexpr||
|302|_build_system_prompt(target_context, source_context, is_fill_down_mode, subject_name, data_start_row, sheet_list)|target_context, source_context, is_fill_down_mode, subject_name, data_start_row, sheet_list, mode_desc, sheet_list_str, s||
|338|generate_formulas_with_ai(client, model, user_business_logic, target_context, source_context, is_fill_down_mode, subject_name, data_start_row, sheet_list)|client, model, user_business_logic, target_context, source_context, is_fill_down_mode, subject_name, data_start_row, sheet_list, sys_prompt, user_prompt, completion, content, e||
|358|process_single_file(file_path, config_row, logic_config, client, ctx, global_model)|file_path, config_row, logic_config, client, ctx, global_model, stats, file_name, subject_name, wb, e, target_kwd, target_sheets, all_potential_sheets, link_kwd, source_info_list, potentials_for_structure, s, info, source_context_str, f_type, type_cfg, user_logic, is_fill_down, idx_str, target_indices, parts, part, start, end, start_num, end_num, modified, sh_name, ws, all_tables, valid_count, rect, h_depth, header_row, header_end, data_start, end_r, t_headers, clean_headers, row_preview, p_col, first_val, scan_limit, r, val, target_ctx, formulas, raw_resp, cnt, last_row_val, is_total, drag_limit, base_formulas, addr, f, clean, c, col_l, wr, wc, r_fill, wr_fill, wc_fill, wr_total, wc_total, s, s, s, k, v, genexpr, genexpr||
|553|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, work_dir, cfg_path, settings, base_url, api_key, global_model, df_cfg, df_pmt, logic_config, _, r, f_type, prompt, fill_flag, is_fill, used_types, defined_types, missing_types, t, e, client, total_stats, i, row, task_files, f_path, s||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800210a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/__init____0x180020eb0.annotated.c>)|
|_build_system_prompt|0x18000f3f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/_build_system_prompt__0x18000eff0.annotated.c>)|
|check_api_connection|0x180001790|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/check_api_connection__0x180001570.annotated.c>)|
|check_has_border|0x180004550|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/check_has_border__0x180004360.annotated.c>)|
|detect_header_depth_simple|0x18000ac00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/detect_header_depth_simple__0x18000a9e0.annotated.c>)|
|extract_json_from_text|0x180002510|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/extract_json_from_text__0x180002330.annotated.c>)|
|find_excel_files|0x1800030a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/find_excel_files__0x180002ec0.annotated.c>)|
|find_tables_by_borders|0x1800061a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/find_tables_by_borders__0x180005ec0.annotated.c>)|
|generate_formulas_with_ai|0x180010290|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/generate_formulas_with_ai__0x18000fec0.annotated.c>)|
|get_flattened_headers|0x180009d90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/get_flattened_headers__0x1800099c0.annotated.c>)|
|get_merged_value|0x1800088b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/get_merged_value__0x1800085d0.annotated.c>)|
|get_source_table_info_bfs|0x18000ccd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/get_source_table_info_bfs__0x18000c4c0.annotated.c>)|
|get_writable_cell_position|0x180009340|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/get_writable_cell_position__0x180009060.annotated.c>)|
|has_bottom_border|0x180004e40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/has_bottom_border__0x180004b30.annotated.c>)|
|process_single_file|0x180011d90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/process_single_file__0x180011360.annotated.c>)|
|run|0x18001bec0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/run__0x18001bb30.annotated.c>)|
|trim_table_bottom|0x1800059b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_formula_filler.pyd/trim_table_bottom__0x180005780.annotated.c>)|

### modules/ai_utils.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|5|safe_chat_create(client, **kwargs)|client, kwargs, threading, result_holder, error_holder, _do_call, _do_call, t, e, APITimeoutError, APIConnectionError, error_code, err_str, t2, genexpr, genexpr|<br>    兼容各平台的 chat.completions.create 封装。<br>    - 通过 extra_body 传递 enable_thinking=False 关闭思考模式<br>    - 平台不支持时自动回退<br>    - 内置硬超时保护，防止请求无限卡死<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_do_call|0x180001610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/_do_call__0x180001360.annotated.c>)|
|safe_chat_create|0x180002640|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/safe_chat_create__0x180001000.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
