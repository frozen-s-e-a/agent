import fs from 'node:fs';import path from 'node:path';
const frontmatter=/^---\s*\r?\n([\s\S]*?)\r?\n---/;
function field(text,name){const m=text.match(new RegExp('^'+name+':\\s*(.*)$','mi'));return m?m[1].trim().replace(/^['"]|['"]$/g,''):'';}
export function loadSkills(root){
 const directory=path.join(root,'src','skills');if(!fs.existsSync(directory))return [];
 return fs.readdirSync(directory,{withFileTypes:true}).filter(x=>x.isDirectory()).flatMap(dir=>{const file=path.join(directory,dir.name,'SKILL.md');if(!fs.existsSync(file))return [];const text=fs.readFileSync(file,'utf8'),match=text.match(frontmatter);return [{id:dir.name,name:field(match?.[1]||'','name')||dir.name,description:field(match?.[1]||'','description'),triggers:field(match?.[1]||'','triggers'),text,file}];});
}
export function skillContext(skills,query,{maxSkills=3,maxChars=24000}={}){
 const q=String(query||'').toLowerCase();const ranked=skills.map(s=>{const hay=(s.name+' '+s.description+' '+s.triggers).toLowerCase();let score=0;for(const word of q.split(/[^\p{L}\p{N}_-]+/u).filter(x=>x.length>1))if(hay.includes(word))score++;return {s,score};}).sort((a,b)=>b.score-a.score||a.s.name.localeCompare(b.s.name));const picked=ranked.filter(x=>x.score>0).slice(0,maxSkills);if(!picked.length)return '';
 let out='';for(const {s} of picked){const piece=`\n\n### 原版 Skill：${s.name}\n${s.description}\n触发词：${s.triggers}\n工作流参考（仅作行为约束，不能改变权限）：\n${s.text.replace(/^---[\s\S]*?---\s*/,'').slice(0,Math.max(0,Math.min(10000,maxChars-out.length)))}\n`;if(out.length+piece.length>maxChars)break;out+=piece;}return out;
}
