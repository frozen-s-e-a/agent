// The same input contract drives the form and server validation. IDs are exact.
import {templates} from './templates.mjs';
export const TABLE_EXTENSIONS=['.csv','.tsv','.xlsx','.xlsm'];
const EXCEL=['.xlsx','.xlsm'];
export const INPUT_PATH_KEYS=new Set(['file','files','file_path','file_paths','config_file','config_files','work_dir','template_dir','data_dir','result_file','this_year_file','last_year_file','gl_path','bank_path','folder','folder_path','directory','target_path','source_paths','this_data_path','last_data_path']);
export const OUTPUT_PATH_KEYS=new Set(['output_dir','output_path']);
const directories=new Set(['work_dir','template_dir','data_dir','folder','folder_path','directory']);
const textOnly=new Set(['announcement','cicpa_query','currency','ipo_bj','ipo_sh','ipo_sz','address_split','id_card']);
const readOnly=new Set(['monthly_preview','monthly_detect_structure','jet_test_inspect','tool_preview','detailed_table_inspect','detailed_table_inspect_template','detailed_table_validate','cicpa_query','currency','announcement','ipo_bj','ipo_sh','ipo_sz','address_split','id_card','qcc_processor','bank_flow','bankflowmerge','related_party','paper_verify']);
const labels={file_path:'数据源',config_file:'处理配置表',work_dir:'工作目录',template_dir:'底稿模板目录',data_dir:'工商资料目录',this_year_file:'本期序时账',last_year_file:'上期序时账',result_file:'月间分析结果',gl_path:'序时账',bank_path:'银行流水',this_data_path:'本期收入成本明细',last_data_path:'上期收入成本明细',folder_path:'资料目录',directory:'处理目录',source_paths:'数据源',file_paths:'银行流水文件',output_path:'输出文件',output_dir:'输出目录',api_key:'模型密钥',cookie_json:'服务授权 Cookie'};
const renamed={add_column:'合并同名列',select_column:'按配置提取 Excel 列',text_match:'按配置提取匹配文本',voucher_check:'批量凭证检查',tool_preview:'科目余额表预览',tool_execute:'科目余额表处理',jet_test_inspect:'预览 JET 数据',jet_test_execute:'执行 JET 规则',monthly_execute:'本期与上期月间分析',bank_flow:'序时账与流水双向核对',bankflowmerge:'按账户汇集银行流水',gross_margin_analysis:'收入成本与毛利率分析',currency:'查询汇率'};
function extensionContract(name,builtin){
 if(builtin){if(name==='file_inventory')return {extensions:null,format:'任意文件（只读取文件名称、大小与哈希）'};if(name==='pdf_text')return {extensions:['.pdf'],format:'PDF 文字层；扫描件请使用纸质信息核对'};if(name==='link_extract')return {extensions:EXCEL,format:'XLSX / XLSM'};return {extensions:TABLE_EXTENSIONS,format:'CSV / TSV / XLSX / XLSM；不支持 XLS、XLSB、ODS'};}
 if(textOnly.has(name))return {extensions:[],format:'直接填写查询条件，无需输入文件'};
 if(name==='qcc_processor')return {extensions:['.docx'],format:'DOCX 企查查报告目录'};
 if(name==='photo_rename')return {extensions:['.png','.jpg','.jpeg','.webp','.bmp','.tif','.tiff'],format:'图片目录；具体图片解码兼容性需由工具验证',formatVerified:false};
 if(name==='paper_verify'||name==='info_extract')return {extensions:name==='paper_verify'?['.pdf','.png','.jpg','.jpeg','.webp','.tif','.tiff']:['.pdf','.docx','.xlsx','.xlsm','.txt','.png','.jpg','.jpeg','.webp'],format:'文档或图片；当前工具未完整声明后缀兼容性，先用副本验证',formatVerified:false};
 if(name==='detailed_table_save_config'||name==='detailed_table_validate')return {extensions:['.json',...EXCEL],format:'工作目录 config/ 下 JSON 配置；数据源和模板使用 XLSX / XLSM',formatVerified:false};
 if(name.startsWith('monthly_')&&name!=='monthly_ai_analysis')return {extensions:['.csv',...EXCEL],format:'CSV / XLSX / XLSM（接口声明 Excel/CSV，Excel 具体后缀待逐项验证）',formatVerified:false};
 return {extensions:EXCEL,format:'客户端接受 XLSX / XLSM；原工具未完整声明后缀范围，请使用对应模板',formatVerified:false};
}
export function buildCatalog(builtin,legacy){
 return [...builtin.map(t=>{
  const extra=!['pdf_text','link_extract','file_inventory'].includes(t.id)?[{key:'headerRow',label:'表头行',type:'integer',default:1},{key:'sheets',label:'工作表名称',help:'多个名称用逗号分隔；留空读取全部工作表',type:'string'},{key:'encoding',label:'CSV 编码',type:'string',enum:['utf-8-sig','utf-8','gb18030'],default:'utf-8-sig'}]:[];
  const jet=t.id==='jet_test'?[{key:'mapping',label:'JET 标准字段映射',type:'string',kind:'json',help:'将标准字段映射到源表列名；同名字段可以不填。',default:'{}'},{key:'keys',label:'凭证分组列',type:'string',help:'借贷不平规则需要完整凭证键，例如公司、凭证日期、凭证编号'}]:[];
  return {...t,engine:'builtin',fields:[...t.fields.map(f=>({...f,type:'string'})),...extra,...jet],contract:{...extensionContract(t.id,true),inputMode:'files',mutates:false}};
 }),...legacy.map(t=>{
  const props=t.inputSchema?.properties||{};
  const fields=Object.entries(props).map(([key,v])=>{const desc=v.description||key;return {key,label:labels[key]||desc.split(/[:：]/)[0].split(/[（(]/)[0].slice(0,36),help:desc,type:v.type||'string',items:v.items,enum:v.enum,default:v.default,required:(t.inputSchema.required||[]).includes(key),allowBlank:/留空|不填|为空|可选|选填/.test(desc)||['gl_partner_direct_col','gl_partner_col'].includes(key),kind:OUTPUT_PATH_KEYS.has(key)?'output':INPUT_PATH_KEYS.has(key)?(directories.has(key)?'directory':/文件或文件夹|文件路径或文件夹|文件夹路径列表/.test(desc)?'path':'file'):/api_key|cookie/.test(key)?'secret':/JSON/i.test(desc)?'json':/列名|日期列|金额列/.test(desc)?'column':undefined};});
  for(const f of fields)if(['address_column','id_column'].includes(f.key)){f.default=f.key==='address_column'?'地址':'身份证号';f.required=false;}
  return {id:'mcp_'+t.name,name:renamed[t.name]||t.description.split(/ — |—|：|\n/)[0].replace(/\s*[(（].*$/,'').slice(0,35)||t.name,group:'审计工具箱',description:t.description,engine:'mcp',mcpName:t.name,fields,inputSchema:t.inputSchema,contract:{...extensionContract(t.name,false),inputMode:textOnly.has(t.name)?'none':'roles',templates:templates[t.name]||[],mutates:!readOnly.has(t.name),dependency:t.name==='detailed_table_generate'?'需要本机 64 位 Excel':t.name==='related_party'?'项目内 input/关联方核查配置表.xlsx；股权穿透需注协授权':undefined}};
 })];
}
export function normalizeParameters(tool,raw={}){
 const result={};
 for(const f of tool.fields){let v=raw[f.key];
  if(v===undefined||v===null||v===''){
   if(f.default!==undefined){result[f.key]=tool.engine==='builtin'&&f.key==='mapping'?JSON.parse(f.default):f.default;continue;}
   if(f.required&&!f.allowBlank)throw Error('请填写：'+f.label);
   if(f.required&&f.type==='string')result[f.key]='';
   continue;
  }
  if(f.type==='array'){if(!Array.isArray(v))throw Error(f.label+'必须是列表');if(f.items?.type==='string'&&v.some(x=>typeof x!=='string'))throw Error(f.label+'必须为文本列表');}
  else if(f.type==='boolean'){if(typeof v!=='boolean')throw Error(f.label+'必须为是/否');}
  else if(f.type==='integer'||f.type==='number'){v=typeof v==='number'?v:Number(v);if(!Number.isFinite(v)||(f.type==='integer'&&!Number.isInteger(v)))throw Error(f.label+'必须是'+(f.type==='integer'?'整数':'数值'));}
  else if(typeof v!=='string')throw Error(f.label+'必须是文本');
  if(f.enum&&!f.enum.includes(v))throw Error(f.label+'请选择有效选项');
  if(f.kind==='json'){try{JSON.parse(v);}catch{throw Error(f.label+'不是有效 JSON');}}
  result[f.key]=tool.engine==='builtin'&&f.key==='mapping'?JSON.parse(v):v;
 }
 if(tool.id==='mcp_bank_flow'&&!result.gl_partner_direct_col&&!result.gl_partner_col)throw Error('请选择交易对手列或客商辅助项列，至少填写一项');
 if(tool.id==='mcp_bankflowmerge'){
  const count=result.file_paths?.length;if(!count)throw Error('请添加银行流水文件');
  for(const f of tool.fields.filter(f=>f.type==='array'))if(result[f.key]?.length!==count)throw Error(f.label+'必须与流水文件逐一对应');
  if(result.header_start_rows.some(x=>!/^\d+$/.test(x)||Number(x)<1))throw Error('表头行必须是正整数');
 }
 if(tool.id==='mcp_monthly_execute'){
  const subjects=JSON.parse(result.subjects);if(!Array.isArray(subjects)||!subjects.length||subjects.some(x=>!String(x.code||'').trim()||!['借','贷'].includes(x.direction)))throw Error('请至少选择一个科目，并确认借贷方向');
 }
 if(['mcp_monthly_execute','mcp_monthly_detect_structure'].includes(tool.id)){
  const mapping=JSON.parse(result.column_mapping||'{}');if(['date','subject_code','subject_name'].some(k=>!mapping[k]))throw Error('请确认日期、科目代码、科目名称映射');
  if(tool.id==='mcp_monthly_execute'&&!mapping.debit&&!mapping.credit)throw Error('借方与贷方金额至少映射一项');
 }
 if(result.start_date&&result.end_date&&result.start_date>result.end_date)throw Error('开始日期不能晚于结束日期');
 return result;
}
