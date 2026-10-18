# bank_paper1 核心还原记录

银行函证表格生成-纸质格式一 — 根据配置表批量生成银行函证（纸质格式一）。支持多表合并、智能匹配、自动对齐。

**本项状态：** 共享 bank_confirmation_core。COM、函证模板表头系统编码和成果导出尚未独立验证。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|是|配置表文件路径（绝对路径或相对路径）|
|output_path|string|否|输出文件路径。不传则使用默认路径。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/bank_paper1.pyd**

【功能名称】银行函证表格生成-纸质格式一
【功能描述】根据配置表批量生成银行函证（纸质格式一）。支持多表合并、智能匹配、自动对齐。
【输入数据】银行函证表格生成-纸质格式一配置表.xlsx
【输出结果】output/询证函模板-纸质格式一.xlsx

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/bank_paper1.pyd|1/1|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__bank_paper1.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__bank_paper1.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__bank_paper1.pyd.json>)|
|modules/bank_confirmation_core.pyd|1/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__bank_confirmation_core.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__bank_confirmation_core.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__bank_confirmation_core.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/bank_paper1.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|34|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, config_file, output_path, work_dir, template_path, origin_path, output_dir||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|run|0x1800015d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_paper1.pyd/run__0x180001230.annotated.c>)|

### modules/bank_confirmation_core.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|7|find_header_row(ws, max_scan_rows=10)|ws, max_scan_rows, row_idx, col_idx, val, headers, c|扫描模板前10行识别系统代码行|
|19|run_core_logic(audit_tool_instance, config_file, template_path, origin_path, output_path)|audit_tool_instance, config_file, template_path, origin_path, output_path, start_time_stamp, wb_fmt, wb_val, sheets_map, sn, tpl_name, pair, e, wb_tpl, tpl_meta, all_ids, ws, h_row, headers, content, ws_f, ws_v, codes, idx, r, v, sorted_ids, total_ids_count, total_render_rows, processed_count, meta, ws_tpl, curr_row, conf, default_values, cd, i, t_id, other_chunks, max_other_lines, filled_codes_for_this_id, default_filled_for_this_id, rows, id_idx, row_data, v_cell, _, global_fixed, id_base_info, render_count, cell, item, v_c, f_c, t, chunk, v_def, f_def, c, c, c, cd, i, c, cd, i, c, cd, i|通用函证生成核心引擎 - 支持单行空值回填逻辑|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|find_header_row|0x180001450|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_confirmation_core.pyd/find_header_row__0x180001170.annotated.c>)|
|run_core_logic|0x180002810|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__bank_confirmation_core.pyd/run_core_logic__0x1800021d0.asm>)|

## 独立源代码和验证范围

共享 bank_confirmation_core。COM、函证模板表头系统编码和成果导出尚未独立验证。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
