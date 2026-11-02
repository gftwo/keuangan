(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const LS = 'tugasPro.v2';

  const PROJ_COLORS = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'];
  const PRI_RANK = { high:0, med:1, low:2, none:3 };

  // ---- date utils ----
  function isoOf(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  const todayISO = () => isoOf(new Date());
  function parseISO(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
  function fmtDate(iso){
    if(!iso) return '';
    const d = parseISO(iso), now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.round((d - now)/86400000);
    if(diff===0) return 'Hari ini';
    if(diff===1) return 'Besok';
    if(diff===-1) return 'Kemarin';
    if(diff>1 && diff<7) return d.toLocaleDateString('id-ID',{weekday:'long'});
    if(diff<-1 && diff>-7) return Math.abs(diff)+' hari lalu';
    return d.toLocaleDateString('id-ID',{day:'numeric',month:'short'});
  }
  function fmtDateFull(iso){ const d=parseISO(iso); return d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'}); }
  function fmtCompletedAt(ts){
    if(!ts) return '';
    const d=new Date(ts);
    return d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  }
  function dueClass(iso, done){
    if(!iso||done) return '';
    const d=parseISO(iso), now=new Date(); now.setHours(0,0,0,0);
    if(d<now) return 'due-over';
    if(d.getTime()===now.getTime()) return 'due-today';
    return '';
  }

  // ---- state ----
  let state = load();
  let view = { type:'smart', id:'today' };
  let filter = 'all';
  let sortBy = 'manual';
  let search = '';
  let editingId = null;   // null = add mode
  let draftSubs = [];     // subtasks buffer while editing
  let loopMode = 'completion';
  let pendingDelete = null;
  let selectedSwatch = PROJ_COLORS[0];

  function load(){
    let s = null;
    try { const raw = localStorage.getItem(LS); if(raw) s = JSON.parse(raw); } catch(e){}
    if(!s || typeof s !== 'object') return seed();
    // Firebase Realtime Database membuang array kosong ([]) saat disimpan — kalau semua
    // tugas/proyek dihapus, field ini bisa jadi undefined. Pulihkan supaya gak crash.
    if(!Array.isArray(s.tasks)) s.tasks = [];
    if(!Array.isArray(s.projects)) s.projects = [];
    s.tasks.forEach(t => { if(!Array.isArray(t.subtasks)) t.subtasks = []; if(!Array.isArray(t.tags)) t.tags = []; });
    return s;
  }
  function save(){ try { localStorage.setItem(LS, JSON.stringify(state)); } catch(e){} try { if(window.TugasProBridge && window.TugasProBridge.notifyChange) window.TugasProBridge.notifyChange(); } catch(e){ console.warn('TugasProBridge sync gagal (diabaikan):', e); } }

  function seed(){
    const p1 = uid(), p2 = uid(), p3 = uid();
    const t = (o) => Object.assign({ id:uid(), title:'', done:false, priority:'none', due:null, project:null, tags:[], subtasks:[], notes:'', repeat:null, created:Date.now(), order:0 }, o);
    const plus = n => { const d=new Date(); d.setDate(d.getDate()+n); return isoOf(d); };
    return {
      projects: [
        { id:p1, name:'Pribadi', color:PROJ_COLORS[1] },
        { id:p2, name:'Kerja', color:PROJ_COLORS[2] },
        { id:p3, name:'Belanja', color:PROJ_COLORS[4] },
      ],
      tasks: [
        t({ title:'Nyapu rumah', priority:'low', due:plus(-1), project:p1, tags:['rutin'], repeat:{interval:3,unit:'day',from:'completion'}, order:0 }),
        t({ title:'Review desain aplikasi keuangan', priority:'high', due:plus(0), project:p2, tags:['desain'], order:1,
            subtasks:[{id:uid(),title:'Cek layout dashboard',done:true},{id:uid(),title:'Kumpulin feedback',done:false}] }),
        t({ title:'Bales email klien', priority:'med', due:plus(0), project:p2, order:2 }),
        t({ title:'Olahraga 30 menit', priority:'low', due:plus(0), project:p1, tags:['sehat'], repeat:{interval:1,unit:'day',from:'completion'}, order:3 }),
        t({ title:'Bayar tagihan listrik', priority:'high', due:plus(-2), project:p1, order:4 }),
        t({ title:'Beli kopi & susu', due:plus(2), project:p3, tags:['dapur'], order:5 }),
        t({ title:'Rencanakan liburan akhir bulan', priority:'low', due:plus(6), project:p1, notes:'Cari tiket + penginapan', order:6 }),
        t({ title:'Setor laporan mingguan', priority:'med', due:plus(3), project:p2, tags:['coding'], repeat:{interval:1,unit:'week',from:'schedule'}, order:7 }),
        t({ title:'Baca 20 halaman buku', done:true, project:p1, tags:['sehat'], order:8 }),
      ]
    };
  }

  function icons(){ if(window.lucide) window.lucide.createIcons(); }

  // ---- REPEAT ----
  function unitID(u){ return {day:'hari',week:'minggu',month:'bulan'}[u]||'hari'; }
  function repeatLabel(r){
    if(!r) return '';
    const u=unitID(r.unit);
    return r.interval===1 ? `tiap ${u}` : `tiap ${r.interval} ${u}`;
  }
  function stepDate(d, r){
    if(r.unit==='day') d.setDate(d.getDate()+r.interval);
    else if(r.unit==='week') d.setDate(d.getDate()+r.interval*7);
    else if(r.unit==='month') d.setMonth(d.getMonth()+r.interval);
  }
  function advanceRepeat(t){
    const r=t.repeat; if(!r) return;
    const today=new Date(); today.setHours(0,0,0,0);
    let base;
    if(r.from==='schedule' && t.due){
      base=parseISO(t.due);
      do { stepDate(base, r); } while(base<=today);
    } else {
      base=new Date(today); stepDate(base, r);
    }
    t.due=isoOf(base);
    (t.subtasks||[]).forEach(s=>s.done=false);
    t.done=false;
  }
  // hitung preview tanggal berikutnya untuk form
  function previewNext(r, dueIso){
    const today=new Date(); today.setHours(0,0,0,0);
    let base;
    if(r.from==='schedule' && dueIso){ base=parseISO(dueIso); do{ stepDate(base,r);}while(base<=today); }
    else { base=new Date(today); stepDate(base,r); }
    return isoOf(base);
  }

  // ---- SMART LISTS ----
  const startOfToday = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
  const SMART = [
    { id:'today', name:'Hari Ini', icon:'sun', match:(t)=> (!t.done && t.due && parseISO(t.due) <= startOfToday()) || (t.due===todayISO()) || (t.done && t.completedAt && new Date(t.completedAt).setHours(0,0,0,0) === startOfToday().getTime()) },
    { id:'upcoming', name:'Akan Datang', icon:'calendar-clock', match:(t)=> t.due && parseISO(t.due) > startOfToday() },
    { id:'all', name:'Semua Tugas', icon:'inbox', match:()=> true },
    { id:'flagged', name:'Prioritas', icon:'flag', match:(t)=> t.priority==='high' || t.priority==='med' },
    { id:'recurring', name:'Berulang', icon:'repeat', match:(t)=> !!t.repeat },
    { id:'completed', name:'Selesai', icon:'check-circle-2', match:(t)=> t.done },
  ];

  function tasksForView(){
    let list = state.tasks.slice();
    if(view.type==='smart'){ const s=SMART.find(x=>x.id===view.id); list=list.filter(s.match); }
    else { list = list.filter(t=> t.project===view.id); }
    return list;
  }
  function applyFilterSort(list){
    if(view.id!=='completed'){
      if(filter==='active') list=list.filter(t=>!t.done);
      else if(filter==='done') list=list.filter(t=>t.done);
    }
    if(search){
      const q=search.toLowerCase();
      list=list.filter(t=> t.title.toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q) || (t.tags||[]).some(tg=>tg.toLowerCase().includes(q)));
    }
    const s=sortBy;
    list.sort((a,b)=>{
      if(s==='manual') return (a.order||0)-(b.order||0);
      if(s==='due'){ if(!a.due) return 1; if(!b.due) return -1; return a.due.localeCompare(b.due); }
      if(s==='priority') return PRI_RANK[a.priority]-PRI_RANK[b.priority];
      if(s==='created') return b.created-a.created;
      if(s==='alpha') return a.title.localeCompare(b.title);
      return 0;
    });
    return list;
  }

  // ---- SIDEBAR ----
  function renderSide(){
    const sn=$('#smartNav'); sn.innerHTML='';
    SMART.forEach(s=>{
      const count=state.tasks.filter(t=> s.match(t) && (s.id==='completed'?true:!t.done)).length;
      const b=document.createElement('button'); b.type='button';
      b.className='nav-item'+(view.type==='smart'&&view.id===s.id?' active':'');
      b.innerHTML=`<i data-lucide="${s.icon}" class="ico"></i><span class="label">${s.name}</span><span class="count">${count||''}</span>`;
      b.onclick=()=>{ view={type:'smart',id:s.id}; filter='all'; syncFilterSeg(); closeDrawer(); render(); };
      sn.appendChild(b);
    });
    const pn=$('#projNav'); pn.innerHTML='';
    state.projects.forEach(p=>{
      const count=state.tasks.filter(t=> t.project===p.id && !t.done).length;
      const b=document.createElement('button'); b.type='button';
      b.className='nav-item'+(view.type==='proj'&&view.id===p.id?' active':'');
      b.innerHTML=`<span class="proj-dot" style="background:${p.color}"></span><span class="label">${esc(p.name)}</span><span class="count">${count||''}</span><span class="proj-del" title="Hapus proyek"><i data-lucide="x" style="width:14px;height:14px"></i></span>`;
      b.onclick=(e)=>{ if(e.target.closest('.proj-del')){ delProject(p.id); return; } view={type:'proj',id:p.id}; filter='all'; syncFilterSeg(); closeDrawer(); render(); };
      pn.appendChild(b);
    });
    icons();
  }
  function delProject(id){
    const p=state.projects.find(x=>x.id===id);
    if(!confirm(`Hapus proyek "${p.name}"? Tugas di dalamnya jadi tanpa proyek.`)) return;
    state.projects=state.projects.filter(x=>x.id!==id);
    state.tasks.forEach(t=>{ if(t.project===id) t.project=null; });
    if(view.type==='proj'&&view.id===id) view={type:'smart',id:'today'};
    save(); fillProjSelects(); render();
  }

  // ---- RENDER MAIN ----
  function render(){
    let title='';
    if(view.type==='smart'){ title=SMART.find(x=>x.id===view.id).name; }
    else { const p=state.projects.find(x=>x.id===view.id); title=p?p.name:'Proyek'; }
    $('#viewTitle').textContent=title;
    $('#viewDate').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    renderSide();

    let list=applyFilterSort(tasksForView());
    const scroll=$('#scroll'); scroll.innerHTML='';

    const base=tasksForView();
    const doneN=base.filter(t=>t.done).length;
    const pct=base.length?doneN/base.length:0;
    $('#ring').style.setProperty('--pct',pct.toFixed(3));
    $('#ring').classList.toggle('ring-complete', base.length > 0 && pct === 1);
    $('#progNum').textContent=Math.round(pct*100)+'%';
    $('#progLbl').textContent = base.length === 0 ? 'Belum ada tugas' : (pct === 1 ? `🎉 ${doneN}/${base.length} beres semua!` : `${doneN}/${base.length} selesai`);

    if(list.length===0){ scroll.appendChild(emptyState()); icons(); bindEmptyCta(); return; }

    const useGroups= sortBy==='due' || view.id==='today' || view.id==='upcoming' || view.id==='all';
    if(view.type==='proj' || !useGroups){
      const act=list.filter(t=>!t.done), dn=list.filter(t=>t.done);
      act.forEach((t,i)=>scroll.appendChild(taskEl(t,i)));
      if(dn.length){ scroll.appendChild(groupHead('Selesai',dn.length,false)); dn.forEach((t,i)=>scroll.appendChild(taskEl(t,i+act.length))); }
    } else { groupByDate(list, scroll); }
    icons(); enableDnD();
  }

  function groupByDate(list, scroll){
    const now=startOfToday();
    const b={overdue:[],today:[],soon:[],later:[],nodate:[],done:[]};
    list.forEach(t=>{
      if(t.done){ b.done.push(t); return; }
      if(!t.due){ b.nodate.push(t); return; }
      const diff=Math.round((parseISO(t.due)-now)/86400000);
      if(diff<0) b.overdue.push(t); else if(diff===0) b.today.push(t); else if(diff<=7) b.soon.push(t); else b.later.push(t);
    });
    const defs=[['overdue','Terlewat',true],['today','Hari Ini',false],['soon','7 Hari ke Depan',false],['later','Nanti',false],['nodate','Tanpa Tenggat',false],['done','Selesai',false]];
    let idx=0;
    defs.forEach(([k,label,over])=>{ if(b[k].length){ scroll.appendChild(groupHead(label,b[k].length,over)); b[k].forEach(t=>scroll.appendChild(taskEl(t,idx++))); } });
  }
  function groupHead(label,n,over){ const el=document.createElement('div'); el.className='group-head'+(over?' overdue':''); el.innerHTML=`<span>${label}</span><span class="gcount">${n}</span><span class="line"></span>`; return el; }

  function taskEl(t,i){
    const el=document.createElement('div');
    el.className='task'+(t.done?' done':''); el.dataset.id=t.id;
    el.style.animationDelay=Math.min(i,12)*22+'ms'; el.draggable=false;
    let checkCls=t.priority==='high'?'pri-hi':t.priority==='med'?'pri-md':'';
    if(t.repeat) checkCls+=' is-loop';
    const proj=state.projects.find(p=>p.id===t.project);
    const dc=dueClass(t.due,t.done);
    const subDone=(t.subtasks||[]).filter(s=>s.done).length;
    let meta='';
    if(t.due){ const ico=dc==='due-over'?'alert-circle':'calendar'; meta+=`<span class="badge ${dc}"><i data-lucide="${ico}" class="ico"></i>${fmtDate(t.due)}</span>`; }
    if(t.repeat) meta+=`<span class="badge loop"><i data-lucide="repeat" class="ico"></i>${repeatLabel(t.repeat)}</span>`;
    if(t.priority!=='none'){ const m={high:['hi','Tinggi'],med:['md','Sedang'],low:['lo','Rendah']}; meta+=`<span class="badge pri ${m[t.priority][0]}">${m[t.priority][1]}</span>`; }
    if(proj) meta+=`<span class="badge proj"><span class="proj-dot" style="background:${proj.color}"></span>${esc(proj.name)}</span>`;
    if((t.subtasks||[]).length) meta+=`<span class="badge sub"><i data-lucide="list-checks" class="ico"></i>${subDone}/${t.subtasks.length}</span>`;
    if(t.notes) meta+=`<span class="badge"><i data-lucide="align-left" class="ico"></i></span>`;
    if(t.done && t.completedAt) meta+=`<span class="badge" style="opacity:.85"><i data-lucide="check-circle-2" class="ico"></i>Selesai ${fmtCompletedAt(t.completedAt)}</span>`;
    (t.tags||[]).forEach(tg=> meta+=`<span class="badge tag">#${esc(tg)}</span>`);
    el.innerHTML=`
      <span class="drag-h" title="Geser untuk urutkan"><i data-lucide="grip-vertical" style="width:16px;height:16px"></i></span>
      <button class="check ${checkCls}" type="button" aria-label="Tandai selesai"><i data-lucide="check"></i></button>
      <div class="t-body"><div class="t-title">${esc(t.title)}</div><div class="t-meta">${meta}</div></div>
      <div class="t-actions">
        <button class="edit" type="button" title="Detail"><i data-lucide="pencil" style="width:16px;height:16px"></i></button>
        <button class="del" type="button" title="Hapus"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
      </div>`;
    el.querySelector('.check').onclick=(e)=>{ e.stopPropagation(); toggleDone(t.id,el); };
    el.querySelector('.t-body').onclick=()=>openEdit(t.id);
    el.querySelector('.edit').onclick=(e)=>{ e.stopPropagation(); openEdit(t.id); };
    el.querySelector('.del').onclick=(e)=>{ e.stopPropagation(); deleteTask(t.id); };
    // Fallback: tap di mana pun di baris (selain tombol aksi) tetap buka detail tugas.
    // Ini jaga-jaga kalau event pada elemen anak gagal ke-trigger di beberapa browser HP.
    el.addEventListener('click',(e)=>{ if(!e.target.closest('.check,.edit,.del,.drag-h')) openEdit(t.id); });
    const h=el.querySelector('.drag-h');
    // Drag-and-drop native HTML5 hanya diaktifkan lewat mouse (desktop).
    // TIDAK diaktifkan lewat touchstart karena kombinasi touch-action:none + draggable=true
    // bikin gesture tap di layar sentuh kadang "nyangkut" dan tidak terdeteksi sebagai klik.
    h.addEventListener('mousedown',()=>el.draggable=true);
    el.addEventListener('dragend',()=>el.draggable=false);
    return el;
  }

  function emptyState(){
    const el=document.createElement('div'); el.className='empty';
    let icon='check-check',h='Semua beres!',p='Tidak ada tugas di sini. Nikmati waktu luangmu.',cta=true;
    if(search){ icon='search-x'; h='Nggak ketemu'; p=`Nggak ada tugas yang cocok dengan "${esc(search)}".`; cta=false; }
    else if(view.id==='today'){ icon='sun'; h='Hari ini santai'; p='Belum ada tugas untuk hari ini.'; }
    else if(view.id==='recurring'){ icon='repeat'; h='Belum ada tugas berulang'; p='Nyalakan "Ulangi tugas" saat menambah tugas baru.'; }
    else if(view.id==='completed'){ icon='check-circle-2'; h='Belum ada yang selesai'; p='Tugas yang kamu tandai selesai muncul di sini.'; cta=false; }
    else if(filter==='done'){ icon='circle-dashed'; h='Belum ada yang selesai'; p='Selesaikan tugas untuk melihatnya di sini.'; cta=false; }
    el.innerHTML=`<div class="empty-art"><i data-lucide="${icon}" style="width:34px;height:34px"></i></div><h3>${h}</h3><p>${p}</p>${cta?'<button class="empty-cta" id="emptyCta" type="button"><i data-lucide="plus" style="width:16px;height:16px"></i>Tambah tugas</button>':''}`;
    return el;
  }
  function bindEmptyCta(){ const b=$('#emptyCta'); if(b) b.onclick=()=>openAdd(); }

  // ---- MUTATIONS ----
  function toggleDone(id,el){
    const t=state.tasks.find(x=>x.id===id); if(!t) return;
    if(t.repeat && !t.done){
      const prevDue=t.due, prevSubs=(t.subtasks||[]).map(s=>s.done), prevCompletedAt=t.completedAt;
      advanceRepeat(t); save(); renderSide();
      if(el) el.classList.add('looping');
      setTimeout(render,220);
      toast(`Diulang. Berikutnya: ${fmtDate(t.due)}`,'Urungkan',()=>{ t.due=prevDue; (t.subtasks||[]).forEach((s,i)=>s.done=prevSubs[i]); t.done=false; t.completedAt=prevCompletedAt; save(); render(); });
      return;
    }
    t.done=!t.done; t.completedAt = t.done ? Date.now() : null;
    save(); setTimeout(render, t.done?180:0); renderSide();
    if(el) el.classList.toggle('done',t.done);
  }
  function deleteTask(id){
    const idx=state.tasks.findIndex(x=>x.id===id); if(idx<0) return;
    const [removed]=state.tasks.splice(idx,1);
    pendingDelete={task:removed,idx}; save(); render();
    toast(`"${trunc(removed.title,28)}" dihapus`,'Urungkan',()=>{ state.tasks.splice(Math.min(pendingDelete.idx,state.tasks.length),0,pendingDelete.task); pendingDelete=null; save(); render(); });
  }
  function projName(id){ const p=state.projects.find(x=>x.id===id); return p?p.name:'Semua Tugas'; }

  // ============ TASK MODAL (add + edit) ============
  function resetLoopUI(){
    $('#tLoopOn').checked=false;
    $('#loopPanel').classList.add('hide');
    $('#tLoopInt').value=3; $('#tLoopUnit').value='day';
    setLoopMode('completion');
  }
  function setLoopMode(m){
    loopMode=m;
    $('#modeCompletion').classList.toggle('sel',m==='completion');
    $('#modeSchedule').classList.toggle('sel',m==='schedule');
    updateLoopPreview();
  }
  function updateLoopPreview(){
    if(!$('#tLoopOn').checked) return;
    const r={ interval:clampInt($('#tLoopInt').value), unit:$('#tLoopUnit').value, from:loopMode };
    const dueIso=$('#tDate').value || todayISO();
    const next=previewNext(r, dueIso);
    const span=$('#loopPreview').querySelector('span');
    if(loopMode==='completion'){
      span.textContent=`Dihitung dari tanggal kamu menyelesaikan. Kalau selesai hari ini, berikutnya jatuh ${fmtDateFull(next)}. Telat selesai = jadwal geser ikut mundur.`;
    } else {
      span.textContent=`Dikunci ke jadwal. Dari tenggat ${dueIso?fmtDateFull(dueIso):'yang diisi'}, berikutnya ${fmtDateFull(next)}, berapa pun kamu telat menyelesaikan.`;
    }
  }
  function clampInt(v){ let n=parseInt(v,10); if(isNaN(n)||n<1) n=1; if(n>999) n=999; return n; }

  function openAdd(){
    editingId=null; draftSubs=[];
    $('#tModalTitle').textContent='Tugas Baru';
    $('#tSaveLbl').textContent='Buat Tugas';
    $('#tCheck').style.display='none';
    $('#tDel').style.visibility='hidden';
    $('#subsSection').style.display='none';
    $('#tTitle').value='';
    $('#tPri').value='none';
    // default tanggal: kalau di view Hari Ini -> hari ini
    $('#tDate').value = (view.id==='today') ? todayISO() : '';
    $('#tProj').value = (view.type==='proj') ? view.id : '';
    $('#tTags').value='';
    $('#tNotes').value='';
    resetLoopUI();
    $('#taskModal').showModal(); icons();
    setTimeout(()=>$('#tTitle').focus(),60);
  }

  function openEdit(id){
    const t=state.tasks.find(x=>x.id===id); if(!t) return;
    editingId=id; draftSubs=(t.subtasks||[]).map(s=>({...s}));
    $('#tModalTitle').textContent='Edit Tugas';
    $('#tSaveLbl').textContent='Simpan';
    const chk=$('#tCheck'); chk.style.display='grid'; chk.classList.toggle('done',t.done);
    $('#tDel').style.visibility='visible';
    $('#tTitle').value=t.title;
    $('#tPri').value=t.priority;
    $('#tDate').value=t.due||'';
    $('#tProj').value=t.project||'';
    $('#tTags').value=(t.tags||[]).join(', ');
    $('#tNotes').value=t.notes||'';
    if(t.repeat){
      $('#tLoopOn').checked=true; $('#loopPanel').classList.remove('hide');
      $('#tLoopInt').value=t.repeat.interval; $('#tLoopUnit').value=t.repeat.unit;
      setLoopMode(t.repeat.from||'completion');
    } else { resetLoopUI(); }
    $('#subsSection').style.display='block';
    renderDraftSubs();
    $('#taskModal').showModal(); icons();
    setTimeout(()=>$('#tTitle').focus(),60);
  }

  function readLoop(){
    if(!$('#tLoopOn').checked) return null;
    return { interval:clampInt($('#tLoopInt').value), unit:$('#tLoopUnit').value, from:loopMode };
  }

  function saveTask(){
    const title=$('#tTitle').value.trim();
    if(!title){ $('#tTitle').focus(); toast('Judul tugas belum diisi','',null); return; }
    const pri=$('#tPri').value;
    let due=$('#tDate').value||null;
    let proj=$('#tProj').value||null;
    const tags=$('#tTags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const notes=$('#tNotes').value.trim();
    const repeat=readLoop();
    if(repeat && !due) due=todayISO(); // tugas berulang butuh tanggal acuan

    if(editingId){
      const t=state.tasks.find(x=>x.id===editingId);
      const wantDone=$('#tCheck').classList.contains('done');
      Object.assign(t,{ title, priority:pri, due, project:proj, tags, notes, subtasks:draftSubs, repeat });
      let msg='Perubahan disimpan';
      // Disamakan dengan perilaku toggleDone() di list: tugas berulang tetap maju ke jadwal
      // berikutnya walau ditandai selesai lewat modal edit, bukan cuma lewat checklist.
      if(wantDone && !t.done){
        if(t.repeat){ advanceRepeat(t); msg=`Perubahan disimpan. Diulang, berikutnya: ${fmtDate(t.due)}`; }
        else { t.done=true; t.completedAt=Date.now(); msg='Perubahan disimpan. Tugas selesai! 🎉'; }
      } else if(!wantDone && t.done){
        t.done=false; t.completedAt=null;
      }
      save(); $('#taskModal').close(); render();
      toast(msg,'',null);
    } else {
      const nt={ id:uid(), title, done:false, priority:pri, due, project:proj, tags, subtasks:draftSubs, notes, repeat, created:Date.now(), order:-1 };
      state.tasks.unshift(nt); state.tasks.forEach((t,i)=>t.order=i);
      save(); $('#taskModal').close();
      const visible=new Set(applyFilterSort(tasksForView()).map(x=>x.id));
      if(!visible.has(nt.id)){
        view= nt.project?{type:'proj',id:nt.project}:{type:'smart',id:'all'};
        filter='all'; syncFilterSeg();
        toast('Ditambahkan ke '+(nt.project?projName(nt.project):'Semua Tugas'),'',null);
      } else { toast('Tugas ditambahkan','',null); }
      render();
    }
  }

  function renderDraftSubs(){
    const sl=$('#subList'); sl.innerHTML='';
    const done=draftSubs.filter(s=>s.done).length;
    $('#subsBar').style.width=(draftSubs.length?done/draftSubs.length*100:0)+'%';
    $('#subsCount').textContent=draftSubs.length?`${done}/${draftSubs.length}`:'';
    draftSubs.forEach(s=>{
      const el=document.createElement('div'); el.className='sub-item'+(s.done?' done':'');
      el.innerHTML=`<button class="sub-check" type="button"><i data-lucide="check"></i></button><input type="text" value="${esc(s.title)}"><button class="sub-del" type="button"><i data-lucide="x" style="width:14px;height:14px"></i></button>`;
      el.querySelector('.sub-check').onclick=()=>{ s.done=!s.done; renderDraftSubs(); };
      el.querySelector('input').onchange=(e)=>{ s.title=e.target.value; };
      el.querySelector('.sub-del').onclick=()=>{ draftSubs=draftSubs.filter(x=>x.id!==s.id); renderDraftSubs(); };
      sl.appendChild(el);
    });
    icons();
  }

  function bindTaskModal(){
    $('#sideAddBtn').onclick=openAdd;
    $('#topAddBtn').onclick=openAdd;
    $('#tClose').onclick=()=>$('#taskModal').close();
    $('#tCancel').onclick=()=>$('#taskModal').close();
    $('#tSave').onclick=saveTask;
    $('#tDel').onclick=()=>{ const id=editingId; $('#taskModal').close(); if(id) deleteTask(id); };
    $('#tCheck').onclick=()=>{ $('#tCheck').classList.toggle('done'); };
    $('#taskModal').addEventListener('click',(e)=>{ if(e.target===$('#taskModal')) $('#taskModal').close(); });

    // Enter di judul = simpan (kecuali sedang di textarea/subtask)
    $('#tTitle').addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveTask(); } });

    // loop toggle
    $('#tLoopOn').addEventListener('change',()=>{
      const on=$('#tLoopOn').checked;
      $('#loopPanel').classList.toggle('hide',!on);
      if(on) updateLoopPreview();
    });
    $('#loopMinus').onclick=()=>{ $('#tLoopInt').value=clampInt(+$('#tLoopInt').value-1); updateLoopPreview(); };
    $('#loopPlus').onclick=()=>{ $('#tLoopInt').value=clampInt(+$('#tLoopInt').value+1); updateLoopPreview(); };
    $('#tLoopInt').addEventListener('input',updateLoopPreview);
    $('#tLoopInt').addEventListener('blur',()=>{ $('#tLoopInt').value=clampInt($('#tLoopInt').value); updateLoopPreview(); });
    $('#tLoopUnit').addEventListener('change',updateLoopPreview);
    $('#tDate').addEventListener('change',updateLoopPreview);
    $('#modeCompletion').onclick=()=>setLoopMode('completion');
    $('#modeSchedule').onclick=()=>setLoopMode('schedule');

    // subtasks (edit mode)
    $('#subInput').addEventListener('keydown',(e)=>{
      if(e.key==='Enter'){ const v=e.target.value.trim(); if(!v) return; draftSubs.push({id:uid(),title:v,done:false}); e.target.value=''; renderDraftSubs(); }
    });
  }

  // ---- PROJECT MODAL ----
  function bindProjModal(){
    const sw=$('#swatches');
    PROJ_COLORS.forEach((c,i)=>{
      const b=document.createElement('button'); b.type='button';
      b.className='swatch'+(i===0?' sel':''); b.style.background=c;
      b.onclick=()=>{ selectedSwatch=c; sw.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); };
      sw.appendChild(b);
    });
    $('#addProjBtn').onclick=()=>{ $('#projName').value=''; selectedSwatch=PROJ_COLORS[0]; sw.querySelectorAll('.swatch').forEach((x,i)=>x.classList.toggle('sel',i===0)); $('#projModal').showModal(); setTimeout(()=>$('#projName').focus(),50); };
    $('#projCancel').onclick=()=>$('#projModal').close();
    $('#projSave').onclick=saveProj;
    $('#projName').addEventListener('keydown',(e)=>{ if(e.key==='Enter') saveProj(); });
    $('#projModal').addEventListener('click',(e)=>{ if(e.target===$('#projModal')) $('#projModal').close(); });
  }
  function saveProj(){
    const name=$('#projName').value.trim(); if(!name) return;
    const p={id:uid(),name,color:selectedSwatch};
    state.projects.push(p); save(); fillProjSelects();
    $('#projModal').close(); view={type:'proj',id:p.id}; render();
  }
  function fillProjSelects(){
    ['#tProj'].forEach(sel=>{
      const el=$(sel); const cur=el.value;
      el.innerHTML='<option value="">Tanpa proyek</option>'+state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
      el.value=cur;
    });
  }

  // ---- DRAG & DROP ----
  let dragEl=null;
  function enableDnD(){
    const scroll=$('#scroll');
    scroll.querySelectorAll('.task').forEach(el=>{
      el.addEventListener('dragstart',(e)=>{ dragEl=el; el.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      el.addEventListener('dragend',()=>{ el.classList.remove('dragging'); scroll.querySelectorAll('.task').forEach(t=>t.classList.remove('drop-above','drop-below')); dragEl=null; commitOrder(); });
      el.addEventListener('dragover',(e)=>{ e.preventDefault(); if(!dragEl||dragEl===el) return; const r=el.getBoundingClientRect(); const after=e.clientY>r.top+r.height/2; scroll.querySelectorAll('.task').forEach(t=>t.classList.remove('drop-above','drop-below')); el.classList.add(after?'drop-below':'drop-above'); });
      el.addEventListener('drop',(e)=>{ e.preventDefault(); if(!dragEl||dragEl===el) return; const r=el.getBoundingClientRect(); const after=e.clientY>r.top+r.height/2; if(after) el.after(dragEl); else el.before(dragEl); });
    });
  }
  function commitOrder(){
    if(sortBy!=='manual'){ toast('Ubah urutan ke "Manual" biar susunannya kesimpen','',null); render(); return; }
    const ids=[...$('#scroll').querySelectorAll('.task')].map(el=>el.dataset.id);
    ids.forEach((id,i)=>{ const t=state.tasks.find(x=>x.id===id); if(t) t.order=i; });
    let n=ids.length; state.tasks.forEach(t=>{ if(!ids.includes(t.id)) t.order=n++; });
    save();
  }

  // ---- TOAST ----
  let toastT=null;
  function toast(msg,actionLabel,action){
    const wrap=$('#toastWrap'); wrap.innerHTML='';
    const el=document.createElement('div'); el.className='toast'; el.innerHTML=`<span>${msg}</span>`;
    if(actionLabel){ const b=document.createElement('button'); b.type='button'; b.textContent=actionLabel; b.onclick=()=>{ action&&action(); wrap.innerHTML=''; clearTimeout(toastT); }; el.appendChild(b); }
    wrap.appendChild(el); icons();
    clearTimeout(toastT); toastT=setTimeout(()=>{ wrap.innerHTML=''; pendingDelete=null; },5000);
  }

  // ---- helpers ----
  function esc(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function trunc(s,n){ return s.length>n?s.slice(0,n)+'…':s; }

  // ---- CONTROLS ----
  function syncFilterSeg(){ $('#filterSeg').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter)); }
  function bindControls(){
    $('#filterSeg').querySelectorAll('button').forEach(b=>{ b.onclick=()=>{ filter=b.dataset.filter; syncFilterSeg(); render(); }; });
    $('#sortSel').onchange=(e)=>{ sortBy=e.target.value; render(); };
    const si=$('#searchInput'), sb=$('#searchBox');
    si.addEventListener('input',()=>{ search=si.value.trim(); sb.classList.toggle('has-val',!!si.value); render(); });
    $('#searchClr').onclick=()=>{ si.value=''; search=''; sb.classList.remove('has-val'); render(); si.focus(); };
    $('#menuBtn').onclick=()=>{ $('#side').classList.add('open'); $('#scrim').classList.add('on'); };
    $('#scrim').onclick=closeDrawer;
    document.addEventListener('keydown',(e)=>{
      const typing=['INPUT','TEXTAREA'].includes(document.activeElement.tagName);
      const anyModal=$('#taskModal').open||$('#projModal').open;
      if(e.key==='/'&&!typing&&!anyModal){ e.preventDefault(); si.focus(); }
      if((e.key==='n'||e.key==='N')&&!typing&&!anyModal){ e.preventDefault(); openAdd(); }
    });
  }
  function closeDrawer(){ $('#side').classList.remove('open'); $('#scrim').classList.remove('on'); }

  // ---- INIT ----
  function init(){
    fillProjSelects();
    bindControls(); bindTaskModal(); bindProjModal();
    render(); icons();
  }
  init();
  window.TugasProBridge = window.TugasProBridge || {};
  window.TugasProBridge.refresh = function(){ state = load(); fillProjSelects(); render(); renderSide(); icons(); };
})();
