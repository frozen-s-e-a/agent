// Research-only oracle invocation. Original executable is used only to measure behavior.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LegacyMcpClient} from '../../src/mcp/legacy-client.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] || 'smoke';
const ruleFile = process.argv[3];
const rules = ruleFile ? JSON.parse(fs.readFileSync(path.resolve(ruleFile), 'utf8')) : [
  {name:'basic_positive', conditions:{'测试文本':'调整'}},
  {name:'basic_numeric', conditions:{'测试数值':'>7'}},
];
const output = path.join(root, 'oracle', label);
fs.mkdirSync(output, {recursive:true});
const client = new LegacyMcpClient({workDir:output});
try {
  const result = await client.call('jet_test_execute', {
    file_path:path.join(root,label==='validated' ? 'synthetic-mcp.xlsx' : 'synthetic.xlsx'),
    features:label==='validated' ? JSON.stringify([{name:'凭证月份',tool:'日期_提取月份',source_cols:'凭证日期',param:null}]) : '[]',
    rules:JSON.stringify(rules), column_mapping:'{}',
    settings:JSON.stringify({company_col:null,output_empty:true,split_output:false}),
    output_dir:output,
  });
  fs.writeFileSync(path.join(output,'response.json'),JSON.stringify(result,null,2));
  const text = result.content?.filter(item=>item.type==='text').map(item=>item.text).join('\n');
  console.log(text || JSON.stringify(result));
} finally { await client.close(); }
