import http from 'node:http';
import crypto from 'node:crypto';

const HOST='127.0.0.1',PORT=Number(process.env.PORT||8787);
const BASE='https://testnet.binance.vision';
const TOKEN=process.env.HOP_ADMIN_TOKEN;
const KEY=process.env.BINANCE_TESTNET_KEY;
const SECRET=process.env.BINANCE_TESTNET_SECRET;
if(!TOKEN||TOKEN.length<32)throw Error('Set HOP_ADMIN_TOKEN (32+ chars). No API is started without admin authentication.');
const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
async function request(path,params={},signed=false){
  const q=new URLSearchParams(params);
  if(signed){
    if(!KEY||!SECRET)throw Error('Spot Testnet credentials not configured');
    q.set('timestamp',String(Date.now()));q.set('recvWindow','5000');
    q.set('signature',crypto.createHmac('sha256',SECRET).update(q.toString()).digest('hex'));
  }
  const url=BASE+path+(q.size?'?'+q:'');
  const response=await fetch(url,{headers:signed?{'X-MBX-APIKEY':KEY}:{},signal:AbortSignal.timeout(8000)});
  const body=await response.json();
  if(!response.ok)throw Error('Binance Testnet HTTP '+response.status+': '+(body.msg||'request failed'));
  return body;
}
const server=http.createServer(async(req,res)=>{
  if(req.headers.authorization!=='Bearer '+TOKEN)return send(res,401,{error:'Unauthorized'});
  if(req.method!=='GET')return send(res,405,{error:'Read-only service'});
  const path=new URL(req.url,'http://localhost').pathname;
  try{
    if(path==='/api/status')return send(res,200,{service:'HopeManity V19',mode:'SPOT_TESTNET',symbol:'BTCUSDT',tradingEnabled:false,accountConfigured:Boolean(KEY&&SECRET)});
    if(path==='/api/market'){
      const [ticker,clock]=await Promise.all([request('/api/v3/ticker/price',{symbol:'BTCUSDT'}),request('/api/v3/time')]);
      return send(res,200,{symbol:ticker.symbol,price:ticker.price,serverTime:clock.serverTime,source:'Binance Spot Testnet'});
    }
    if(path==='/api/account'){
      const data=await request('/api/v3/account',{},true);
      return send(res,200,{canTrade:data.canTrade,balances:(data.balances||[]).filter(b=>['BTC','USDT'].includes(b.asset))});
    }
    return send(res,404,{error:'Unknown route'});
  }catch(e){return send(res,502,{error:String(e.message).slice(0,180)})}
});
server.listen(PORT,HOST,()=>console.log('HopeManity V19 read-only Spot Testnet on http://'+HOST+':'+PORT));
