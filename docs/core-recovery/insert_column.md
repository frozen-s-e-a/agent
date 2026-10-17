# insert_column 核心还原记录

插入列工具 — 用于在 Excel 表中指定位置插入一列并填充固定值。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件路径: 要处理的 Excel 文件路径（配置表中每行一个文件）|
|insert_position|string|是|插入列位置: 插入位置，可以是列字母（如 A）或数字索引（如 1）|
|column_name|string|是|插入列名: 新列的列名|
|fill_value|string|是|插入值: 填充到新列的固定值|
|sheet_name|string|是|指定表: 工作表名称，留空则使用第一张表|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/insert_column.pyd**

【功能名称】插入列工具
【功能描述】
用于在 Excel 表中指定位置插入一列并填充固定值。
1. 支持指定插入位置（列字母或数字索引）
2. 支持自定义列名和填充值
3. 支持指定工作表（留空则使用第一张表）
4. 使用 xlwings 库，保留文件中所有表和格式
5. 自动检查列名是否已存在
6. 支持批量处理多个文件
7. 直接修改原文件，请操作前先备份数据

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/insert_column.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__insert_column.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__insert_column.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__insert_column.pyd.json>)|
|modules/xlwings_safe.pyd|19/19|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__xlwings_safe.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__xlwings_safe.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__xlwings_safe.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/insert_column.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|67|get_planning_guide()|||
|89|log(msg)|msg||
|92|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|106|_letter_to_number(column_letter)|column_letter, number, char|将Excel列字母（如'A', 'B', 'AA'）转换为数字索引（1, 2, 27）|
|114|_number_to_letter(column_number)|column_number, result|将Excel列数字索引（如1, 2, 27）转换为列字母（'A', 'B', 'AA'）|
|123|_insert_column_with_xlwings(file_path, column_number, column_name, fill_value, sheet_name='')|file_path, column_number, column_name, fill_value, sheet_name, app, wb, sheet, column_letter, insert_col_idx, header_range, header_values, last_row, e|<br>    使用 xlwings 插入列，同时保留文件中所有表<br>    <br>    参数:<br>        file_path: 文件路径<br>        column_number: 列号（数字或字母）<br>        column_name: 插入列的名称<br>        fill_value: 插入列的默认值<br>        sheet_name: 表名，默认为空字符串时使用第一张表<br>    <br>    返回:<br>        处理结果消息<br>    |
|206|_process_single_file(core, file_path, insert_position, column_name, fill_value, sheet_name)|core, file_path, insert_position, column_name, fill_value, sheet_name|处理单个文件|
|216|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, file_rules, cfg_rel_path, full_cfg_path, df_config, _, row, e, results, i, rule, file_path, insert_position, column_name, fill_value, sheet_name, err_msg, full_path, f_name, progress, res_msg, msg||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c280|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_column.pyd/__init____0x18000c090.annotated.c>)|
|_insert_column_with_xlwings|0x180003870|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_column.pyd/_insert_column_with_xlwings__0x180003490.annotated.c>)|
|_letter_to_number|0x1800025a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_column.pyd/_letter_to_number__0x1800023b0.annotated.c>)|
|_number_to_letter|0x180002d80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_column.pyd/_number_to_letter__0x180002b90.annotated.c>)|
|_process_single_file|0x180006710|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_column.pyd/_process_single_file__0x180006310.annotated.c>)|
|run|0x180006e80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__insert_column.pyd/run__0x180006af0.annotated.c>)|

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

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
