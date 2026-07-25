// ================================================================
// BBC AGENCY OS — module-calendar.js
// ================================================================
function pgCalendar(c, a) {
  a.innerHTML = `
    <button class="btn" onclick="calPrev()">← Prev</button>
    <button class="btn" onclick="calNext()">Next →</button>
    <button class="btn btn-primary" onclick="openAddCalEvent()">+ Event</button>`;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const y = S.calYear, m = S.calMonth;
  const fd  = new Date(y, m, 1).getDay();
  const dim = new Date(y, m+1, 0).getDate();
  const dip = new Date(y, m, 0).getDate();

  // Build event map: date-key → [{label, cls, id?}]
  const evMap = {};
  function addEv(dt, ev) {
    const d = new Date(dt);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!evMap[k]) evMap[k] = [];
    evMap[k].push(ev);
  }
  S.tasks.filter(t=>!t.done).forEach(t => addEv(t.dueDate, {label:`[T] ${t.title.slice(0,14)}`, cls: daysLeft(t.dueDate)<0?'ev-o':'ev-t'}));
  S.projects.filter(p=>p.status==='active').forEach(p => addEv(p.dueDate, {label:`[P] ${p.name.slice(0,14)}`, cls: daysLeft(p.dueDate)<0?'ev-o':'ev-p'}));
  S.invoices.filter(i=>i.status!=='paid'&&i.status!=='draft').forEach(i => addEv(i.dueDate, {label:`[I] ${i.id}`, cls:'ev-i'}));
  if (isAdmin()) S.leads.filter(l=>l.followupAt&&!l.followupDone).forEach(l => addEv(new Date(l.followupAt), {label:`[F] ${l.title.slice(0,13)}`, cls:'ev-l'}));
  S.calEvents.forEach(e => addEv(e.date, {label: e.title, cls:'ev-c', id: e.id}));

  let cells = '', dc = 1;
  for (let i = 0; i < 42; i++) {
    let cd, ot = false;
    if (i < fd)   { cd = new Date(y, m-1, dip-fd+1+i); ot = true; }
    else if (dc <= dim) { cd = new Date(y, m, dc++); }
    else          { cd = new Date(y, m+1, dc++-dim); ot = true; }
    const isT = cd.toDateString() === TODAY.toDateString();
    const k   = `${cd.getFullYear()}-${cd.getMonth()}-${cd.getDate()}`;
    const evs = evMap[k] || [];
    const iso = cd.toISOString().split('T')[0];
    const dateNum = isT
      ? `<span style="background:#1a1a1a;color:#fff;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px">${cd.getDate()}</span>`
      : cd.getDate();
    cells += `<div class="cal-cell ${ot?'other':''} ${isT?'today':''}" onclick="openAddCalEvent('${iso}')">
      <div class="cal-date">${dateNum}</div>
      ${evs.slice(0,3).map(ev=>`<div class="cal-ev ${ev.cls}" ${ev.id?`onclick="event.stopPropagation();delCalEv('${ev.id}')" title="Click to delete"`:''} >${esc(ev.label)}</div>`).join('')}
      ${evs.length>3 ? `<div style="font-size:9px;color:#aaa;padding:1px 5px">+${evs.length-3} more</div>` : ''}
    </div>`;
  }

  c.innerHTML = `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
      <span style="font-size:14px;font-weight:600">${MONTHS[m]} ${y}</span>
      <div style="display:flex;gap:10px;font-size:11px;flex-wrap:wrap">
        ${[['ev-t','Tasks'],['ev-p','Projects'],['ev-i','Invoices'],['ev-l','Follow-ups'],['ev-c','Custom Events'],['ev-o','Overdue']].map(([cls,lbl])=>`<span style="display:flex;align-items:center;gap:3px"><span class="cal-ev ${cls}" style="width:10px;height:10px;display:inline-block;border-radius:2px;padding:0"></span>${lbl}</span>`).join('')}
      </div>
    </div>
    <div class="cal-grid">
      ${DAYS.map(d=>`<div class="cal-lbl">${d}</div>`).join('')}
      ${cells}
    </div>
    <div style="font-size:10px;color:#888;text-align:center;margin-top:.75rem">Click any date to add an event · Click a teal event to delete it</div>
  </div>`;
}

function calPrev() { S.calMonth--; if (S.calMonth < 0) { S.calMonth=11; S.calYear--; } renderPage(); }
function calNext() { S.calMonth++; if (S.calMonth > 11) { S.calMonth=0;  S.calYear++; } renderPage(); }

function openAddCalEvent(pre) {
  showModal(`<div class="modal-title">Add Calendar Event</div>
    <div class="fg"><label class="fl">Title *</label><input class="fi" id="ev-t" placeholder="e.g. Client call"></div>
    <div class="fg"><label class="fl">Date</label><input class="fi" id="ev-d" type="date" value="${pre||''}"></div>
    <div class="fg"><label class="fl">Note</label><input class="fi" id="ev-n" placeholder="Details..."></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveCalEv()">Add Event</button>
    </div>`);
}

function saveCalEv() {
  const t = document.getElementById('ev-t').value.trim();
  const d = document.getElementById('ev-d').value;
  if (!t || !d) { alert('Title and date required.'); return; }
  S.calEvents.push({ id:uid(), title:t, date:new Date(d), note:document.getElementById('ev-n').value.trim() });
  save(); closeModal(); renderPage();
}

function delCalEv(id) {
  const i = S.calEvents.findIndex(e=>e.id===id);
  if (i > -1) { S.calEvents.splice(i,1); save(); renderPage(); }
}
