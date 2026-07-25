// ================================================================
// BBC AGENCY OS — module-clients-invoices.js
// Clients CRM + Invoices
// ================================================================

// ── CLIENTS ─────────────────────────────────────────────────────
function pgClients(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openAddClient()">+ New Client</button>`;
  if (!S.clients.length) { c.innerHTML = emptyState('No clients yet','Add your first client to start creating projects and invoices','openAddClient()','+ New Client'); return; }
  c.innerHTML = `<div class="g3">${S.clients.map(cl=>`<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:.875rem">
      <div class="av ${cl.avClass||'av-a'}" style="width:36px;height:36px;border-radius:9px;font-size:13px">${esc(cl.initials||'?')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cl.name)}</div>
        <div style="font-size:11px;color:#888">${esc(cl.industry||'—')}</div>
      </div>
      <span class="badge ${cl.status==='active'?'b-green':'b-amber'}">${cl.status}</span>
    </div>
    <div style="border-top:.5px solid rgba(0,0,0,.06);padding-top:.75rem;display:grid;gap:5px;margin-bottom:.875rem">
      ${[['Contact',cl.contact],['Email',cl.email],['Phone',cl.phone],['Revenue',fmtINR(cl.revenue)],['Projects',cl.projects||0]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:8px">
        <span style="font-size:11px;color:#888">${k}</span>
        <span style="font-size:11px;text-align:right;overflow:hidden;text-overflow:ellipsis">${esc(String(v||'—'))}</span>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn" onclick="openAddInvoice('${cl.id}')" style="flex:1;font-size:11px">+ Invoice</button>
      <button class="btn btn-sm" onclick="openEditClient('${cl.id}')">✎ Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteClient('${cl.id}')">✕</button>
    </div>
  </div>`).join('')}</div>`;
}

function openAddClient() {
  showModal(`<div class="modal-title">New Client</div>
    <div class="g2">
      <div class="fg" style="grid-column:1/-1"><label class="fl">Company Name *</label><input class="fi" id="cl-name" placeholder="e.g. Nova Brands Pvt. Ltd."></div>
      <div class="fg"><label class="fl">Industry</label><input class="fi" id="cl-ind" placeholder="e.g. D2C, FMCG, Hospitality"></div>
      <div class="fg"><label class="fl">Contact Person</label><input class="fi" id="cl-contact" placeholder="Primary contact name"></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" id="cl-email" type="email"></div>
      <div class="fg"><label class="fl">Phone</label><input class="fi" id="cl-phone" placeholder="+91 ..."></div>
      <div class="fg"><label class="fl">Revenue (₹)</label><input class="fi" id="cl-rev" type="number" placeholder="0"></div>
    </div>
    <div class="fg"><label class="fl">Status</label><select class="fi" id="cl-status"><option value="active">Active</option><option value="lead">Lead</option></select></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveClient()">Add Client</button></div>`);
}

function saveClient() {
  const name = document.getElementById('cl-name').value.trim();
  if (!name) { alert('Name required.'); return; }
  S.clients.push({
    id:uid(), name,
    industry: document.getElementById('cl-ind').value.trim()||'—',
    contact:  document.getElementById('cl-contact').value.trim()||'—',
    email:    document.getElementById('cl-email').value.trim()||'—',
    phone:    document.getElementById('cl-phone').value.trim()||'—',
    revenue:  Number(document.getElementById('cl-rev').value)||0,
    projects: 0,
    status:   document.getElementById('cl-status').value,
    avClass:  avClass(S.clients.length),
    initials: mkInit(name)
  });
  save(); logAct('client', `New client: <b>${esc(name)}</b>`, '🏢');
  toast(`"${name}" added ✓`); closeModal(); renderPage();
}

function openEditClient(id) {
  const cl = S.clients.find(c=>c.id===id); if(!cl) return;
  const clean = v => v==='—'?'':v||'';
  showModal(`<div class="modal-title">Edit Client — ${esc(cl.name)}</div>
    <div class="g2">
      <div class="fg" style="grid-column:1/-1"><label class="fl">Company Name *</label><input class="fi" id="cl-name" value="${esc(cl.name)}"></div>
      <div class="fg"><label class="fl">Industry</label><input class="fi" id="cl-ind" value="${esc(clean(cl.industry))}"></div>
      <div class="fg"><label class="fl">Contact Person</label><input class="fi" id="cl-contact" value="${esc(clean(cl.contact))}"></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" id="cl-email" type="email" value="${esc(clean(cl.email))}"></div>
      <div class="fg"><label class="fl">Phone</label><input class="fi" id="cl-phone" value="${esc(clean(cl.phone))}"></div>
      <div class="fg"><label class="fl">Revenue (₹)</label><input class="fi" id="cl-rev" type="number" value="${cl.revenue||0}"></div>
    </div>
    <div class="fg"><label class="fl">Status</label><select class="fi" id="cl-status">
      <option value="active" ${cl.status==='active'?'selected':''}>Active</option>
      <option value="lead"   ${cl.status==='lead'?'selected':''}>Lead</option>
    </select></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateClient('${id}')">Save</button></div>`);
}

function updateClient(id) {
  const cl = S.clients.find(c=>c.id===id); if(!cl) return;
  cl.name     = document.getElementById('cl-name').value.trim()    || cl.name;
  cl.industry = document.getElementById('cl-ind').value.trim()     || '—';
  cl.contact  = document.getElementById('cl-contact').value.trim() || '—';
  cl.email    = document.getElementById('cl-email').value.trim()   || '—';
  cl.phone    = document.getElementById('cl-phone').value.trim()   || '—';
  cl.revenue  = Number(document.getElementById('cl-rev').value)||0;
  cl.status   = document.getElementById('cl-status').value;
  cl.initials = mkInit(cl.name);
  save(); toast('Client updated ✓'); closeModal(); renderPage();
}

function deleteClient(id) {
  const cl = S.clients.find(c=>c.id===id); if(!cl) return;
  const linked = S.projects.filter(p=>p.clientId===id).length;
  if (!confirm(`Delete "${cl.name}"?${linked?`\n\n${linked} linked project${linked!==1?'s':''} will remain but lose the client link.`:''}`)) return;
  S.clients.splice(S.clients.findIndex(c=>c.id===id), 1);
  save(); toast(`"${cl.name}" deleted`); renderPage();
}

// ── INVOICES ─────────────────────────────────────────────────────
function pgInvoices(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openAddInvoice(null)">+ New Invoice</button>`;
  const paid = S.invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount),0);
  const pend = S.invoices.filter(i=>i.status==='pending').reduce((s,i)=>s+Number(i.amount),0);
  const ovd  = S.invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+Number(i.amount),0);
  c.innerHTML = `
    <div class="g4" style="margin-bottom:1.25rem">
      <div class="stat"><div class="stat-label">Collected</div><div class="stat-val" style="font-size:15px">${fmtINR(paid)}</div></div>
      <div class="stat"><div class="stat-label">Pending</div><div class="stat-val" style="font-size:15px">${fmtINR(pend)}</div></div>
      <div class="stat"><div class="stat-label">Overdue</div><div class="stat-val" style="font-size:15px;color:#c0392b">${fmtINR(ovd)}</div></div>
      <div class="stat"><div class="stat-label">Total Billed</div><div class="stat-val" style="font-size:15px">${fmtINR(paid+pend+ovd)}</div></div>
    </div>
    ${!S.invoices.length
      ? emptyState('No invoices yet','Create invoices from a client card or here','openAddInvoice(null)','+ New Invoice')
      : `<div class="card"><table>
          <thead><tr><th>Invoice</th><th>Client</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>${S.invoices.map(i=>{const d=daysLeft(i.dueDate);return `<tr>
            <td style="font-weight:700">${esc(i.id)}</td>
            <td>${esc(i.client)}</td>
            <td style="color:#888">${esc(i.issued)}</td>
            <td style="color:${i.status!=='paid'&&d<0?'#c0392b':i.status!=='paid'&&d<=3?'#f57f17':'#888'}">${fmtDate(i.dueDate)}</td>
            <td style="font-weight:700">${fmtINR(i.amount)}</td>
            <td><span class="badge ${i.status==='paid'?'b-green':i.status==='pending'?'b-blue':i.status==='overdue'?'b-red':'b-gray'}">${i.status}</span></td>
            <td>${i.status!=='paid'?`<button class="btn btn-sm" onclick="markPaid('${i.id}')">✓ Mark Paid</button>`:'—'}</td>
          </tr>`;}).join('')}</tbody>
        </table></div>`}`;
}

function openAddInvoice(clientId) {
  if (!S.clients.length) { alert('Add a client first.'); return; }
  const co = S.clients.map(c=>`<option value="${c.id}" ${c.id===clientId?'selected':''}>${esc(c.name)}</option>`).join('');
  showModal(`<div class="modal-title">New Invoice</div>
    <div class="fg"><label class="fl">Client</label><select class="fi" id="inv-client">${co}</select></div>
    <div class="fg"><label class="fl">Amount (₹) *</label><input class="fi" id="inv-amt" type="number" placeholder="0"></div>
    <div class="fg"><label class="fl">Due Date</label><input class="fi" id="inv-due" type="date"></div>
    <div class="fg"><label class="fl">Status</label><select class="fi" id="inv-status"><option value="draft">Draft</option><option value="pending">Pending (sent to client)</option></select></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveInvoice()">Create Invoice</button></div>`);
}

function saveInvoice() {
  const cid    = document.getElementById('inv-client').value;
  const amount = Number(document.getElementById('inv-amt').value)||0;
  if (!amount) { alert('Amount required.'); return; }
  const due    = document.getElementById('inv-due').value;
  const status = document.getElementById('inv-status').value;
  const cl     = S.clients.find(c=>c.id===cid);
  const invId  = 'INV-' + String(S.invoices.length+1).padStart(3,'0');
  S.invoices.push({
    id:invId, client:cl.name, clientId:cid, amount, status,
    dueDate: due ? new Date(due) : new Date(TODAY.getTime()+30*86400000),
    issued:  new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
  });
  save(); logAct('invoice', `Invoice <b>${invId}</b> for <b>${esc(cl.name)}</b> — ${fmtINR(amount)}`, '₹');
  toast(`${invId} created ✓`); closeModal(); S.page='invoices'; renderPage();
}

function markPaid(id) {
  const i = S.invoices.find(i=>i.id===id); if(!i) return;
  i.status = 'paid'; save();
  logAct('invoice', `Invoice <b>${id}</b> marked paid`, '₹');
  toast(`${id} marked paid ✓`); renderPage();
}
