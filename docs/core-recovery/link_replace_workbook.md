# link_replace_workbook 核心还原记录

链接替换-文件名替换

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/link_replace_workbook.pyd**

【功能名称】链接替换-文件名替换
【输入数据】input/链接替换-文件名替换.xlsx
【输出结果】直接在原文件中替换链接。
【功能说明】
1. 支持“单一文件路径”或“文件夹路径”。
2. 即使 Excel 处于计算忙碌状态，也会自动等待并重试，减少报错。
3. 自动清理同名冲突文件。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/link_replace_workbook.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__link_replace_workbook.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__link_replace_workbook.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__link_replace_workbook.pyd.json>)|
|modules/_link_replace_helpers.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules___link_replace_helpers.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules___link_replace_helpers.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules___link_replace_helpers.pyd.json>)|
|modules/basic.pyd|3/3|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__basic.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__basic.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__basic.pyd.json>)|
|modules/xlwings_safe.pyd|19/19|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__xlwings_safe.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__xlwings_safe.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__xlwings_safe.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/link_replace_workbook.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|36|expand_tasks_from_config(df)|df, tasks, required_cols, index, row, path, old_text, new_text, root, dirs, files, file, full_path, genexpr, genexpr||
|76|process_single_file_logic(wb, old_text_raw, new_string)|wb, old_text_raw, new_string, get_links, get_links, links, old_list, replaced_flag, old_string|<br>    单个文件的处理逻辑（不包含保存关闭，只负责改内容）<br>    |
|108|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, config_path, df, e, tasks, total_tasks, success_count, fail_count, skip_count, app, i, task, file_path, old_text, new_text, file_name, current_idx, progress, wb, is_repaired, temp_path, op_func, op_func, has_changes, msg, shutil, backup_path, err_str, duration||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c070|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_workbook.pyd/__init____0x18000c070.annotated.c>)|
|expand_tasks_from_config|0x1800018e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_workbook.pyd/expand_tasks_from_config__0x1800012b0.annotated.c>)|
|get_links|0x180003a80|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_workbook.pyd/get_links__0x180003a80.annotated.c>)|
|op_func|0x18000ec20|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_workbook.pyd/op_func__0x180004610.annotated.c>)|
|process_single_file_logic|0x180003b80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_workbook.pyd/process_single_file_logic__0x1800037a0.annotated.c>)|
|run|0x180005950|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__link_replace_workbook.pyd/run__0x180004280.annotated.c>)|

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

### modules/basic.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|6|filter_paths_by_keyword(paths, keyword)|paths, keyword, filtered_paths, path|<br>    根据给定的关键词过滤路径列表。<br>    参数:<br>        paths (list of str): 要筛选的路径列表。<br>        keyword (str): 用于筛选路径的关键字。如果为空，则返回所有路径。<br>    返回:<br>        list: 包含关键字的所有路径列表。<br>    |
|20|find_excel_files(directory)|directory, excel_files, root_dir, file|<br>    递归查找给定目录及其子目录下的所有Excel文件。<br>    参数:<br>        directory (str): 要搜索的根目录路径。<br>    返回:<br>        list: 所有找到的Excel文件的绝对路径列表。<br>    |
|42|update_workbook_links(wb, old_string, new_string)|wb, old_string, new_string, links, link, new_link, e|<br>    更新 Excel 工作簿中外部链接，将指定字符串替换为新字符串。<br><br>    :wb : Excel 工作簿 ，xlwings 中的对象<br>    :param old_string: 要替换的字符串<br>    :param new_string: 替换为的新字符串<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|filter_paths_by_keyword|0x180001230|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__basic.pyd/filter_paths_by_keyword__0x180001000.annotated.c>)|
|find_excel_files|0x180001720|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__basic.pyd/find_excel_files__0x180001540.annotated.c>)|
|update_workbook_links|0x180002340|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__basic.pyd/update_workbook_links__0x180002060.annotated.c>)|

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
