import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(process.argv[2]||process.cwd());
const dir=path.join(root,'study','computer-science-interview');
const failures=[];
const context={window:{},console,Math,Number,String,Array,Object,Map,Set,Date,JSON,Intl,TextEncoder,TextDecoder,Float32Array,Uint32Array,Uint8Array,ArrayBuffer,setTimeout,clearTimeout};
context.window.window=context.window;
vm.createContext(context);

for(let first=1;first<=91;first+=10){
  const last=first+9,file=`questions-${String(first).padStart(3,'0')}-${String(last).padStart(3,'0')}.js`;
  vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
}

const data=context.window.CSInterviewData;
if(!data)failures.push('CSInterviewData was not created');
const questions=data?.questions||[];
const required=['question','scenario','concepts','labLabel','boundary','naive','failure','reasoning','build','verify','trade','core'];
if(questions.length!==100)failures.push(`expected 100 questions, found ${questions.length}`);
const ids=new Set();
for(const q of questions){
  if(ids.has(q.id))failures.push(`duplicate question id ${q.id}`);ids.add(q.id);
  for(const key of required)if(q[key]==null||(Array.isArray(q[key])?q[key].length===0:String(q[key]).trim()===''))failures.push(`Q${q.id} missing ${key}`);
  if(!q.scenario.match(/[게임서버클라이언트캐릭터플레이어몬스터월드렌더물리전투레이드로그패킷파일메모리CPU]|AI|GPU|NPC|thread|process|asset|frame|socket/i))failures.push(`Q${q.id} scenario lacks a concrete game/system actor`);
}

const labs=new Map();
context.CSLabs={register(id,definition){labs.set(id,definition)}};
for(let first=1;first<=91;first+=10){
  const last=first+9,file=`labs-${String(first).padStart(3,'0')}-${String(last).padStart(3,'0')}.js`;
  vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
}
if(labs.size!==100)failures.push(`expected 100 labs, found ${labs.size}`);
const htmlFingerprints=new Map();let controls=0;
for(let id=1;id<=100;id++){
  const lab=labs.get(id);if(!lab){failures.push(`Q${id} lab missing`);continue;}
  let html='';try{html=lab.html()}catch(error){failures.push(`Q${id} lab html failed: ${error.message}`);continue;}
  const count=(html.match(/<(button|input|select)\b/gi)||[]).length-1;controls+=Math.max(0,count);
  if(count<1)failures.push(`Q${id} lab has no learner control`);
  if(!/aria-live="polite"/.test(html))failures.push(`Q${id} lab lacks observable status`);
  const fingerprint=html.replace(/Q\d+/g,'Q#').replace(/\d+(?:\.\d+)?/g,'#').replace(/\s+/g,' ');
  if(htmlFingerprints.has(fingerprint))failures.push(`Q${id} duplicates Q${htmlFingerprints.get(fingerprint)} lab markup`);else htmlFingerprints.set(fingerprint,id);
}

const result={questions:questions.length,labs:labs.size,controls,failures};
console.log(JSON.stringify(result,null,2));
if(failures.length)process.exitCode=1;
