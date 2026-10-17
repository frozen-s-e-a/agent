import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const TAIL_CHUNK=64*1024;

export class Store {
 constructor(root){
  this.root=root;fs.mkdirSync(path.join(root,'sessions'),{recursive:true});
  this.db=new DatabaseSync(path.join(root,'metadata.sqlite'));
  this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id));`);
  // Conversation views read tool calls, tasks and runs per session on every poll.
  this.db.exec(`CREATE INDEX IF NOT EXISTS records_session ON records(kind, json_extract(value,'$.sessionId'));`);
  this.db.exec('PRAGMA busy_timeout=5000;');
  this.eventCache=new Map();
 }
 all(kind){return this.db.prepare('SELECT value FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r=>JSON.parse(r.value));}
 /** Records of one kind belonging to a session, in insertion order. Uses the session index. */
 bySession(kind,sessionId){return this.db.prepare("SELECT value FROM records WHERE kind=? AND json_extract(value,'$.sessionId')=? ORDER BY rowid").all(kind,sessionId).map(r=>JSON.parse(r.value));}
 get(kind,id){const r=this.db.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(kind,id);return r?JSON.parse(r.value):null;}
 put(kind,value){this.db.prepare('INSERT INTO records(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,value.id,JSON.stringify(value));return value;}
 create(kind,value){return this.put(kind,{...value,id:randomUUID(),createdAt:new Date().toISOString()});}
 transaction(callback){this.db.exec('BEGIN IMMEDIATE');try{const result=callback();if(result?.then)throw Error('存储事务必须同步提交');this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 eventFile(id){if(!/^[a-zA-Z0-9-]+$/.test(id))throw new Error('无效会话');return path.join(this.root,'sessions',id+'.jsonl');}
 /**
  * Events of a session. The log is append-only, so only bytes added since the
  * previous read are parsed; a file shorter than what was read is re-read from the start.
  */
 events(id){
  const f=this.eventFile(id);if(!fs.existsSync(f)){this.eventCache.delete(id);return [];}
  const size=fs.statSync(f).size;let cached=this.eventCache.get(id);
  if(!cached||size<cached.offset)cached={offset:0,events:[]};
  if(size>cached.offset){
   const buffer=Buffer.alloc(size-cached.offset),fd=fs.openSync(f,'r');
   try{fs.readSync(fd,buffer,0,buffer.length,cached.offset);}finally{fs.closeSync(fd);}
   // Only complete lines are consumed; a line still being written is read again next time.
   const end=buffer.lastIndexOf(10)+1;
   const fresh=buffer.subarray(0,end).toString('utf8').split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
   cached={offset:cached.offset+end,events:[...cached.events,...fresh]};
  }
  this.eventCache.set(id,cached);
  return cached.events.slice();
 }
 /** Drop a trailing partial line left by a crash and return the last complete event's sequence number. Reads only the file's tail. */
 lastSeq(file){
  if(!fs.existsSync(file))return 0;
  const fd=fs.openSync(file,'r+');
  try{
   const size=fs.fstatSync(fd).size;let position=size,tail=Buffer.alloc(0);
   const newlines=()=>tail.reduce((count,byte)=>count+(byte===10),0);
   while(position>0&&newlines()<2){const length=Math.min(TAIL_CHUNK,position);position-=length;const chunk=Buffer.alloc(length);fs.readSync(fd,chunk,0,length,position);tail=Buffer.concat([chunk,tail]);}
   if(tail.length&&tail[tail.length-1]!==10){const keep=tail.lastIndexOf(10)+1;fs.ftruncateSync(fd,position+keep);tail=tail.subarray(0,keep);}
   const lines=tail.toString('utf8').split('\n').filter(Boolean);
   for(let i=lines.length-1;i>=0;i--){try{return Number(JSON.parse(lines[i]).seq)||0;}catch{}}
   return 0;
  }finally{fs.closeSync(fd);}
 }
 append(id,event){
  const file=this.eventFile(id);
  const seq=this.lastSeq(file)+1;
  const item={...event,id:randomUUID(),seq,at:new Date().toISOString()};
  const fd=fs.openSync(file,'a');try{fs.writeSync(fd,JSON.stringify(item)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  return item;
 }
 close(){this.db.close();}
  delete(kind,id){this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id);}
  deleteByKind(kind,filter){const rows=this.db.prepare('SELECT id FROM records WHERE kind=? AND '+filter).all(kind);for(const r of rows)this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,r.id);}
}
