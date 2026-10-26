// Pass a private test-account JSON artifact; never print passwords or tokens.
import {createClient} from '@supabase/supabase-js';import fs from 'node:fs';import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),credentials=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
const clients=[];
for(const u of credentials.users){const c=createClient(config.url,config.publishableKey,{auth:{persistSession:false}});const r=await c.auth.signInWithPassword(u);assert.equal(r.error,null,r.error?.message);clients.push({c,id:r.data.user.id});}
const [{c:a,id:aid},{c:b}]=clients;const id=crypto.randomUUID(),storagePath=`${aid}/${id}`;
const file=fs.readFileSync('e2e/sample-invoice.pdf');let r=await a.storage.from('invoicelens').upload(storagePath,file,{contentType:'application/pdf'});assert.equal(r.error,null,r.error?.message);
try{
 r=await a.from('il_documents').insert({id,name:'SYNTHETIC QA INVOICE.pdf',mime:'application/pdf',storage_path:storagePath}).select().single();assert.equal(r.error,null,r.error?.message);assert.equal(r.data.user_id,aid);
 assert.equal((await b.from('il_documents').select('*').eq('id',id)).data.length,0);
 assert.ok((await b.storage.from('invoicelens').download(storagePath)).error,'Other user must not download');
 assert.ok((await b.storage.from('invoicelens').upload(`${aid}/forbidden`,file,{contentType:'application/pdf'})).error,'Other user must not upload under owner folder');
 assert.ok((await a.from('il_documents').update({fields:[]}).eq('id',id)).error,'Direct update must be denied');
 const f={key:'invoiceNumber',label:'Invoice number',value:'QA-001',status:'approved',box:{x:.1,y:.1,w:.2,h:.05},page:1,source:'manual'};
 r=await a.rpc('il_save_review',{doc_id:id,expected_revision:0,new_fields:[f]});assert.equal(r.error,null,r.error?.message);assert.equal(r.data.revision,1);assert.equal(r.data.log[0].type,'create');
 assert.ok((await a.rpc('il_save_review',{doc_id:id,expected_revision:0,new_fields:[f]})).error,'Stale revision denied');
 assert.ok((await b.rpc('il_save_review',{doc_id:id,expected_revision:1,new_fields:[]})).error,'Other user RPC denied');
 for(const invalid of [null,{},[{}],[{...f,value:undefined}],[{...f,box:null}],[{...f,box:{x:.9,y:.1,w:.3,h:.1}}]])assert.ok((await a.rpc('il_save_review',{doc_id:id,expected_revision:1,new_fields:invalid})).error,'Invalid field must fail');
 const fresh=createClient(config.url,config.publishableKey,{auth:{persistSession:false}});assert.equal((await fresh.auth.signInWithPassword(credentials.users[0])).error,null);r=await fresh.from('il_documents').select('*').eq('id',id).single();assert.equal(r.data.fields[0].value,'QA-001');assert.equal(r.data.revision,1);assert.equal((await fresh.storage.from('invoicelens').download(storagePath)).error,null);
 const invalidType=await a.storage.from('invoicelens').upload(`${aid}/invalid-type`,new Blob(['<script>bad</script>'],{type:'text/html'}),{contentType:'text/html'});assert.ok(invalidType.error,'HTML file type denied');
 const oversized=await a.storage.from('invoicelens').upload(`${aid}/oversized`,new Uint8Array(10*1024*1024+1),{contentType:'application/pdf'});assert.ok(oversized.error,'Oversized upload denied');
 console.log('PASS: authenticated upload/read/RPC/audit, cross-user isolation, private files, invalid input, conflicts, fresh-session persistence, file limits.');
}finally{await a.storage.from('invoicelens').remove([storagePath]);await a.from('il_documents').delete().eq('id',id);for(const {c}of clients)await c.auth.signOut();}
