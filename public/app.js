const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadSite(){
 const s=await fetch('/api/site').then(r=>r.json());
 $('#intro').textContent=s.intro;$('#description').textContent=s.description;$('#city').textContent=s.city;$('#contactEmail').textContent=s.email;$('#contactPhone').textContent=s.phone;$('#scheduleNote').textContent=s.scheduleNote;
 $('#advantages').innerHTML=(s.advantages||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 $('#programs').innerHTML=(s.services||[]).map(x=>`<article class="service"><div class="service-icon">${esc(x.icon||'♡')}</div><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></article>`).join('');
 $('#program').innerHTML='<option value="">Выберите занятие</option>'+(s.services||[]).map(x=>`<option>${esc(x.title)}</option>`).join('');
 $('#scheduleList').innerHTML=(s.schedule||[]).map(x=>`<article class="schedule-item"><b>${esc(x.day)} · ${esc(x.time)}</b><span>${esc(x.title)}</span></article>`).join('');
}
$('#menu').addEventListener('click',()=>$('#nav').classList.toggle('open'));
$('#year').textContent=new Date().getFullYear();
loadSite();
$('#bookingForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget;const data=Object.fromEntries(new FormData(f));data.consent=f.elements.consent.checked;
 const msg=$('#formMessage');msg.textContent='Отправляем заявку…';
 try{const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||'Не удалось отправить заявку');msg.textContent=j.message;f.reset();}
 catch(err){msg.textContent=err.message;}
});
