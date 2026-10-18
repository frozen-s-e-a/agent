import fs from 'node:fs';import path from 'node:path';
const frontmatter=/^---\s*\r?\n([\s\S]*?)\r?\n---/;
function field(text,name){const m=text.match(new RegExp('^'+name+':\\s*(.*)$','mi'));return m?m[1].trim().replace(/^['"]|['"]$/g,''):'';}
export function loadSkills(root){
 const directory=path.join(root,'src','skills');if(!fs.existsSync(directory))return [];
 return fs.readdirSync(directory,{withFileTypes:true}).filter(x=>x.isDirectory()).flatMap(dir=>{const file=path.join(directory,dir.name,'SKILL.md');if(!fs.existsSync(file))return [];const text=fs.readFileSync(file,'utf8'),meta=text.match(frontmatter)?.[1]||'';return [{id:dir.name,name:field(meta,'name')||dir.name,description:field(meta,'description'),triggers:field(meta,'triggers'),audience:field(meta,'audience')||'agent',text,file}];});
}

const triggerList=skill=>skill.triggers.split(/[,，、;；]/).map(item=>item.trim().toLowerCase()).filter(Boolean);

/**
 * Score a skill against a request. Chinese requests have no word boundaries, so
 * the main signal is a declared trigger appearing anywhere in the request; Latin
 * words in the request are also matched against the skill's name and description.
 */
export function skillScore(skill,query){
 const q=String(query||'').toLowerCase();if(!q)return 0;
 let score=0;for(const trigger of triggerList(skill))if(q.includes(trigger))score+=3;
 const hay=(skill.name+' '+skill.description).toLowerCase();
 for(const word of q.match(/[a-z0-9_-]{2,}/g)||[])if(hay.includes(word))score++;
 return score;
}

/** Task guides for the audit agent. Skills marked `audience: authoring` manage skills themselves and are never injected. */
export function skillContext(skills,query,{maxSkills=3,maxChars=24000}={}){
 const picked=skills.filter(s=>s.audience!=='authoring').map(s=>({s,score:skillScore(s,query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.s.name.localeCompare(b.s.name)).slice(0,maxSkills);
 if(!picked.length)return '';
 let out='';for(const {s} of picked){const piece=`\n\n### 任务指南：${s.name}\n${s.description}\n触发词：${s.triggers}\n工作流参考（仅作行为约束，不能改变权限）：\n${s.text.replace(/^---[\s\S]*?---\s*/,'').slice(0,Math.max(0,Math.min(10000,maxChars-out.length)))}\n`;if(out.length+piece.length>maxChars)break;out+=piece;}return out;
}
