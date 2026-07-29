const money = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'});
const initialData = {
  month:new Date().toISOString().slice(0,7),
  budget:[
    ['Charge fixe','Logement',0,0],
    ['Dépense variable','Courses',0,0],
    ['Épargne','Épargne mensuelle',0,0],
    ['Crédit','Mensualités de crédits',0,0]
  ],
  incomes:[['Revenus du foyer',0]],
  assets:[['Comptes et épargne',0],['Patrimoine immobilier',0]],
  debts:[['Emprunts et crédits',0]],
  credits:[['Crédits',0]]
};
let data = JSON.parse(localStorage.getItem('budgetsoft-data')||'null') || structuredClone(initialData);
let sb=null, householdId=null, saveTimer=null;
const cfg=window.BUDGETSOFT_CONFIG||{};
const onlineConfigured=Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes('VOTRE-PROJET'));
if(onlineConfigured) sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const $=s=>document.querySelector(s), num=v=>Number(String(v).replace(',','.'))||0, sum=a=>a.reduce((s,x)=>s+num(x),0);
const setStatus=t=>$('#syncStatus').textContent=t;

async function initCloud(){
  if(!sb){ setStatus('Mode local'); return; }
  const {data:{session}}=await sb.auth.getSession();
  if(!session){ $('#authScreen').classList.remove('hidden'); return; }
  $('#authScreen').classList.add('hidden'); $('#logout').classList.remove('hidden');
  let {data:membership}=await sb.from('household_members').select('household_id').eq('user_id',session.user.id).maybeSingle();
  if(!membership){
    const {data:id,error}=await sb.rpc('create_my_household',{household_name:'Notre foyer'});
    if(error){setStatus('Erreur de configuration');console.error(error);return;} householdId=id;
  } else householdId=membership.household_id;
  const {data:row,error}=await sb.from('household_data').select('payload').eq('household_id',householdId).single();
  if(error){setStatus('Synchronisation impossible');console.error(error);return;}
  if(row?.payload && Object.keys(row.payload).length) data=row.payload;
  else await cloudSave();
  localStorage.setItem('budgetsoft-data',JSON.stringify(data)); renderAll(); setStatus('Synchronisé');
  sb.channel('budgetsoft-live').on('postgres_changes',{event:'UPDATE',schema:'public',table:'household_data',filter:`household_id=eq.${householdId}`},payload=>{
    if(payload.new?.payload){data=payload.new.payload;localStorage.setItem('budgetsoft-data',JSON.stringify(data));renderAll();setStatus('Mis à jour');}
  }).subscribe();
}
async function cloudSave(){
  if(!sb||!householdId)return;
  setStatus('Synchronisation…');
  const {data:{user}}=await sb.auth.getUser();
  const {error}=await sb.from('household_data').upsert({household_id:householdId,payload:data,updated_at:new Date().toISOString(),updated_by:user?.id});
  setStatus(error?'Erreur de synchronisation':'Synchronisé'); if(error)console.error(error);
}
function save(){
  localStorage.setItem('budgetsoft-data',JSON.stringify(data)); renderAll();
  clearTimeout(saveTimer); saveTimer=setTimeout(cloudSave,500);
}
const input=(value,onchange,type='number')=>{const e=document.createElement('input');e.type=type;e.value=value;e.addEventListener('change',()=>onchange(e.value));return e;};
function renderDashboard(){
  const income=sum(data.incomes.map(x=>x[1])), expenses=sum(data.budget.map(x=>x[2])), assets=sum(data.assets.map(x=>x[1])), debts=sum(data.debts.map(x=>x[1]));
  $('#kpiIncome').textContent=money.format(income); $('#kpiExpenses').textContent=money.format(expenses);
  const bal=income-expenses,kb=$('#kpiBalance');kb.textContent=money.format(bal);kb.className=bal>=0?'positive':'';
  $('#kpiNetWorth').textContent=money.format(assets-debts);
  const groups={};data.budget.forEach(x=>groups[x[0]]=(groups[x[0]]||0)+num(x[2]));const max=Math.max(...Object.values(groups),1);
  $('#expenseBars').innerHTML=Object.entries(groups).map(([k,v])=>`<div><div class="bar-head"><span>${k}</span><strong>${money.format(v)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join('');
  $('#wealthSummary').innerHTML=`<div class="wealth-line"><span>Actifs</span><strong>${money.format(assets)}</strong></div><div class="wealth-line"><span>Dettes</span><strong>${money.format(debts)}</strong></div><div class="wealth-line"><span>Patrimoine net</span><strong>${money.format(assets-debts)}</strong></div><div class="wealth-line"><span>Liquidités disponibles</span><strong>${money.format(sum(data.assets.filter(x=>!x[0].toLowerCase().includes('immobilier')).map(x=>x[1])))}</strong></div>`;
}
function renderBudget(){const body=$('#budgetRows');body.innerHTML='';data.budget.forEach((r,i)=>{const tr=document.createElement('tr'),type=document.createElement('select');['Charge fixe','Dépense variable','Épargne','Crédit'].forEach(v=>{const o=document.createElement('option');o.value=o.textContent=v;o.selected=r[0]===v;type.append(o)});type.onchange=()=>{r[0]=type.value;save()};[type,input(r[1],v=>{r[1]=v;save()},'text'),input(r[2],v=>{r[2]=num(v);save()}),input(r[3],v=>{r[3]=num(v);save()})].forEach(c=>{const td=document.createElement('td');td.append(c);tr.append(td)});const diff=document.createElement('td'),d=num(r[2])-num(r[3]);diff.textContent=money.format(d);diff.className='amount '+(d>=0?'positive':'negative');tr.append(diff);const del=document.createElement('td'),b=document.createElement('button');b.className='delete';b.textContent='×';b.onclick=()=>{data.budget.splice(i,1);save()};del.append(b);tr.append(del);body.append(tr);});}
function renderEditable(id,arr){const c=$(id);c.innerHTML='';arr.forEach((r,i)=>{const line=document.createElement('div');line.className='editable-line';line.append(input(r[0],v=>{r[0]=v;save()},'text'),input(r[1],v=>{r[1]=num(v);save()}));const b=document.createElement('button');b.className='delete';b.textContent='×';b.onclick=()=>{arr.splice(i,1);save()};line.append(b);c.append(line)});}
function renderAll(){renderDashboard();renderBudget();renderEditable('#assetRows',data.assets);renderEditable('#debtRows',data.debts);renderEditable('#creditRows',data.credits);$('#month').value=data.month;}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.view).classList.add('active');$('#viewTitle').textContent=b.textContent});
$('#month').onchange=e=>{data.month=e.target.value;save()};$('#addBudget').onclick=()=>{data.budget.push(['Dépense variable','Nouveau poste',0,0]);save()};$('#addAsset').onclick=()=>{data.assets.push(['Nouvel actif',0]);save()};$('#addDebt').onclick=()=>{data.debts.push(['Nouvelle dette',0]);save()};$('#addCredit').onclick=()=>{data.credits.push(['Nouveau crédit',0]);save()};
$('#exportData').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='budgetsoft-sauvegarde.json';a.click();URL.revokeObjectURL(a.href)};
$('#importData').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);save()}catch{alert('Fichier de sauvegarde invalide.')}};r.readAsText(f)};
$('#syncNow').onclick=cloudSave;
$('#authForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.signInWithPassword({email:$('#authEmail').value,password:$('#authPassword').value});$('#authMessage').textContent=error?error.message:'';if(!error)location.reload();};
$('#signUp').onclick=async()=>{const {error}=await sb.auth.signUp({email:$('#authEmail').value,password:$('#authPassword').value});$('#authMessage').textContent=error?error.message:'Compte créé. Vérifiez votre messagerie puis connectez-vous.';};
$('#logout').onclick=async()=>{await sb.auth.signOut();location.reload();};
renderAll();initCloud();
