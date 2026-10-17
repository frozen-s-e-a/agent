# address_split 核心还原记录

函证地址拆分成省市区 — 基于 jionlp 库，批量解析地址信息。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|address_column|string|是|Excel列名: Excel模式专用：指定地址所在的列名（默认为第一列）|
|address_list|string|是|直接查询地址: 直接模式专用：一个地址字符串，或多个地址组成的列表|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/address_split.pyd**

【功能名称】函证地址拆分成省市区
【功能描述】
基于 jionlp 库，批量解析地址信息。
可提取：省、市、区、详细地址、完整地址（去重）、电话号码等信息。
支持两种模式：
1. Excel文件处理：读取指定文件中的地址列。
2. 直接查询：【AI审计助手】中直接输入一个或多个地址进行查询。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/address_split.pyd|4/4|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__address_split.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__address_split.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__address_split.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/address_split.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|47|get_planning_guide()|||
|59|parse_single_address(address_text)|address_text, address_str, res, province, city, county, detail, full_address, phones, phone, e|<br>    封装单条地址解析逻辑，增加容错<br>    返回: (result_dict, error_msg)<br>    |
|115|save_to_excel(data_list, output_path)|data_list, output_path, df_out, cols, c|<br>    保存结果到 Excel<br>    |
|134|print_summary(start_time, total, success, fail, output_path)|start_time, total, success, fail, output_path, duration|打印执行摘要|
|149|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, work_dir, output_dir, output_excel_path, address_list, input_path, full_input_path, df, address_col_name, candidates, raw_addresses, e, results, success_count, fail_count, total, i, address_val, res_dict, error_msg, c, x|<br>    主执行函数<br>    <br>    参数:<br>        core: 核心实例，包含 current_work_dir 和 stop_requested<br>        config_mode: 'excel' 或 'direct'<br>        config_data: 直接模式下的参数字典<br>    <br>    返回:<br>        成功: {"status": "success", "msg": "...", "output_file": "..."}<br>        失败: 错误信息字符串<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800084c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__address_split.pyd/__init____0x1800082d0.annotated.c>)|
|parse_single_address|0x1800015a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__address_split.pyd/parse_single_address__0x1800013c0.annotated.c>)|
|run|0x1800045b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__address_split.pyd/run__0x180004220.annotated.c>)|
|save_to_excel|0x180002e20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__address_split.pyd/save_to_excel__0x180002c00.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
