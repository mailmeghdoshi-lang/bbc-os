// ================================================================
// BBC AGENCY OS — module-leads.js
// Lead pipeline, follow-ups, stage management
// ================================================================
function pgLeads(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openAddLead()">+ New Lead</button>`;
  const pipeHTML = LEAD_STAGES.map(st => {
    const cnt = S.leads.filter(l=>l.stage===st).length;
    return `<div style="text-align:center;padding:10px 8px;background:#fff;border-radius:8px;border:.5px solid #eee;min-width:75px">
      <div style="font-size:18px;font-weight:700;color:${STAGE_COLOR[st]}">${cnt}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">${st}</div>
    </div>`;
  }).join('');
  c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:1.5rem">${pipeHTML}</div>
    ${!S.leads.length
      ? emptyState('No leads yet','Track every prospect from first contact to onboarding','openAddLead()','+ New Lead')
      : `<div id="lead-list">${S.leads.map(l=>leadCard(l)).join('')}</div>`}`;
}

function leadCard(l) {
  const ex = !!S.expandedLeads[l.id];
  const quotes = S.quotations.filter(q=>q.leadId===l.id);
  const fuPending = l.followupAt && !l.followupDone && new Date(l.followupAt) < new Date() && !['Onboarded','Lost','Rejected'].includes(l.stage);
  return `<div class="lead-card">
    <div class="lead-hd" onclick="toggleLeadExpand('${l.id}')">
      <span style="font-size:11px;color:#bbb;width:18px">${ex?'▾':'▸'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title)}</div>
        ${l.company ? `<div style="font-size:11px;color:#888">${esc(l.company)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:7px;flex-shrink:0">
        ${l.value ? `<span style="font-size:12px;font-weight:600">${fmtINR(l.value)}</span>` : ''}
        <span class="badge ${STAGE_BADGE[l.stage]||'b-gray'}">${l.stage}</span>
        ${fuPending ? `<span class="badge b-purple">📞 Follow-up</span>` : ''}
        <button class="btn btn-sm" onclick="event.stopPropagation();openEditLead('${l.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteLead('${l.id}')">✕</button>
      </div>
    </div>
    ${ex ? `<div class="lead-body">
      <!-- Stage pipeline -->
      <div class="lead-pipe">
        ${LEAD_STAGES.map(st=>{const idx=LEAD_STAGES.indexOf(st),ci=LEAD_STAGES.indexOf(l.stage);return `<div class="lead-stage ${st===l.stage?'cur':idx<ci?'past':''}" onclick="setLeadStage('${l.id}','${st}')">${st}</div>`;}).join('')}
      </div>
      <!-- Details grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:1rem">
        ${[['Contact',l.contact||'—'],['Phone',l.phone||'—'],['Email',l.email||'—'],['Est. Value',l.value?fmtINR(l.value):'—'],['Stage',l.stage],['Created',fmtDate(l.createdAt)]].map(([k,v])=>`<div>
          <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${k}</div>
          <div style="font-size:12px">${esc(String(v))}</div>
        </div>`).join('')}
        ${l.services&&l.services.length ? `<div style="grid-column:1/-1">
          <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Services Interested In</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${l.services.map(s=>`<span class="badge b-purple">${esc(s)}</span>`).join('')}</div>
        </div>` : ''}
        ${l.notes ? `<div style="grid-column:1/-1">
          <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Notes</div>
          <div style="font-size:12px;background:#f4f3f0;border-radius:6px;padding:8px 10px">${esc(l.notes)}</div>
        </div>` : ''}
        ${l.lostReason ? `<div style="grid-column:1/-1">
          <div style="font-size:10px;color:#c0392b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Lost / Rejected Reason</div>
          <div style="font-size:12px;color:#c0392b">${esc(l.lostReason)}</div>
        </div>` : ''}
      </div>
      <!-- Quotations -->
      <div style="background:#f8f7f5;border-radius:8px;padding:12px;margin-bottom:1rem">
        <div style="font-size:11px;font-weight:700;margin-bottom:8px">Quotations (${quotes.length})</div>
        ${quotes.map(q=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:.5px solid rgba(0,0,0,.06)">
          <span style="font-size:12px;font-weight:600;min-width:65px">${esc(q.quoteNo)}</span>
          <span style="font-size:12px;flex:1">${(q.items||[]).length} items</span>
          <span style="font-size:12px;font-weight:600">${fmtINR(q.total)}</span>
          <span class="badge ${q.status==='accepted'?'b-green':q.status==='sent'?'b-blue':q.status==='rejected'?'b-red':'b-gray'}">${q.status}</span>
          <button class="btn btn-sm" onclick="openViewQuote('${q.id}')">View</button>
        </div>`).join('') || `<div style="font-size:12px;color:#888">No quotations yet</div>`}
        <button class="btn btn-sm btn-purple" onclick="openCreateQuote('${l.id}')" style="margin-top:8px">+ Create Quote</button>
      </div>
      <!-- Follow-up -->
      <div style="background:#f3e8ff;border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:700;color:#6d28d9;margin-bottom:8px">📞 Follow-up</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">
          <div>
            <div style="font-size:10px;color:#888;margin-bottom:3px">Date & Time</div>
            <div style="font-size:13px;font-weight:600;color:#6d28d9">${l.followupAt ? fmtDT(new Date(l.followupAt)) : 'Not set'}</div>
          </div>
          <div>
            <div style="font-size:10px;color:#888;margin-bottom:3px">Phone</div>
            <div style="font-size:12px">${esc(l.followupPhone||'—')}</div>
          </div>
          ${l.followupNote ? `<div style="grid-column:1/-1">
            <div style="font-size:10px;color:#888;margin-bottom:3px">Agenda</div>
            <div style="font-size:12px">${esc(l.followupNote)}</div>
          </div>` : ''}
        </div>
        <button class="btn btn-sm btn-purple" onclick="openFollowup('${l.id}')">Set / Update Follow-up</button>
        ${l.followupAt && !l.followupDone ? `<button class="btn btn-sm" style="margin-left:6px;background:#e8f5e9;color:#2e7d32;border-color:#b2dfdb" onclick="markFollowupDone('${l.id}')">✓ Mark Done</button>` : ''}
      </div>
    </div>` : ''}
  </div>`;
}

function toggleLeadExpand(id) {
  S.expandedLeads[id] = !S.expandedLeads[id];
  const ll = document.getElementById('lead-list');
  if (ll) ll.innerHTML = S.leads.map(l=>leadCard(l)).join('');
}

function setLeadStage(id, stage) {
  const l = S.leads.find(l=>l.id===id); if(!l) return;
  l.stage = stage; save();
  logAct('lead', `Lead "<b>${esc(l.title)}</b>" → <b>${stage}</b>`, '→');
  const ll = document.getElementById('lead-list');
  if (ll) ll.innerHTML = S.leads.map(l=>leadCard(l)).join('');
  // refresh pipeline counts
  pgLeads(document.getElementById('pg-content'), document.getElementById('pg-actions'));
}

function deleteLead(id) {
  const l = S.leads.find(l=>l.id===id);
  if (!l || !confirm(`Delete lead "${l.title}"?`)) return;
  S.leads.splice(S.leads.findIndex(l=>l.id===id), 1);
  save(); renderPage();
}

function openAddLead() {
  const svcs = allServices();
  const svcOpts = svcs.map(s=>`<option value="${esc(s.name)}">[${s.code}] ${esc(s.name)}</option>`).join('');
  showModal(`<div class="modal-title">New Lead</div>
    <div class="g2">
      <div class="fg" style="grid-column:1/-1"><label class="fl">Lead Title / Name *</label><input class="fi" id="l-title" placeholder="e.g. Nimisha — Social Media"></div>
      <div class="fg"><label class="fl">Company</label><input class="fi" id="l-co" placeholder="Company name"></div>
      <div class="fg"><label class="fl">Contact Person</label><input class="fi" id="l-contact"></div>
      <div class="fg"><label class="fl">Phone</label><input class="fi" id="l-phone" placeholder="+91 ..."></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" id="l-email" type="email"></div>
      <div class="fg"><label class="fl">Est. Value (₹)</label><input class="fi" id="l-value" type="number" placeholder="0"></div>
      <div class="fg"><label class="fl">Stage</label><select class="fi" id="l-stage">${LEAD_STAGES.map(s=>`<option>${s}</option>`).join('')}</select></div>
    </div>
    <div class="fg"><label class="fl">Services Interested In</label>
      <select class="fi" id="l-svcs" multiple style="height:90px">${svcOpts}</select>
      <div style="font-size:10px;color:#888;margin-top:3px">Hold Cmd/Ctrl to select multiple</div>
    </div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="l-notes" placeholder="Source, context, requirements..."></textarea></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveLead()">Add Lead</button></div>`);
}

function saveLead() {
  const title = document.getElementById('l-title').value.trim();
  if (!title) { alert('Title required.'); return; }
  const svcs = Array.from(document.getElementById('l-svcs').selectedOptions).map(o=>o.value);
  S.leads.push({
    id:uid(), title,
    company:  document.getElementById('l-co').value.trim(),
    contact:  document.getElementById('l-contact').value.trim(),
    phone:    document.getElementById('l-phone').value.trim(),
    email:    document.getElementById('l-email').value.trim(),
    value:    Number(document.getElementById('l-value').value)||0,
    stage:    document.getElementById('l-stage').value,
    notes:    document.getElementById('l-notes').value.trim(),
    services: svcs, createdAt: new Date().toISOString()
  });
  save(); logAct('lead', `New lead: <b>${esc(title)}</b>`, '★');
  toast(`Lead "${title}" added`); closeModal(); renderPage();
}

function openEditLead(id) {
  const l = S.leads.find(l=>l.id===id); if(!l) return;
  const svcs = allServices();
  const svcOpts = svcs.map(s=>`<option value="${esc(s.name)}" ${(l.services||[]).includes(s.name)?'selected':''}>[${s.code}] ${esc(s.name)}</option>`).join('');
  const showLost = ['Lost','Rejected'].includes(l.stage);
  showModal(`<div class="modal-title">Edit Lead — ${esc(l.title)}</div>
    <div class="g2">
      <div class="fg" style="grid-column:1/-1"><label class="fl">Title *</label><input class="fi" id="l-title" value="${esc(l.title)}"></div>
      <div class="fg"><label class="fl">Company</label><input class="fi" id="l-co" value="${esc(l.company||'')}"></div>
      <div class="fg"><label class="fl">Contact</label><input class="fi" id="l-contact" value="${esc(l.contact||'')}"></div>
      <div class="fg"><label class="fl">Phone</label><input class="fi" id="l-phone" value="${esc(l.phone||'')}"></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" id="l-email" value="${esc(l.email||'')}"></div>
      <div class="fg"><label class="fl">Est. Value (₹)</label><input class="fi" id="l-value" type="number" value="${l.value||0}"></div>
      <div class="fg"><label class="fl">Stage</label><select class="fi" id="l-stage">${LEAD_STAGES.map(s=>`<option ${l.stage===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="fg"><label class="fl">Services</label><select class="fi" id="l-svcs" multiple style="height:90px">${svcOpts}</select></div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="l-notes">${esc(l.notes||'')}</textarea></div>
    ${showLost ? `<div class="fg"><label class="fl">Lost / Rejected Reason</label><input class="fi" id="l-lost" value="${esc(l.lostReason||'')}"></div>` : ''}
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateLead('${id}')">Save</button></div>`);
}

function updateLead(id) {
  const l = S.leads.find(l=>l.id===id); if(!l) return;
  l.title   = document.getElementById('l-title').value.trim()   || l.title;
  l.company = document.getElementById('l-co').value.trim();
  l.contact = document.getElementById('l-contact').value.trim();
  l.phone   = document.getElementById('l-phone').value.trim();
  l.email   = document.getElementById('l-email').value.trim();
  l.value   = Number(document.getElementById('l-value').value)||0;
  l.stage   = document.getElementById('l-stage').value;
  l.notes   = document.getElementById('l-notes').value.trim();
  l.services= Array.from(document.getElementById('l-svcs').selectedOptions).map(o=>o.value);
  const lr  = document.getElementById('l-lost'); if (lr) l.lostReason = lr.value.trim();
  save(); logAct('lead', `Lead "<b>${esc(l.title)}</b>" updated`, '✎');
  toast('Lead updated ✓'); closeModal(); renderPage();
}

function openFollowup(id) {
  const l = S.leads.find(l=>l.id===id); if(!l) return;
  const cur = l.followupAt ? new Date(l.followupAt).toISOString().slice(0,16) : '';
  showModal(`<div class="modal-title">Set Follow-up — ${esc(l.title)}</div>
    <div class="fg"><label class="fl">Date & Time *</label><input class="fi" id="fu-dt" type="datetime-local" value="${cur}"></div>
    <div class="fg"><label class="fl">Phone</label><input class="fi" id="fu-ph" value="${esc(l.followupPhone||l.phone||'')}"></div>
    <div class="fg"><label class="fl">Agenda / Note</label><textarea class="fi" id="fu-note">${esc(l.followupNote||'')}</textarea></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-purple" onclick="saveFollowup('${id}')">Save Follow-up</button></div>`);
}

function saveFollowup(id) {
  const l  = S.leads.find(l=>l.id===id); if(!l) return;
  const dt = document.getElementById('fu-dt').value;
  l.followupAt    = dt ? new Date(dt).toISOString() : '';
  l.followupPhone = document.getElementById('fu-ph').value.trim();
  l.followupNote  = document.getElementById('fu-note').value.trim();
  l.followupDone  = false; // reset so it appears in alerts again
  save(); logAct('lead', `Follow-up set for "<b>${esc(l.title)}</b>" — ${fmtDT(l.followupAt)}`, '📞');
  toast('Follow-up saved ✓'); closeModal(); renderPage();
}
