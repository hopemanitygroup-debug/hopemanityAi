import http from 'node:http';
import crypto from 'node:crypto';
const BASE='https://testnet.binance.vision';
const HOST=process.env.HOST||'127.0.0.1';
const PORT=Number(process.env.PORT||8787);
const KEY=process.env.BINANCE_TESTNET_API_KEY||'';
const SECRET=process.env.BINANCE_TESTNET_API_SECRET||'';
const TOKEN=process.env.DASHBOARD_TOKEN||'';
const json=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))};
async function upstream(path,params={},signed=false){
 const query=new URLSearchParams(params);
 if(signed){if(!KEY||!SECRET)throw Error('Testnet API credentials not configured');query.set('recvWindow','5000');query.set('timestamp',String(Date.now()));query.set('signature',crypto.createHmac('sha256',SECRET).update(query.toString()).digest('hex'))}
 const url=BASE+path+'?'+query;
 const response=await fetch(url,{headers:signed?{'X-MBX-APIKEY':KEY}:{},signal:AbortSignal.timeout(10000)});
 const body=await response.text();
 let parsed;try{parsed=JSON.parse(body)}catch{throw Error('Invalid Binance response')}
 if(!response.ok)throw Error('Binance HTTP '+response.status+': '+String(parsed.msg||'request failed').slice(0,120));
 return parsed;
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method!=='GET')return json(res,405,{error:'Read-only server; orders disabled'});
  if(url.pathname==='/health')return json(res,200,{ok:true,environment:'BINANCE_SPOT_TESTNET',symbol:'BTCUSDT',ordersEnabled:false});
  if(!TOKEN||req.headers.authorization!=='Bearer '+TOKEN)return json(res,401,{error:'Dashboard token required'});
  if(url.pathname==='/api/market'){
   const data=await upstream('/api/v3/klines',{symbol:'BTCUSDT',interval:'5m',limit:'60'});
   return json(res,200,{symbol:'BTCUSDT',candles:data.filter(x=>Number(x[6])<Date.now()).map(x=>({time:x[0],open:x[1],high:x[2],low:x[3],close:x[4],volume:x[5]}))});
  }
  if(url.pathname==='/api/account'){
   const account=await upstream('/api/v3/account',{},true);
   return json(res,200,{balances:account.balances.filter(x=>['BTC','USDT'].includes(x.asset)).map(x=>({asset:x.asset,free:x.free,locked:x.locked}))});
  }
  return json(res,404,{error:'Not found'});
 }catch(e){json(res,502,{error:String(e.message).slice(0,200)})}
});
server.listen(PORT,HOST,()=>console.log('HopeManity Testnet read-only server on '+HOST+':'+PORT));
