import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export class Store {
 constructor(root){
  this.root=root;fs.mkdirSync(path.join(root,'sessions'),{recursive:true});
  this.db=new DatabaseSync(path.join(root,'metadata.sqlite'));
  this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id));`);
 }
 all(kind){return this.db.prepare('SELECT value FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r=>JSON.parse(r.value));}
 get(kind,id){const r=this.db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind,id);return r?JSON.parse(r.value):null;}
 put(kind,value){this.db.prepare('INSERT INTO records(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,value.id,JSON.stringify(value));return value;}
 create(kind,value){return this.put(kind,{...value,id:randomUUID(),createdAt:new Date().toISOString()});}
 events(id){if(!/^[a-zA-Z0-9-]+$/.test(id))throw new Error('无效会话');const f=path.join(this.root,'sessions',id+'.jsonl');if(!fs.existsSync(f))return [];return fs.readFileSync(f,'utf8').split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});}
 append(id,event){const events=this.events(id);const item={...event,id:randomUUID(),seq:events.length+1,at:new Date().toISOString()};const file=path.join(this.root,'sessions',id+'.jsonl');if(fs.existsSync(file)){const bytes=fs.readFileSync(file);if(bytes.length&&bytes.at(-1)!==10){const last=bytes.lastIndexOf(10);fs.truncateSync(file,last+1);}}const fd=fs.openSync(file,'a');try{fs.writeSync(fd,JSON.stringify(item)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return item;}
 close(){this.db.close();}
  delete(kind,id){this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id);}
  deleteByKind(kind,filter){const rows=this.db.prepare('SELECT id FROM records WHERE kind=? AND '+filter).all(kind);for(const r of rows)this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,r.id);}
}
