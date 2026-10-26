'use strict';
const $=id=>document.getElementById(id), KEY='tournee_data_v2', OLD_KEY='tournee_data_v1';
const initial={clients:[],depot:{name:'Mon dépôt',address:'',lat:null,lng:null},delivered:[],parcels:[],date:''};
let state;try{state={...initial,...JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||'{}')}}catch{state=structuredClone(initial)}
const today=()=>new Date().toLocaleDateString('sv-SE');
if(!Array.isArray(state.parcels))state.parcels=[];if(state.date!==today()){state.delivered=[];state.date=today()}
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
const uid=()=>globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===''||v==null?null:Number.isFinite(Number(v))?Number(v):null;
const coord=c=>Number.isFinite(c.lat)&&Number.isFinite(c.lng)&&Math.abs(c.lat)<=90&&Math.abs(c.lng)<=180;
const minutes=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0)};
const clock=m=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(Math.round(m%60)).padStart(2,'0')}`;
const rad=x=>x*Math.PI/180;
function km(a,b){const dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function nav(c){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(coord(c)?`${c.lat},${c.lng}`:c.address)+'&travelmode=driving'}
function render(){
 $('clientCount').textContent=`(${state.clients.length})`;
 const filter=$('filter').value.toLowerCase();
 $('clientList').innerHTML=state.clients.filter(c=>(c.name+' '+c.address).toLowerCase().includes(filter)).map(c=>`<div class="item"><label><input type="checkbox" data-select="${esc(c.id)}" ${c.selected?'checked':''}> <strong style="display:inline">${esc(c.name)}</strong></label><div class="meta">${esc(c.address)} • ${esc(c.open)}–${esc(c.close)} • ${c.service} min ${coord(c)?'• GPS ✓':'• GPS manquant'}</div><div class="actions"><button data-edit="${esc(c.id)}">Modifier</button><button data-delete="${esc(c.id)}" class="danger">Supprimer</button><a href="${esc(nav(c))}" target="_blank" rel="noopener">Google Maps</a></div></div>`).join('')||'<p>Aucun client trouvé.</p>';
 $('selectedCount').textContent=`(${state.clients.filter(c=>c.selected).length})`;renderParcels();
}
function resetForm(){$('clientForm').reset();$('clientId').value='';$('clientOpen').value='08:00';$('clientClose').value='17:00';$('clientService').value='10'}
function fillForm(c){$('clientId').value=c.id;for(const [k,v] of Object.entries({clientName:c.name,clientAddress:c.address,clientLat:c.lat??'',clientLng:c.lng??'',clientOpen:c.open,clientClose:c.close,clientService:c.service,clientNotes:c.notes||''}))$(k).value=v;document.querySelector('[data-tab="clients"]').click();window.scrollTo(0,0)}
$('clientForm').addEventListener('submit',e=>{e.preventDefault();const id=$('clientId').value,old=state.clients.find(c=>c.id===id);const c={id:id||uid(),name:$('clientName').value.trim(),address:$('clientAddress').value.trim(),lat:number($('clientLat').value),lng:number($('clientLng').value),open:$('clientOpen').value||'00:00',close:$('clientClose').value||'23:59',service:Math.max(1,Number($('clientService').value)||10),notes:$('clientNotes').value.trim(),selected:old?.selected??true};if(!c.name||!c.address)return alert('Nom et adresse obligatoires');if(old)Object.assign(old,c);else state.clients.push(c);if(pendingForNewClient){attachBarcodeTo(c.id,pendingForNewClient);pendingForNewClient='';}resetForm();save()});
$('resetForm').onclick=resetForm;$('filter').oninput=render;
$('clientList').onclick=e=>{const t=e.target,id=t.dataset.edit||t.dataset.delete,c=state.clients.find(c=>c.id===id);if(!c)return;if(t.dataset.edit)fillForm(c);if(t.dataset.delete&&confirm('Supprimer ce client ?')){state.clients=state.clients.filter(x=>x.id!==id);save()}};
$('clientList').onchange=e=>{if(e.target.dataset.select){const c=state.clients.find(x=>x.id===e.target.dataset.select);if(c){c.selected=e.target.checked;save()}}};
for(const b of document.querySelectorAll('nav button'))b.onclick=()=>{for(const x of document.querySelectorAll('main section'))x.hidden=x.id!==b.dataset.tab;for(const x of document.querySelectorAll('nav button'))x.classList.toggle('active',x===b)};
function route(){const selected=state.clients.filter(c=>(c.selected||state.parcels.some(p=>p.clientId===c.id&&p.day===today()&&p.status!=='delivered'))&&!state.delivered.includes(c.id));const missing=selected.filter(c=>!coord(c));const ready=selected.filter(coord);let time=minutes($('departure').value),at=state.depot,dist=0;const speed=Math.max(10,Math.min(110,Number($('speed').value)||40));const ordered=[];if(!coord(at)){return {ordered,missing:selected,warning:'Indique les coordonnées GPS du dépôt pour calculer la tournée.'}}while(ready.length){let best=null;for(const c of ready){const d=km(at,c)*1.3;const travel=Math.ceil(d/speed*60);const arrival=time+travel;const start=Math.max(arrival,minutes(c.open));const late=start+Number(c.service)>minutes(c.close);const rank=(late?100000:0)+Math.max(0,start+Number(c.service)-minutes(c.close))*1000+start*0.03+d;
if(!best||rank<best.rank)best={c,d,arrival,start,late,rank}}
const i=ready.indexOf(best.c);ready.splice(i,1);time=best.start+Number(best.c.service);dist+=best.d;at=best.c;ordered.push({...best,finish:time})}
return {ordered,missing,dist,warning:null}}
$('optimize').onclick=()=>{const r=route();let html='';if(r.warning)html+=`<p class="warn">${esc(r.warning)}</p>`;if(r.ordered.length)html+=`<p><strong>${r.ordered.length} arrêts calculés • ~${Math.round(r.dist)} km estimés</strong></p>`;r.ordered.forEach((s,i)=>{const c=s.c;const packs=activeParcels(c.id);html+=`<div class="item"><strong>${i+1}. ${esc(c.name)} <span class="badge">${clock(s.start)}</span></strong><div class="meta">${esc(c.address)} • 📦 ${packs.length} colis<br>Arrivée estimée ${clock(s.arrival)} • Fin ${clock(s.finish)} • Ferme à ${esc(c.close)} • ~${s.d.toFixed(1)} km</div>${s.late?'<p class="warn">⚠️ Risque de fermeture avant la fin de livraison</p>':''}<div class="actions"><a href="${esc(nav(c))}" target="_blank" rel="noopener">Naviguer</a><button data-delivered="${esc(c.id)}">Livré ✓</button></div></div>`});if(r.missing.length)html+=`<p class="warn">${r.missing.length} client(s) sans coordonnées GPS : non optimisés. Ajoute leurs coordonnées dans Clients.</p>`+r.missing.map(c=>`<div class="item"><strong>${esc(c.name)}</strong><div class="meta">${esc(c.address)}</div><a href="${esc(nav(c))}" target="_blank" rel="noopener">Ouvrir Google Maps</a></div>`).join('');if(!r.ordered.length&&!r.missing.length)html+='<p>Sélectionne des clients dans l’onglet Clients.</p>';$('route').innerHTML=html};
$('route').onclick=e=>{const id=e.target.dataset.delivered;if(id){state.delivered.push(id);state.parcels.filter(p=>p.clientId===id&&p.day===today()).forEach(p=>p.status='delivered');save();$('optimize').click()}};
function showDepot(){for(const [id,v] of Object.entries({depotName:state.depot.name,depotAddress:state.depot.address,depotLat:state.depot.lat??'',depotLng:state.depot.lng??''}))$(id).value=v}showDepot();
$('saveDepot').onclick=()=>{state.depot={name:$('depotName').value.trim(),address:$('depotAddress').value.trim(),lat:number($('depotLat').value),lng:number($('depotLng').value)};save();alert('Dépôt enregistré')};
function csvRows(text){const first=text.split(/\r?\n/,1)[0];const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';let rows=[],row=[],field='',quote=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){field+='"';i++}else quote=!quote}else if(!quote&&(ch===delimiter||ch==='\n')){row.push(field.trim());field='';if(ch==='\n'){rows.push(row);row=[]}}else if(ch!=='\r'||quote)field+=ch}row.push(field.trim());if(row.some(Boolean))rows.push(row);const header=rows.shift().map(x=>x.toLowerCase().replace(/^\ufeff/,'').trim());return rows.map(values=>Object.fromEntries(header.map((h,i)=>[h,values[i]||''])))}
function extractJSON(data){const out=[];const walk=(v,depth=0)=>{if(depth>12||!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return}const name=v.title||v.name||v.nom||v.placeName;const address=v.address||v.adresse||v.location?.address||v.properties?.address;const url=v.url||v.googleMapsUrl||v.location?.geoUri||'';let lat=number(v.latitude??v.lat??v.location?.latitude),lng=number(v.longitude??v.lng??v.location?.longitude);const match=String(url).match(/(?:@|!3d)(-?\d+\.\d+)[,!](?:!4d)?(-?\d+\.\d+)/);if(match){lat=lat??Number(match[1]);lng=lng??Number(match[2])}if(name&&(address||url)){out.push({name,address:address||String(url),latitude:lat,longitude:lng})}for(const [k,x] of Object.entries(v))if(typeof x==='object'&&k!=='geometry')walk(x,depth+1)};walk(data);return out}
function normalized(x){const name=x.name||x.nom||x.title||x.placeName||'',address=x.address||x.adresse||x.url||'';return {id:uid(),name:String(name).trim(),address:String(address).trim(),lat:number(x.latitude??x.lat),lng:number(x.longitude??x.lng),open:x.open||x.ouverture||'08:00',close:x.close||x.fermeture||'17:00',service:Math.max(1,Number(x.service||x.duree||10)),notes:'',selected:false}}
$('importButton').onclick=async()=>{const file=$('importFile').files[0];if(!file)return alert('Choisis un fichier CSV ou JSON');try{const text=await file.text(),raw=file.name.toLowerCase().endsWith('.csv')?csvRows(text):extractJSON(JSON.parse(text));const incoming=raw.map(normalized).filter(x=>x.name&&x.address);let count=0;for(const c of incoming){if(!state.clients.some(x=>x.name.toLowerCase()===c.name.toLowerCase()&&x.address.toLowerCase()===c.address.toLowerCase())){state.clients.push(c);count++}}save();$('importStatus').textContent=`${count} client(s) importé(s), ${incoming.length-count} doublon(s). Vérifie les adresses et coordonnées.`}catch(err){$('importStatus').textContent='Import impossible : '+err.message}};
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const csvCell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
$('exportButton').onclick=()=>download('clients-tournee.csv','\ufeff'+['name,address,latitude,longitude,open,close,service',...state.clients.map(c=>[c.name,c.address,c.lat,c.lng,c.open,c.close,c.service].map(csvCell).join(','))].join('\r\n'),'text/csv;charset=utf-8');
$('backupButton').onclick=()=>download('sauvegarde-tournee.json',JSON.stringify(state,null,2),'application/json');
$('restoreButton').onclick=()=>$('restoreFile').click();
$('restoreFile').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(!Array.isArray(x.clients)||!x.depot)throw Error('Format incorrect');if(confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')){state={...initial,...x,parcels:Array.isArray(x.parcels)?x.parcels:[]};save();showDepot()}}catch(err){alert('Sauvegarde invalide : '+err.message)}};
$('clearAll').onclick=()=>{if(confirm('Effacer définitivement toutes les données locales ?')){state=structuredClone(initial);save();showDepot();$('route').innerHTML=''}};
render();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

// V2 : colis et lecture code-barres. Aucun appel à un serveur.
let pendingForNewClient='';let cameraStream=null;let scanTimer=null;let scanBusy=false;let lastDetected='';
function activeParcels(clientId){return state.parcels.filter(p=>p.clientId===clientId&&p.day===today()&&p.status!=='delivered')}
function renderParcels(){
 const parcels=state.parcels.filter(p=>p.day===today());
 $('parcelCount').textContent=`(${parcels.length})`;
 $('parcelList').innerHTML=parcels.map(p=>{const c=state.clients.find(x=>x.id===p.clientId);return `<div class="item"><strong>${esc(p.code)}</strong><div class="meta">${esc(c?.name||'Client supprimé')} • ${p.status==='delivered'?'Livré':'À livrer'}</div><div class="actions"><button data-parcel-status="${esc(p.id)}">${p.status==='delivered'?'Remettre à livrer':'Marquer livré'}</button><button data-parcel-remove="${esc(p.id)}" class="danger">Supprimer</button></div></div>`}).join('')||'<p class="hint">Aucun colis scanné aujourd’hui.</p>';
}
function attachBarcodeTo(clientId,code){
 code=String(code||'').trim();if(!code)return false;
 const existing=state.parcels.find(p=>p.code.toLowerCase()===code.toLowerCase());
 if(existing){$('scanStatus').textContent='Ce numéro de colis existe déjà : aucun doublon ajouté.';return false}
 state.parcels.push({id:uid(),code,clientId,day:today(),status:'pending'});
 const c=state.clients.find(c=>c.id===clientId);if(c){c.selected=true;state.delivered=state.delivered.filter(x=>x!==clientId)}
 $('scanStatus').textContent=`Colis ${code} associé à ${c?.name||'ce client'} et ajouté à la tournée.`;
 $('barcode').value='';$('matchPanel').hidden=true;save();return true;
}
function lookupBarcode(){
 const code=$('barcode').value.trim();if(!code){$('scanStatus').textContent='Saisis ou scanne un numéro.';return}
 const existing=state.parcels.find(p=>p.code.toLowerCase()===code.toLowerCase());
 if(existing){const c=state.clients.find(x=>x.id===existing.clientId);$('scanStatus').textContent=`Déjà enregistré : ${c?.name||'client inconnu'} (${existing.status==='delivered'?'livré':'à livrer'}).`; $('matchPanel').hidden=true;return}
 $('scanStatus').textContent='Numéro inconnu : choisis un client existant ou crée une fiche.';
 $('matchPanel').hidden=false;populateClientChoices();
}
function populateClientChoices(){
 const q=$('clientSearchBarcode').value.trim().toLowerCase();const matches=state.clients.filter(c=>(c.name+' '+c.address).toLowerCase().includes(q));
 $('barcodeClient').innerHTML=matches.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.address)}</option>`).join('')||'<option value="">Aucun client trouvé</option>';
}
$('lookupBarcode').onclick=lookupBarcode;
$('barcode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookupBarcode()}});
$('clientSearchBarcode').oninput=populateClientChoices;
$('attachParcel').onclick=()=>{const id=$('barcodeClient').value;if(!id)return alert('Sélectionne un client ou crée une fiche.');attachBarcodeTo(id,$('barcode').value)};
$('createClientParcel').onclick=()=>{const code=$('barcode').value.trim();if(!code)return alert('Scanne ou saisis le numéro du colis.');pendingForNewClient=code;resetForm();document.querySelector('[data-tab="clients"]').click();$('clientName').focus();alert('Crée la fiche client puis clique sur Enregistrer. Le colis sera associé automatiquement.')};
$('parcelList').onclick=e=>{const id=e.target.dataset.parcelStatus||e.target.dataset.parcelRemove,p=state.parcels.find(p=>p.id===id);if(!p)return;if(e.target.dataset.parcelRemove){if(!confirm('Supprimer ce colis ?'))return;state.parcels=state.parcels.filter(x=>x.id!==id)}else{p.status=p.status==='delivered'?'pending':'delivered';if(p.status==='pending'){state.delivered=state.delivered.filter(x=>x!==p.clientId);const c=state.clients.find(c=>c.id===p.clientId);if(c)c.selected=true}}save()};
function stopCamera(){if(scanTimer){clearTimeout(scanTimer);scanTimer=null}if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}$('camera').srcObject=null;$('camera').hidden=true;scanBusy=false}
$('stopScan').onclick=stopCamera;
$('startScan').onclick=async()=>{
 stopCamera();
 if(!navigator.mediaDevices?.getUserMedia){$('scanStatus').textContent='Caméra indisponible. Ouvre le site en HTTPS dans Safari ou utilise la saisie manuelle.';return}
 if(!('BarcodeDetector' in window)){$('scanStatus').textContent='La lecture automatique des codes-barres n’est pas disponible sur ce navigateur. Tu peux saisir le numéro manuellement.';return}
 try{
  const supported=await BarcodeDetector.getSupportedFormats();const formats=['code_128','code_39','ean_13','ean_8','itf','qr_code','pdf417','data_matrix','upc_a'].filter(x=>supported.includes(x));
  if(!formats.length)throw Error('Aucun format compatible');
  const detector=new BarcodeDetector({formats});
  cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  $('camera').srcObject=cameraStream;$('camera').hidden=false;await $('camera').play();$('scanStatus').textContent='Caméra active : présente un code-barres.';
  const tick=async()=>{if(!cameraStream)return;if(!scanBusy&&$('camera').readyState>=2){scanBusy=true;try{const codes=await detector.detect($('camera'));const code=codes[0]?.rawValue;if(code&&code!==lastDetected){lastDetected=code;$('barcode').value=code;stopCamera();lookupBarcode();return}}catch{}finally{scanBusy=false}}scanTimer=setTimeout(tick,220)};tick();
 }catch(e){stopCamera();$('scanStatus').textContent='Impossible de démarrer la caméra : '+e.message+'. Utilise la saisie manuelle.'}
};
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab!=='scan')stopCamera()}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});
