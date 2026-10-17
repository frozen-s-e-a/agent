# link_replace_range 核心还原记录

链接替换-单元格区域替换

**本项状态：** A1 范围尺寸解析已验证；COM 外链替换及 Excel 重算未移植。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/link_replace_range.pyd**

【功能名称】链接替换-单元格区域替换
【输入数据】input/链接替换-单元格区域替换.xlsx
【输出结果】直接在原文件中写入跨工作簿公式。
【功能说明】
本工具用于批量搭建底稿之间的“取数公式”（相当于批量执行“复制->选择性粘贴->粘贴链接”）。
1. **批量取数**：根据配置表，自动将“原底稿”指定区域的数据，以公式形式链接到“目标底稿”中。
2. **极速模式**：针对“一张表取几十个文件”或“几十个文件取一张表”的场景做了特别优化，拒绝反复开关文件，速度极快。
3. **防错预警**：运行前自动检查“要填的坑”和“原来的坑”行/列数是否一致，防止数据错位。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/link_replace_range.pyd|8/8|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__link_replace_range.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__link_replace_range.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__link_replace_range.pyd.json>)|
|modules/_link_replace_helpers.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules___link_replace_helpers.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules___link_replace_helpers.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules___link_replace_helpers.pyd.json>)|
|modules/xlwings_safe.pyd|19/19|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__xlwings_safe.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__xlwings_safe.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__xlwings_safe.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/link_replace_range.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|39|read_config_grouped(df)|df, grouped_info, required_cols, index, row, target_path, origin_path, task_data, genexpr, genexpr|读取配置并按 [目标文件][源文件] 分组|
|74|parse_range(cell_range)|cell_range, pattern, match, start_col, start_row, end_col, end_row, col_to_num, col_to_num, rows, cols|解析区域返回 (rows, cols)|
|95|pre_flight_check(grouped_info)|grouped_info, error_count, target_path, origin_group, origin_path, tasks, task, tr, tc, or_rows, oc, e|预检维度|
|117|process_tasks_for_pair(wb_target, wb_origin, tasks, origin_path_str)|wb_target, wb_origin, tasks, origin_path_str, t_sheets, o_sheets, folder_path, file_name, task, t_sheet_name, o_sheet_name, target_rng_obj, origin_rng_obj, rows, cols, formula_matrix, r, row_formulas, c, origin_addr, formula, write_formula, write_formula, e, s, s|<br>    处理 [Target <-> Origin] 这一对文件下的所有任务<br>    |
|167|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, config_path, df, e, grouped_info, total_targets, success_targets, app, i, target_path, origin_group, target_name, wb_target, total_origins, j, origin_path, tasks, origin_name, wb_origin, duration||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000fd90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/__init____0x18000fd90.annotated.c>)|
|col_to_num|0x180003520|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/col_to_num__0x180003330.annotated.c>)|
|parse_range|0x180003ae0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/parse_range__0x180003150.annotated.c>)|
|pre_flight_check|0x180004b50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/pre_flight_check__0x180004970.annotated.c>)|
|process_tasks_for_pair|0x1800072a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/process_tasks_for_pair__0x180006ef0.annotated.c>)|
|read_config_grouped|0x1800018d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/read_config_grouped__0x1800012a0.annotated.c>)|
|run|0x180009fd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/run__0x180009c40.annotated.c>)|
|write_formula|0x180007200|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_range.pyd/write_formula__0x180007200.annotated.c>)|

### modules/_link_replace_helpers.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|6|retry_api_call(func, *args, retries=10, delay=2, **kwargs)|func, retries, delay, args, kwargs, last_error, attempt, e, error_msg||
|21|clean_zombie_workbook(app, file_name)|app, file_name, file_name_lower, target_bk, bk, _, current_books, b||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|clean_zombie_workbook|0x1800023f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules___link_replace_helpers.pyd/clean_zombie_workbook__0x1800020c0.annotated.c>)|
|retry_api_call|0x180001510|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules___link_replace_helpers.pyd/retry_api_call__0x180001000.annotated.c>)|

### modules/xlwings_safe.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|27|_get_safe_dir()|base, safe_dir|返回 macOS 安全目录路径，Windows 返回 None。|
|44|_SafeBook.__init__(self, wb, original_path=None)|self, wb, original_path||
|48|_SafeBook.__getattr__(self, name)|self, name||
|51|_SafeBook.__setattr__(self, name, value)|self, name, value||
|57|_SafeBook.save(self, path=None)|self, path, target, safe_dir, tmp||
|86|_SafeBook.close(self)|self, safe_path||
|100|_SafeBooks.__init__(self, app)|self, app||
|103|_SafeBooks.open(self, path, **kwargs)|self, path, kwargs, safe_dir, basename, safe_path, wb||
|116|_SafeBooks.add(self)|self, wb||
|120|_SafeBooks.__getattr__(self, name)|self, name||
|131|SafeApp.__init__(self, **kwargs)|self, kwargs||
|143|SafeApp.__getattr__(self, name)|self, name||
|146|SafeApp.__setattr__(self, name, value)|self, name, value||
|152|SafeApp.quit(self)|self||
|156|SafeApp.kill(self)|self||
|160|SafeApp.__enter__(self)|self||
|163|SafeApp.__exit__(self, *args)|self, args||
|171|_cleanup()|safe_dir, prefix, f|清理本进程在安全目录中的临时文件。|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__enter__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__enter____0x180008740.annotated.c>)|
|__exit__|0x180008d60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__exit____0x1800089f0.annotated.c>)|
|__getattr__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180001bc0.annotated.c>)|
|__getattr__|0x180006750|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180006430.annotated.c>)|
|__getattr__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180007520.annotated.c>)|
|__init__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800016d0.annotated.c>)|
|__init__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800049c0.annotated.c>)|
|__init__|0x180006be0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800068a0.annotated.c>)|
|__setattr__|0x1800022d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__setattr____0x180001f60.annotated.c>)|
|__setattr__|0x180007c30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__setattr____0x1800078c0.annotated.c>)|
|_cleanup|0x18000c8a0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/_cleanup__0x180009130.annotated.c>)|
|_get_safe_dir|0x18000cb80|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/_get_safe_dir__0x180001030.annotated.c>)|
|add|0x1800061e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/add__0x180005f30.annotated.c>)|
|api|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/api__0x1800071f0.annotated.c>)|
|books|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/books__0x180006f10.annotated.c>)|
|kill|0x180008550|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/kill__0x1800082a0.annotated.c>)|
|open|0x180005120|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/open__0x180004d50.annotated.c>)|
|quit|0x1800080b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/quit__0x180007e00.annotated.c>)|
|save|0x180002890|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/save__0x180002500.annotated.c>)|

## 独立源代码和验证范围

A1 范围尺寸解析已验证；COM 外链替换及 Excel 重算未移植。

|已独立 helper|自有代码|
|---|---|
|link_replace_range.parse_range|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
