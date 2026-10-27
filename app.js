'use strict';
const $=id=>document.getElementById(id), KEY='tournee_data_v2', OLD_KEY='tournee_data_v1';
const initial={clients:[],depot:{name:'Mon dépôt',address:'',lat:null,lng:null},delivered:[],parcels:[],operations:[],date:''};
let state;try{state={...initial,...JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY)||'{}')}}catch{state=structuredClone(initial)}
const today=()=>new Date().toLocaleDateString('sv-SE');
if(!Array.isArray(state.parcels))state.parcels=[];if(!Array.isArray(state.operations))state.operations=[];if(state.date!==today()){state.delivered=[];state.date=today()}
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
 $('selectedCount').textContent=`(${state.clients.filter(c=>c.selected).length})`;renderParcels();renderDaily();
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
// V3: routage OSRM : distances et durées routières, sans trafic. Aucun fallback trompeur.
let lastRoute=null, currentPosition=null;
async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error('Service indisponible ('+r.status+')');return r.json()}
async function roadRoute(points){const coords=points.map(p=>p.lng+','+p.lat).join(';');const data=await getJSON('https://router.project-osrm.org/route/v1/driving/'+coords+'?overview=false&steps=false');if(data.code!=='Ok'||!data.routes?.[0])throw Error('Aucun itinéraire routier trouvé');return data.routes[0]}
async function roadTable(points){
 const coords=points.map(p=>p.lng+','+p.lat).join(';');
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch('https://router.project-osrm.org/table/v1/driving/'+coords+'?annotations=duration,distance',{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('Service routier indisponible (HTTP '+response.status+').');
  const data=await response.json();
  if(data.code!=='Ok'||!Array.isArray(data.durations)||!Array.isArray(data.distances))throw Error('Distances routières indisponibles.');
  return data;
 }catch(e){if(e.name==='AbortError')throw Error('Le calcul a dépassé 20 secondes. Réessaie avec moins de clients sélectionnés.');throw e}
 finally{clearTimeout(timeout)}
}
async function planRoad(){
 const selected=state.clients.filter(c=>(c.selected||activeParcels(c.id).length||pendingOperation(c.id))&&!state.delivered.includes(c.id));
 const origin=state.depot;
 if(!coord(origin))throw Error('Définis les coordonnées GPS du dépôt dans Dépôt / Import.');
 const missing=selected.filter(c=>!coord(c)),ready=selected.filter(coord);
 if(!ready.length)throw Error('Aucun client avec coordonnées GPS. Recherche leurs adresses dans Clients.');
 if(ready.length>49)throw Error('Maximum 49 arrêts par calcul. Sélectionne moins de clients.');
 const matrix=await roadTable([origin,...ready]);
 let remaining=ready.map((c,i)=>({c,index:i+1})),at=0,time=minutes($('departure').value),ordered=[],totalMeters=0,totalSeconds=0;
 while(remaining.length){
  let best=null;
  for(const item of remaining){
   const duration=matrix.durations[at]?.[item.index],distance=matrix.distances[at]?.[item.index];
   if(!Number.isFinite(duration)||!Number.isFinite(distance))continue;
   const travel=Math.ceil(duration/60),arrival=time+travel,start=Math.max(arrival,minutes(item.c.open)),late=start+Number(item.c.service)>minutes(item.c.close);
   const rank=(late?100000:0)+Math.max(0,start+Number(item.c.service)-minutes(item.c.close))*1000+start*.03+distance/1000;
   if(!best||rank<best.rank)best={...item,travel,arrival,start,late,rank,d:distance/1000,meters:distance,seconds:duration};
  }
  if(!best)throw Error('Certains clients sont inaccessibles par la route.');
  remaining=remaining.filter(x=>x!==best);
  totalMeters+=best.meters;totalSeconds+=best.seconds;
  time=best.start+Number(best.c.service);ordered.push({...best,finish:time});at=best.index;
 }
 const returnSeconds=matrix.durations[at]?.[0],returnMeters=matrix.distances[at]?.[0];
 if(!Number.isFinite(returnSeconds)||!Number.isFinite(returnMeters))throw Error('Retour au dépôt impossible par la route.');
 totalMeters+=returnMeters;totalSeconds+=returnSeconds;
 return {ordered,missing,totalKm:totalMeters/1000,totalDriveMinutes:Math.ceil(totalSeconds/60),returnKm:returnMeters/1000,returnMinutes:Math.ceil(returnSeconds/60),returnAt:time+Math.ceil(returnSeconds/60)};
}
function displayRoad(result){
 lastRoute=result;
 const {ordered,missing,totalKm,totalDriveMinutes,returnKm,returnMinutes,returnAt}=result;
 let html=`<p><strong>${ordered.length} arrêts • ${totalKm.toFixed(1)} km sur route (retour compris) • ${totalDriveMinutes} min de conduite estimée (hors arrêts)</strong></p><p class="hint">Calcul indicatif sans trafic, d'après les distances routières. Respecte les règles de circulation et vérifie les horaires.</p>`;
 ordered.forEach((s,i)=>{const c=s.c;html+=`<div class="item"><strong>${i+1}. ${esc(c.name)} <span class="badge">${clock(s.start)}</span></strong><div class="meta">${esc(c.address)} • 📦 ${activeParcels(c.id).length} scanné(s) • ${operationSummary(c.id)}<br>Arrivée ${clock(s.arrival)} • Fin ${clock(s.finish)} • Ferme à ${esc(c.close)} • ${s.d.toFixed(1)} km par route</div>${s.late?'<p class="warn">⚠️ Horaire de fermeture non respecté</p>':''}<div class="actions"><a href="${esc(nav(c))}" target="_blank" rel="noopener">Naviguer</a><button data-delivered="${esc(c.id)}">Valider livraison / ramassage ✓</button></div></div>`});
 html+=`<div class="item"><strong>🏠 Retour au dépôt — ${esc(state.depot.name||'Dépôt')}</strong><div class="meta">${returnKm.toFixed(1)} km par route • ${returnMinutes} min • Retour estimé à ${clock(returnAt)}</div></div>`;
 if(missing.length)html+=`<p class="warn">${missing.length} adresse(s) sans GPS, non incluses dans la tournée. Recherche-les dans Clients.</p>`;
 $('route').innerHTML=html;
}
$('optimize').onclick=async()=>{
 const b=$('optimize');if(b.disabled)return;
 b.disabled=true;$('routeStatus').textContent='Calcul des distances routières (20 secondes maximum)…';
 try{const result=await planRoad();displayRoad(result);$('routeStatus').textContent='Tournée calculée, retour au dépôt inclus.'}
 catch(e){$('routeStatus').textContent='Impossible de calculer : '+(e?.message||'erreur inconnue');$('route').innerHTML='<p class="warn">Aucune tournée routière disponible. Vérifie les coordonnées GPS et réessaie avec moins d’arrêts.</p>'}
 finally{b.disabled=false}
};
$('locate').onclick=()=>{if(!navigator.geolocation){$('routeStatus').textContent='GPS non disponible';return}navigator.geolocation.getCurrentPosition(p=>{currentPosition={lat:p.coords.latitude,lng:p.coords.longitude};$('routeStatus').textContent='Position GPS détectée. Le calcul de la tournée part toujours du dépôt enregistré.'},e=>$('routeStatus').textContent='GPS : '+e.message,{enableHighAccuracy:true,timeout:15000})};
// V3.1 : clé saisie dans l'app, jamais dans les fichiers GitHub publics.
const GEO_KEY_STORAGE='tournee_geoapify_key';
const geoKey=()=>localStorage.getItem(GEO_KEY_STORAGE)||'';
$('geoKey').value=geoKey();
$('geoKeyStatus').textContent=geoKey()?'Clé enregistrée sur cet appareil.':'Clé non configurée.';
$('saveGeoKey').onclick=()=>{const key=$('geoKey').value.trim();if(!key)return alert('Colle ta clé Geoapify.');localStorage.setItem(GEO_KEY_STORAGE,key);$('geoKeyStatus').textContent='Clé enregistrée sur cet appareil. Tu peux maintenant chercher des entreprises.'};
$('clearGeoKey').onclick=()=>{localStorage.removeItem(GEO_KEY_STORAGE);$('geoKey').value='';$('geoKeyStatus').textContent='Clé effacée.'};
function geoUrl(endpoint,params){const key=geoKey();if(!key)throw Error('Ajoute d’abord ta clé dans Dépôt / Import.');const u=new URL('https://api.geoapify.com/v1/geocode/'+endpoint);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);u.searchParams.set('apiKey',key);return u.toString()}
function geoItems(data){return (data.features||[]).map(f=>({lat:Number(f.properties?.lat??f.geometry?.coordinates?.[1]),lng:Number(f.properties?.lon??f.geometry?.coordinates?.[0]),address:f.properties?.formatted||'',name:f.properties?.name||f.properties?.address_line1||''})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&x.address)}
function chooseGeo(item,addressId,latId,lngId,statusId,listId,company=false){
 if(company){$('clientName').value=item.name&&item.name!==item.address?item.name:$('clientName').value}
 $(addressId).value=item.address;$(latId).value=item.lat;$(lngId).value=item.lng;
 $(statusId).textContent='📍 Adresse et coordonnées remplies. Appuie sur Enregistrer pour les conserver.';
 $(listId).replaceChildren();if(company)$('clientSuggestions').replaceChildren();
}
function renderGeoChoices(items,addressId,latId,lngId,statusId,listId,company=false){
 const list=$(listId);list.replaceChildren();for(const item of items.slice(0,7)){
  const b=document.createElement('button');b.type='button';b.className='geo-choice';
  b.textContent=(item.name&&item.name!==item.address?item.name+' — ':'')+item.address;
  b.onclick=()=>chooseGeo(item,addressId,latId,lngId,statusId,listId,company);list.appendChild(b)
 }
}
const geoTimers=new Map(),geoRequests=new Map();
async function geoLookup(q,addressId,latId,lngId,statusId,listId,mode='autocomplete'){
 const seq=(geoRequests.get(listId)||0)+1;geoRequests.set(listId,seq);
 if(q.trim().length<3){$(listId).replaceChildren();$(statusId).textContent='';return}
 $(statusId).textContent='Recherche en cours…';
 try{
  const params={text:q.trim(),filter:'countrycode:fr',limit:'7',format:'geojson'};
  // La recherche par nom utilise le géocodage texte ; la couverture des établissements varie.
  const url=geoUrl(mode==='autocomplete'?'autocomplete':'search',params);
  const data=await getJSON(url);if(geoRequests.get(listId)!==seq)return;
  const items=geoItems(data);
  renderGeoChoices(items,addressId,latId,lngId,statusId,listId,mode==='company');
  $(statusId).textContent=items.length?'Touche le bon résultat pour remplir l’adresse et le GPS.':
    mode==='company'?'Entreprise introuvable : essaie avec la ville ou recherche directement son adresse.':'Aucun résultat : précise la rue ou la ville.';
 }catch(e){if(geoRequests.get(listId)!==seq)return;$(statusId).textContent='Recherche impossible : '+e.message;$(listId).replaceChildren()}
}
function attachGeo(inputId,addressId,latId,lngId,statusId,listId,mode){
 $(inputId).addEventListener('input',()=>{
  clearTimeout(geoTimers.get(listId));geoRequests.set(listId,(geoRequests.get(listId)||0)+1);
  $(latId).value='';$(lngId).value='';$(listId).replaceChildren();
  const q=$(inputId).value;
  if(q.trim().length<3){$(statusId).textContent='';return}
  geoTimers.set(listId,setTimeout(()=>geoLookup(q,addressId,latId,lngId,statusId,listId,mode),400));
 });
}
attachGeo('clientName','clientAddress','clientLat','clientLng','companyGeoStatus','companySuggestions','company');
attachGeo('clientAddress','clientAddress','clientLat','clientLng','clientGeoStatus','clientSuggestions','autocomplete');
attachGeo('depotAddress','depotAddress','depotLat','depotLng','depotGeoStatus','depotSuggestions','autocomplete');
$('searchClientAddress').onclick=()=>geoLookup($('clientAddress').value||$('clientName').value,'clientAddress','clientLat','clientLng','clientGeoStatus','clientSuggestions','search');
$('searchDepotAddress').onclick=()=>geoLookup($('depotAddress').value,'depotAddress','depotLat','depotLng','depotGeoStatus','depotSuggestions','search');
$('route').onclick=e=>{const id=e.target.dataset.delivered;if(!id)return;const c=state.clients.find(x=>x.id===id);if(!c)return;const op=getOperation(id);const scanned=activeParcels(id).length;const delivery=op?.delivery||0,pickup=op?.pickup||0;if(!confirm(`Valider ${c.name} ?\n${delivery+scanned} colis à livrer (${scanned} scannés), ${pickup} à récupérer.`))return;const record=op||{id:uid(),clientId:id,day:today(),delivery:0,pickup:0};if(!op)state.operations.push(record);record.done=true;record.completedAt=new Date().toISOString();record.scannedDelivered=scanned;state.parcels.filter(p=>p.clientId===id&&p.day===today()&&p.status!=='delivered').forEach(p=>p.status='delivered');if(!state.delivered.includes(id))state.delivered.push(id);save();$('optimize').click()};
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
$('restoreFile').onchange=async e=>{try{const x=JSON.parse(await e.target.files[0].text());if(!Array.isArray(x.clients)||!x.depot)throw Error('Format incorrect');if(confirm('Remplacer toutes les données actuelles par cette sauvegarde ?')){state={...initial,...x,parcels:Array.isArray(x.parcels)?x.parcels:[],operations:Array.isArray(x.operations)?x.operations:[]};save();showDepot()}}catch(err){alert('Sauvegarde invalide : '+err.message)}};
$('clearAll').onclick=()=>{if(confirm('Effacer définitivement toutes les données locales ?')){state=structuredClone(initial);save();showDepot();$('route').innerHTML=''}};

// V3.4 : quantités manuelles et bilan journalier (conservés dans la sauvegarde JSON).
function getOperation(clientId){return state.operations.find(o=>o.day===today()&&o.clientId===clientId)}
function pendingOperation(clientId){const o=getOperation(clientId);return !!o&&!o.done&&(o.delivery>0||o.pickup>0)}
function operationSummary(clientId){const o=getOperation(clientId);return `${o?.delivery||0} livraison(s) manuelle(s) • ${o?.pickup||0} ramassage(s)`}
function renderDaily(){
 const select=$('operationClient'),previous=select.value;
 select.innerHTML='<option value="">Choisir un client</option>'+state.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 if(state.clients.some(c=>c.id===previous))select.value=previous;
 const ops=state.operations.filter(o=>o.day===today());
 const scanned=state.parcels.filter(p=>p.day===today());
 const scannedDone=scanned.filter(p=>p.status==='delivered');
 const done=ops.filter(o=>o.done);
 const delivered=done.reduce((n,o)=>n+(Number(o.delivery)||0),0)+scannedDone.length;
 const picked=done.reduce((n,o)=>n+(Number(o.pickup)||0),0);
 const deliveryPoints=new Set([...done.filter(o=>(o.delivery||0)>0||(o.scannedDelivered||0)>0).map(o=>o.clientId),...scannedDone.map(p=>p.clientId)]);
 const pickupPoints=new Set(done.filter(o=>(o.pickup||0)>0).map(o=>o.clientId));
 $('dailyReport').innerHTML=`<strong>Bilan du ${esc(today())}</strong><p>📦 ${delivered} colis livrés • 📥 ${picked} colis récupérés</p><p>📍 ${deliveryPoints.size} points de livraison • ${pickupPoints.size} points de ramassage</p><p>✅ ${done.length} arrêts validés</p><p class="hint">Les colis scannés et les quantités saisies manuellement sont additionnés. Ne saisis pas deux fois le même colis.</p>`;
 $('dailyOperations').innerHTML=ops.map(o=>{const c=state.clients.find(x=>x.id===o.clientId);return `<div class="item"><strong>${esc(c?.name||'Client supprimé')}</strong><div class="meta">📦 ${o.delivery||0} manuels • 📥 ${o.pickup||0} ramassages • ${o.done?'Validé':'À effectuer'}</div>${o.done?'':`<button data-operation-edit="${esc(o.clientId)}">Modifier</button>`}</div>`}).join('')||'<p class="hint">Aucune quantité manuelle enregistrée.</p>';
}
$('operationClient').onchange=()=>{const o=getOperation($('operationClient').value);$('operationDelivery').value=o?.delivery||0;$('operationPickup').value=o?.pickup||0};
$('saveOperation').onclick=()=>{const id=$('operationClient').value,c=state.clients.find(c=>c.id===id);if(!c)return alert('Choisis un client.');const delivery=Number($('operationDelivery').value),pickup=Number($('operationPickup').value);if(!Number.isSafeInteger(delivery)||!Number.isSafeInteger(pickup)||delivery<0||pickup<0||delivery>9999||pickup>9999)return alert('Indique des nombres de colis valides.');let o=getOperation(id);if(o?.done)return alert('Cet arrêt est déjà validé.');if(!o){o={id:uid(),clientId:id,day:today(),done:false};state.operations.push(o)}o.delivery=delivery;o.pickup=pickup;c.selected=true;state.delivered=state.delivered.filter(x=>x!==id);save();$('operationStatus').textContent='Quantités enregistrées. Recalcule la tournée pour inclure cet arrêt.'};
$('dailyOperations').onclick=e=>{const id=e.target.dataset.operationEdit;if(!id)return;$('operationClient').value=id;$('operationClient').onchange();$('operationClient').scrollIntoView({behavior:'smooth',block:'center'})};
$('exportDailyReport').onclick=()=>{const ops=state.operations.filter(o=>o.day===today()),parcels=state.parcels.filter(p=>p.day===today()&&p.status==='delivered'),rows=[['Date','Client','Colis livrés manuels','Colis livrés scannés','Colis récupérés','Arrêt validé']];for(const o of ops){const c=state.clients.find(x=>x.id===o.clientId);rows.push([today(),c?.name||'Client supprimé',o.done?o.delivery||0:0,parcels.filter(p=>p.clientId===o.clientId).length,o.done?o.pickup||0:0,o.done?'Oui':'Non'])}for(const p of parcels.filter(p=>!ops.some(o=>o.clientId===p.clientId))){const c=state.clients.find(x=>x.id===p.clientId);rows.push([today(),c?.name||'Client supprimé',0,1,0,'Oui'])}download('bilan-tournee-'+today()+'.csv','\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8')};

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
let zxingReader=null,zxingControls=null;
function stopCamera(){if(zxingControls){try{zxingControls.stop()}catch{}zxingControls=null}if(zxingReader){try{zxingReader.reset?.()}catch{}zxingReader=null}if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}const v=$('camera');if(v.srcObject){v.srcObject.getTracks().forEach(t=>t.stop());v.srcObject=null}v.hidden=true;scanBusy=false}
$('stopScan').onclick=stopCamera;
$('startScan').onclick=async()=>{stopCamera();if(!navigator.mediaDevices?.getUserMedia){$('scanStatus').textContent='Caméra indisponible : ouvre ton site HTTPS dans Safari.';return}if(!window.ZXingBrowser?.BrowserMultiFormatReader){$('scanStatus').textContent='Bibliothèque de scan non chargée. Vérifie la connexion Internet, puis actualise Safari.';return}try{$('camera').hidden=false;$('scanStatus').textContent='Ouverture de la caméra…';zxingReader=new ZXingBrowser.BrowserMultiFormatReader();zxingControls=await zxingReader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}},audio:false},$('camera'),(result,error)=>{if(result){const code=result.getText();if(!code)return;$('barcode').value=code;stopCamera();lookupBarcode()}});$('scanStatus').textContent='Caméra active : vise le code-barres.'}catch(e){stopCamera();$('scanStatus').textContent='Caméra non démarrée : '+e.message+'. Vérifie Safari et les autorisations.'}};
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab!=='scan')stopCamera()}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});
