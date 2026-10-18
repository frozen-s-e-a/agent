# insert_footnote_comments 核心还原记录

插附注批注 (王建彬工具适配版) 🖊️

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/insert_footnote_comments.pyd**

【功能名称】插附注批注 (王建彬工具适配版) 🖊️
【适用场景】首次承接项目、IPO项目等“先有Excel数据，后排版Word附注”的逆向作业场景。
【核心价值】
1. 🔗 逆向适配：将现有的普通Excel底稿，批量转化为“王建彬附注工具”可识别的格式。
2. ⚡ 自动化锚点：免去人工逐个插入“表首/表尾:_jds编号”的繁琐工作。
3. 📂 批量处理：支持直接指定文件夹，自动扫描内部所有Excel文件。
【输入配置】input/插附注批注配置表.xlsx (支持清除旧批注选项)

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/insert_footnote_comments.pyd|9/9|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__insert_footnote_comments.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__insert_footnote_comments.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__insert_footnote_comments.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/insert_footnote_comments.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|31|check_has_border(cell)|cell, sides, side|判断单元格是否有可见边框|
|41|has_bottom_border(ws, row, col_start, col_end)|ws, row, col_start, col_end, border_count, bottom_style_count, c, cell|检查某一行在指定列范围内，是否具有实质性的底部边框|
|55|trim_table_bottom(ws, table_rect)|ws, table_rect, min_r, max_r, min_c, max_c, current_bottom|削底逻辑：剔除表格下方无底框的TB/核对行|
|68|find_tables_by_borders(ws, start_row, end_row)|ws, start_row, end_row, max_col, scan_end_row, bordered_cells, row, cell, tables, visited, directions, sorted_cells, r, c, queue, min_r, max_r, min_c, max_c, curr_r, curr_c, dr, dc, nr, nc, raw_rect, refined_rect|使用连通域算法(BFS)识别表格区域|
|112|resolve_conflicts(tables, conflict_choice)|tables, conflict_choice, choice, final_tables, processed_indices, sorted_tables, i, current, conflict_group, j, compare, overlap_start, overlap_end|处理左右冲突|
|141|clear_existing_comments(ws, start_row, end_row)|ws, start_row, end_row, actual_end, count, row, cell|清除旧批注|
|153|find_excel_files(path_val)|path_val, files, root, dirs, filenames, filename|<br>    输入一个路径（文件或文件夹），返回所有Excel文件的路径列表。<br>    |
|178|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, work_dir, config_path, wb_config, ws_config, e, rule_configs, row, total_files_processed, idx, cfg, path_raw, target_sheet, conflict_mode, clear_flag, target_files, f_idx, file_path, file_name, wb, ws, start_row, req_end_row, cleared_count, raw_tables, final_tables, jds_counter, tbl||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000e250|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/__init____0x18000e250.annotated.c>)|
|check_has_border|0x180001470|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/check_has_border__0x180001280.annotated.c>)|
|clear_existing_comments|0x180006cc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/clear_existing_comments__0x1800069e0.annotated.c>)|
|find_excel_files|0x180007690|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/find_excel_files__0x1800074b0.annotated.c>)|
|find_tables_by_borders|0x180003110|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/find_tables_by_borders__0x180002e30.annotated.c>)|
|has_bottom_border|0x180001d60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/has_bottom_border__0x180001a50.annotated.c>)|
|resolve_conflicts|0x180005800|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/resolve_conflicts__0x1800051a0.annotated.c>)|
|run|0x180008fa0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/run__0x180008950.annotated.c>)|
|trim_table_bottom|0x180002920|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_footnote_comments.pyd/trim_table_bottom__0x1800026f0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
