import {skillContext} from '../skills/loader.mjs';
import {runLegacyTool} from './legacy-bridge.mjs';
const def=(name,description,properties,required=[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
const source={type:'string',enum:['project','attachments']};
const file={type:'string',description:'当前项目或已发送附件的文件引用'};
const params={type:'object',additionalProperties:true,description:'原版 MCP 工作流参数；需依据实际结构填写'};
export const mcpToolDefinitions=[
 def('list_skills','列出已迁移的原版 Skills 及触发词。',{}),
 def('load_skill','加载某个已迁移 Skill 的工作流参考。',{name:{type:'string'}},['name']),
 def('jet_test_inspect','原版 JET inspect 兼容入口：读取真实文件结构后给出字段和样本。',{source,file,parameters:params},['source','file']),
 def('jet_test_execute','原版 JET execute 兼容入口：运行当前内置 JET 规则并返回真实任务结果。',{source,files:{type:'array',items:file,minItems:1,maxItems:200},parameters:params,mode:{type:'string',enum:['auto','local-light','local-batch']}},['source','files','parameters']),
 def('monthly_preview','原版月间分析预览兼容入口：读取真实文件结构。',{source,file,parameters:params},['source','file']),
 def('monthly_detect_structure','原版月间分析结构检测兼容入口：先返回有限结构样本，不能代替用户确认。',{source,file,parameters:params},['source','file']),
 def('monthly_execute','原版月间分析执行兼容入口：用户明确确认科目和字段后运行本地工具。',{source,files:{type:'array',items:file,minItems:1,maxItems:200},parameters:params,mode:{type:'string',enum:['auto','local-light','local-batch']}},['source','files','parameters']),
 def('monthly_ai_analysis','原版月间 AI 分析入口。当前等待完整原版算法迁移，不返回模拟结论。',{result:{type:'object'}},['result']),
 def('cicpa_query','原版注协工商 MCP 入口。需要用户配置外部 MCP 服务和有效 Cookie；当前不会伪造工商数据。',{query_mode:{type:'string',enum:['search','detail','export','subsidiary','check_cookies']},company_name:{type:'string'},org_id:{type:'string'},cookie_json:{type:'string'}},['query_mode']),
 def('related_party','原版关联方 MCP 入口。需要 cicpa_query 导出的工商数据和外部 MCP 服务；当前不会伪造检测结果。',{audit_target:{type:'string'},data_dir:{type:'string'},customers:{type:'string'},suppliers:{type:'string'},auto_subsidiary_threshold:{type:'number'}},['audit_target','data_dir']),
 def('detailed_table_inspect','原版明细表数据源检查入口；当前仅提供安全的结构预览兼容。',{source,file,parameters:params},['source','file']),
 def('detailed_table_inspect_template','原版明细表模板检查入口；需要明确模板文件。',{source,file,parameters:params},['source','file']),
 def('detailed_table_save_config','原版明细表配置保存入口；当前待完整模板迁移。',{config:{type:'object'}},['config']),
 def('detailed_table_validate','原版明细表配置校验入口；当前待完整模板迁移。',{config:{type:'object'}},['config']),
 def('detailed_table_generate','原版明细表生成入口；当前待完整模板迁移。',{config:{type:'object'}},['config'])
];
export const migratedMcpCatalog=[
 {name:'list_skills',status:'migrated',source:'skills'}, {name:'load_skill',status:'migrated',source:'skills'},
 {name:'jet_test_inspect',status:'mapped',source:'jet-test'}, {name:'jet_test_execute',status:'mapped',source:'jet-test'},
 {name:'monthly_preview',status:'mapped',source:'monthly-analysis-mcp'}, {name:'monthly_detect_structure',status:'mapped',source:'monthly-analysis-mcp'}, {name:'monthly_execute',status:'mapped',source:'monthly-analysis-mcp'},
 {name:'monthly_ai_analysis',status:'pending',source:'monthly-analysis-mcp'}, {name:'cicpa_query',status:'pending_external',source:'cicpa-query'}, {name:'related_party',status:'pending_external',source:'related-party-identification'},
 {name:'detailed_table_inspect',status:'mapped_structure_only',source:'detailed-table-generation'}, {name:'detailed_table_inspect_template',status:'pending',source:'detailed-table-generation'}, {name:'detailed_table_save_config',status:'pending',source:'detailed-table-generation'}, {name:'detailed_table_validate',status:'pending',source:'detailed-table-generation'}, {name:'detailed_table_generate',status:'pending',source:'detailed-table-generation'}
];
export async function executeMcpCompat(name,args,{local,skills}={}){
 const legacyMap={jet_test_inspect:'modules.jet_test.jet_test_inspect',jet_test_execute:'modules.jet_test.jet_test_execute',monthly_preview:'modules.monthly_analysis.monthly_preview',monthly_detect_structure:'modules.monthly_analysis.monthly_detect_structure',monthly_execute:'modules.monthly_analysis.monthly_execute',monthly_ai_analysis:'modules.monthly_analysis.monthly_ai_analysis',cicpa_query:'modules.cicpa_query',related_party:'modules.related_party',detailed_table_inspect:'modules.detailed_table.detailed_table_inspect',detailed_table_inspect_template:'modules.detailed_table.detailed_table_inspect_template',detailed_table_save_config:'modules.detailed_table.detailed_table_save_config',detailed_table_validate:'modules.detailed_table.detailed_table_validate',detailed_table_generate:'modules.detailed_table.detailed_table_generate'};
 if(legacyMap[name]){const config={...(args.parameters||{}),...args};delete config.source;delete config.file;delete config.files;return runLegacyTool({module:legacyMap[name],config});}
 if(name==='list_skills')return {ok:true,skills:skills.map(s=>({name:s.name,description:s.description,triggers:s.triggers,status:'loaded'}))};
 if(name==='load_skill'){const s=skills.find(x=>x.name===args.name||x.id===args.name);if(!s)throw Error('Skill 不存在');return {ok:true,name:s.name,description:s.description,content:s.text.slice(0,30000),note:'Skill 是工作流参考，不会获得超出应用权限的能力。'};}
 if(name==='jet_test_inspect'||name==='monthly_preview'||name==='monthly_detect_structure'||name==='detailed_table_inspect'||name==='detailed_table_inspect_template')return local.execute('preview_local_file',{source:args.source,file:args.file,parameters:args.parameters||{}});
 if(name==='jet_test_execute'||name==='monthly_execute'){return local.execute('run_audit_tool',{source:args.source,tool:name.startsWith('jet_')?'jet_test':'monthly_analysis',files:args.files,parameters:args.parameters||{},mode:args.mode||'auto'});}
 if(['cicpa_query','related_party'].includes(name))return {ok:false,error:'原版外部 MCP 尚未连接：请在设置中配置对应 MCP 服务和凭据。当前配置只显示能力登记，不返回模拟工商或关联方结论。',name};
 return {ok:false,error:'该原版 MCP 工具的专有二进制算法尚未迁移完成，不能用占位结果冒充已执行。',name};
}
