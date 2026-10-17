import {createBackend} from './service.mjs';
const backend=await createBackend();let buffer='';
function send(value){process.stdout.write(JSON.stringify(value)+'\n');}
process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{
 buffer+=chunk;if(Buffer.byteLength(buffer)>2_000_000){process.exitCode=1;process.stdin.destroy();return;}let i;
 while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let request;
  try{request=JSON.parse(line);if(typeof request.id!=='string'||typeof request.method!=='string')throw Error('协议格式无效');}
  catch{send({id:null,ok:false,error:'协议格式无效'});continue;}
  backend.action(request.method,request.payload).then(result=>send({id:request.id,ok:true,result}),error=>send({id:request.id,ok:false,error:error.message}));
 }
});
process.stdin.on('end',()=>process.exit(0));process.stdout.on('error',()=>process.exit(1));
send({type:'ready',transport:'stdio',protocolVersion:1});
