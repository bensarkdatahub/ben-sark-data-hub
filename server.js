import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GDGH_API_KEY;
const BASE = 'https://www.getdatagh.com/api/v1';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function headers(){
  if(!API_KEY) throw new Error('GetDataGH API key is not configured on the server.');
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' };
}

async function gdgh(url, options={}){
  const r = await fetch(url, {...options, headers:{...headers(), ...(options.headers||{})}});
  const body = await r.json().catch(()=>({}));
  if(!r.ok){
    const message = body?.error?.message || body?.message || `GetDataGH request failed (${r.status})`;
    const e = new Error(message); e.status = r.status; throw e;
  }
  return body;
}

app.get('/api/packages', async (req,res)=>{
  try{
    const u = new URL(`${BASE}/packages`);
    if(req.query.network) u.searchParams.set('network', req.query.network);
    res.json(await gdgh(u.toString()));
  }catch(e){res.status(e.status||500).json({error:e.message});}
});

app.post('/api/purchase', async (req,res)=>{
  try{
    const {package_code, phone_number, network, email} = req.body || {};
    if(!package_code || !phone_number || !network) return res.status(400).json({error:'Package, phone number and network are required.'});
    const callback = `${req.protocol}://${req.get('host')}/payment-complete`;
    const data = await gdgh(`${BASE}/purchase`, {method:'POST', body:JSON.stringify({package_code, phone_number, network, ...(email?{email}:{}), callback_url:callback})});
    res.json(data);
  }catch(e){res.status(e.status||500).json({error:e.message});}
});

app.get('/api/transactions/:ref', async (req,res)=>{
  try{res.json(await gdgh(`${BASE}/transactions/${encodeURIComponent(req.params.ref)}`));}
  catch(e){res.status(e.status||500).json({error:e.message});}
});

app.get('/api/balance', async (_req,res)=>{
  try{res.json(await gdgh(`${BASE}/balance`));}
  catch(e){res.status(e.status||500).json({error:e.message});}
});

app.get('/payment-complete', (_req,res)=>res.sendFile(path.join(__dirname,'public','payment-complete.html')));
app.get('/{*splat}', (_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`BEN SARK DATA HUB: http://localhost:${PORT}`));
