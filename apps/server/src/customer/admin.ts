import { randomUUID } from 'node:crypto';
import type { Express, RequestHandler, Request } from 'express';
import { CustomerError, CustomerStore } from './store.js';
import { customerConfig } from './config.js';

const day=86400000, offset=7*3600000;
function text(value:unknown,max=200) {if(value===undefined) return '';if(typeof value!=='string'||value.length>max) throw new CustomerError(400,'Bộ lọc không hợp lệ');return value.trim();}
function paging(req:Request) {const page=Number(req.query.page || 1);if(!Number.isSafeInteger(page)||page<1) throw new CustomerError(400,'Trang không hợp lệ');return {page,size:25,q:text(req.query.q),status:text(req.query.status,40)};}
const jobFields=`j.id,j.user_id,j.thread_id,j.prompt,j.drive_url,j.status,j.stage,j.tokens,j.duration,j.error,j.created_at,j.output,u.email,u.name,COALESCE(-l.delta,0) AS chargedTokens`;
const jobFrom=`jobs j JOIN users u ON u.id=j.user_id LEFT JOIN ledger l ON l.reference=j.id AND l.user_id=j.user_id AND l.kind='reserve'`;
export function adminRoutes(app:Express,store:CustomerStore,auth:RequestHandler) {
 const gate:RequestHandler=(_req,res,next)=>{if(store.user(res.locals.user.id)?.role!=='admin') throw new CustomerError(403,'Chỉ quản trị được sử dụng chức năng này');next();};
 function list(req:Request,fields:string,from:string,clauses:string[],params:(string|number)[],order:string) {
   const p=paging(req),where=clauses.length?' WHERE '+clauses.join(' AND '):'';
   const total=Number(store.db.prepare('SELECT count(*) AS n FROM '+from+where).get(...params)?.n);
   const items=store.db.prepare('SELECT '+fields+' FROM '+from+where+' ORDER BY '+order+' LIMIT ? OFFSET ?').all(...params,p.size,(p.page-1)*p.size);
   return {items,total,page:p.page,pageSize:p.size};
 }
 function customer(id:string) {const u=store.user(id);if(!u) throw new CustomerError(404,'Không tìm thấy tài khoản');return u;}
 app.get('/api/customer/admin/overview',auth,gate,(req,res)=>{
   const days=Number(req.query.days || 30);if(![7,30].includes(days)) throw new CustomerError(400,'Khoảng thời gian không hợp lệ');
   const end=Math.floor((Date.now()+offset)/day)*day-offset+day,start=end-days*day;
   const receipts=store.db.prepare("SELECT l.created_at,o.amount FROM ledger l JOIN orders o ON o.id=l.reference AND o.user_id=l.user_id WHERE l.kind='purchase' AND o.status='paid' AND l.created_at>=? AND l.created_at<?").all(start,end);
   const series=Array.from({length:days},(_,i)=>({date:new Date(start+i*day+offset).toISOString().slice(0,10),amount:0}));
   for(const row of receipts) {const idx=Math.floor((Number(row.created_at)-start)/day);series[idx].amount+=Number(row.amount);}
   const stats=store.adminOverview(res.locals.user.id).stats!;
   res.json({stats:{...stats,videos:Number(store.db.prepare('SELECT count(*) AS n FROM jobs WHERE created_at>=? AND created_at<?').get(start,end)?.n),paidVnd:series.reduce((sum,r)=>sum+r.amount,0)},days,series,recentJobs:store.db.prepare('SELECT '+jobFields+' FROM '+jobFrom+' ORDER BY j.created_at DESC,j.rowid DESC LIMIT 4').all(),services:{aiConfigured:Boolean(process.env.OPENAI_API_KEY?.trim()),sepayConfigured:Boolean(customerConfig.sepayKey),renderMode:process.env.CUSTOMER_SERVER_RENDER==='0'?'local':'server'}});
 });
 app.get('/api/customer/admin/customers',auth,gate,(req,res)=>{
   const p=paging(req),clauses=["u.role='customer'"],params:(string|number)[]=[];
   if(p.q) {clauses.push('(u.email LIKE ? OR u.name LIKE ?)');params.push('%'+p.q+'%','%'+p.q+'%');}
   if(p.status) {if(!['active','blocked'].includes(p.status)) throw new CustomerError(400,'Trạng thái không hợp lệ');clauses.push('u.blocked=?');params.push(p.status==='blocked'?1:0);}
   res.json(list(req,'u.id,u.name,u.email,u.balance,u.role,u.blocked','users u',clauses,params,'u.rowid DESC'));
 });
 app.get('/api/customer/admin/customers/:id',auth,gate,(req,res)=>{
   const id=String(req.params.id),u=customer(id);
   res.json({account:store.publicUser(u),jobs:store.db.prepare('SELECT '+jobFields+' FROM '+jobFrom+' WHERE j.user_id=? ORDER BY j.created_at DESC LIMIT 10').all(id),orders:store.db.prepare('SELECT id,code,tokens,amount,status,created_at,expires FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 10').all(id),ledger:store.db.prepare('SELECT delta,kind,created_at FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 25').all(id)});
 });
 app.get('/api/customer/admin/videos',auth,gate,(req,res)=>{
   const p=paging(req),clauses:string[]=[],params:(string|number)[]=[];
   if(p.q) {clauses.push('(u.email LIKE ? OR j.prompt LIKE ?)');params.push('%'+p.q+'%','%'+p.q+'%');}
   if(p.status) {if(!['inspecting','awaiting_confirmation','queued','running','local_running','done','failed','cancelled'].includes(p.status)) throw new CustomerError(400,'Trạng thái không hợp lệ');clauses.push('j.status=?');params.push(p.status);}
   res.json(list(req,jobFields,jobFrom,clauses,params,'j.created_at DESC,j.rowid DESC'));
 });
 app.get('/api/customer/admin/videos/:id',auth,gate,(req,res)=>{
   const row=store.db.prepare('SELECT '+jobFields+' FROM '+jobFrom+' WHERE j.id=?').get(String(req.params.id));
   if(!row) throw new CustomerError(404,'Không tìm thấy video');res.json(row);
 });
 const orderStatus="CASE WHEN o.status='pending' AND o.expires<"; // Bind the timestamp; never interpolate a request.
 app.get('/api/customer/admin/orders',auth,gate,(req,res)=>{
   const p=paging(req),clauses:string[]=[],params:(string|number)[]=[];
   if(p.q) {clauses.push('(u.email LIKE ? OR o.code LIKE ?)');params.push('%'+p.q+'%','%'+p.q+'%');}
   if(p.status) {if(!['pending','paid','expired'].includes(p.status)) throw new CustomerError(400,'Trạng thái không hợp lệ');clauses.push(orderStatus+"? THEN 'expired' ELSE o.status END=?");params.push(Date.now(),p.status);}
   // Effective expiry is projected in JS so list parameters retain a single order.
   const result=list(req,'o.id,o.user_id,o.code,o.tokens,o.amount,o.status,o.created_at,o.expires,u.email,u.name','orders o JOIN users u ON u.id=o.user_id',clauses,params,'o.created_at DESC,o.rowid DESC');
   res.json({...result,items:result.items.map(row=>({...row,status:row.status==='pending' && Number(row.expires)<Date.now()?'expired':row.status}))});
 });
 app.get('/api/customer/admin/orders/:id',auth,gate,(req,res)=>{
   const row=store.db.prepare('SELECT o.id,o.user_id,o.code,o.tokens,o.amount,o.status,o.created_at,o.expires,u.email,u.name FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?').get(String(req.params.id));
   if(!row) throw new CustomerError(404,'Không tìm thấy đơn nạp');
   const paid=store.db.prepare("SELECT created_at FROM ledger WHERE kind='purchase' AND reference=? AND user_id=?").get(row.id!,row.user_id!);
   res.json({...row,status:row.status==='pending' && Number(row.expires)<Date.now()?'expired':row.status,paidAt:paid?.created_at || null});
 });
 app.get('/api/customer/admin/audit',auth,gate,(req,res)=>{
   const p=paging(req),clauses:string[]=[],params:(string|number)[]=[];
   if(p.q){clauses.push('(actor.email LIKE ? OR target.email LIKE ? OR a.reason LIKE ?)');params.push('%'+p.q+'%','%'+p.q+'%','%'+p.q+'%');}
   if(p.status){if(!['tokens','lock','unlock'].includes(p.status)) throw new CustomerError(400,'Thao tác không hợp lệ');clauses.push('a.action=?');params.push(p.status);}
   const result=list(req,'a.id,a.action,a.reason,a.created_at,a.payload,actor.email AS actorEmail,target.email AS targetEmail','admin_audit a JOIN users actor ON actor.id=a.actor_id JOIN users target ON target.id=a.target_id',clauses,params,'a.created_at DESC,a.rowid DESC');
   res.json({...result,items:result.items.map(row=>({...row,payload:JSON.parse(String(row.payload))}))});
 });
 function mutate(actor:string,id:string,body:any,action:'tokens'|'lock'|'unlock') {
   const reason=text(body?.reason,500),requestId=text(body?.requestId,80);
   if(!reason || !/^[a-zA-Z0-9-]{20,80}$/.test(requestId)) throw new CustomerError(400,'Cần lý do và mã thao tác hợp lệ');
   const delta=action==='tokens'?body?.delta:0;
   if(action==='tokens' && (!Number.isSafeInteger(delta)||delta===0)) throw new CustomerError(400,'Token điều chỉnh phải là số nguyên khác 0');
   return store.transaction(()=>{
     const old=store.db.prepare('SELECT * FROM admin_audit WHERE id=?').get(requestId);
     if(old) {
       const data=JSON.parse(String(old.payload));
       if(old.actor_id!==actor||old.target_id!==id||old.action!==action||old.reason!==reason||data.delta!==delta) throw new CustomerError(409,'Mã thao tác đã được sử dụng cho yêu cầu khác');
       return {success:true,duplicate:true,account:data.account};
     }
     const target=customer(id);if(target.role!=='customer') throw new CustomerError(403,'Chỉ thay đổi tài khoản khách hàng');
     if(action==='tokens') {
       const balance=target.balance+delta;
       if(!Number.isSafeInteger(balance)||balance<0) throw new CustomerError(400,'Số dư sau điều chỉnh không hợp lệ');
       store.db.prepare('UPDATE users SET balance=? WHERE id=?').run(balance,id);
       store.db.prepare('INSERT INTO ledger VALUES(?,?,?,?,?,?)').run(randomUUID(),id,delta,'admin_adjustment',requestId,Date.now());
     } else {
       store.db.prepare('UPDATE users SET blocked=? WHERE id=?').run(action==='lock'?1:0,id);
       if(action==='lock') store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
     }
     const account=store.publicUser(customer(id));
     const payload={delta,beforeBalance:target.balance,afterBalance:account.balance,beforeBlocked:Boolean(target.blocked),afterBlocked:account.blocked,account};
     store.db.prepare('INSERT INTO admin_audit VALUES(?,?,?,?,?,?,?)').run(requestId,actor,id,action,reason,JSON.stringify(payload),Date.now());
     return {success:true,duplicate:false,account};
   });
 }
 app.post('/api/customer/admin/customers/:id/tokens',auth,gate,(req,res)=>res.json(mutate(res.locals.user.id,String(req.params.id),req.body,'tokens')));
 app.post('/api/customer/admin/customers/:id/status',auth,gate,(req,res)=>{
   if(typeof req.body?.blocked!=='boolean') throw new CustomerError(400,'Trạng thái tài khoản không hợp lệ');
   res.json(mutate(res.locals.user.id,String(req.params.id),req.body,req.body.blocked?'lock':'unlock'));
 });
}
