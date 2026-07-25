// ================================================================
// BBC AGENCY OS — module-member.js
// Team member portal — restricted views, no financial data
// ================================================================

function renderMember() {
  const m = curMember(); if(!m) { logout(); return; }
  const perms   = memberPerms(m);
  const allowed = Object.keys(MODULES).filter(k=>perms[k]);
  if (!allowed.includes(S.page)) S.page = allowed[0] || 'dashboard';

  const navItems = allowed.map(k=>`
    <div class="sb-item ${S.page===k?'on':''}" onclick="mNav('${k}')">
      ${mSVG(k)}<span style="flex:1">${MODULES[k].label}</span>
    </div>`).join('') || '<div style="font-size:11px;color:#888;padding:8px 10px">No modules assigned yet.<br>Contact your admin.</div>';

  document.getElementById('R').innerHTML = `<div class="app">
    <nav class="sb">
      <div class="sb-logo">
        <div class="sb-logo-name">${esc(S.agencyName)}</div>
        <div class="sb-logo-sub">Team Portal</div>
      </div>
      <div class="sb-section">${navItems}</div>
      <div class="sb-foot">
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px">
          <div class="av ${m.avClass||'av-a'}" style="width:28px;height:28px">${m.id}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</div>
            <div style="font-size:10px;color:#888">${esc(m.role||'Team Member')}</div>
          </div>
        </div>
        <button class="btn" onclick="logout()" style="width:100%;font-size:11px;margin-top:4px">Switch User</button>
      </div>
    </nav>
    <div class="main">
      <div class="topbar">
        <div class="topbar-title" id="m-title">${MODULES[S.page]?.label||'Dashboard'}</div>
        <div style="font-size:11px;color:#888">${new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</div>
      </div>
      <div class="page" id="m-page"></div>
    </div>
  </div>`;

  document.getElementById('M').innerHTML = '';
  renderMemberPage();
}

function mNav(pg) {
  const m = curMember(); if(!m) return;
  if (!memberPerms(m)[pg]) { toast('You do not have access to this module.'); return; }
  S.page = pg;
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.toggle('on', el.getAttribute('onclick')===`mNav('${pg}')`));
  const t = document.getElementById('m-title'); if(t) t.textContent = MODULES[pg]?.label||pg;
  renderMemberPage();
}

function renderMemberPage() {
  const c = document.getElementById('m-page'); if(!c) return;
  if (S.page === 'services') S.page = 'dashboard'; // Hard block
  switch(S.page) {
    case 'dashboard':   mDashboard(c);       break;
    case 'tasks':       c.innerHTML = mTasksHTML();       break;
    case 'projects':    c.innerHTML = mProjectsHTML();    break;
    case 'clients':     c.innerHTML = mClientsHTML();     break;
    case 'invoices':    c.innerHTML = mInvoicesHTML();    break;
    case 'leads':       c.innerHTML = mLeadsHTML();       break;
    case 'quotations':  c.innerHTML = mQuotationsHTML();  break;
    case 'calendar':    pgCalendar(c, {innerHTML:''});    break;
    case 'alerts':      pgAlerts(c, {innerHTML:''});      break;
    case 'activity':    pgActivity(c, {innerHTML:''});    break;
    default:            mDashboard(c);
  }
}

// ── MEMBER DASHBOARD ────────────────────────────────────────────
function mDashboard(c) {
  const m = curMember(); if(!m) return;
  const myT = S.tasks.filter(t=>t.assignee===m.id);
  const myP = S.projects.filter(p=>(p.team||[]).includes(m.id));
  const ov  = myT.filter(t=>!t.done && daysLeft(t.dueDate)<0);
  c.innerHTML = `
    ${ov.length ? `<div style="margin-bottom:1rem;padding:10px 14px;background:#fef0f0;border:.5px solid #fcc;border-radius:8px;font-size:12px;color:#c0392b"><b>⚠ ${ov.length} task${ov.length!==1?'s':''} overdue</b></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:1.25rem">
      <div class="stat"><div class="stat-label">Open Tasks</div><div class="stat-val">${myT.filter(t=>!t.done).length}</div><div class="stat-sub">${myT.filter(t=>t.done).length} done</div></div>
      <div class="stat"><div class="stat-label">My Projects</div><div class="stat-val">${myP.length}</div><div class="stat-sub">${myP.filter(p=>p.status==='active').length} active</div></div>
      <div class="stat"><div class="stat-label">Due This Week</div><div class="stat-val">${myT.filter(t=>!t.done&&daysLeft(t.dueDate)>=0&&daysLeft(t.dueDate)<=7).length}</div><div class="stat-sub">tasks</div></div>
    </div>
    <div class="g2">
      <div>
        <div class="sh"><span class="sh-title">My Tasks</span></div>
        ${myT.length ? myT.map(t=>{const d=daysLeft(t.dueDate);return `<div class="m-task">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <div class="chk ${t.done?'done':''}" onclick="mToggleTask('${t.id}')" style="margin-top:2px"></div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500;${t.done?'text-decoration:line-through;color:#888':''}">${esc(t.title)}</div>
              <div style="font-size:11px;color:#888;margin-top:2px">${esc(t.project||'')}</div>
              ${t.notes?`<div style="font-size:11px;color:#555;margin-top:5px;background:#f4f3f0;border-radius:5px;padding:5px 8px">${esc(t.notes)}</div>`:''}
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                <span class="badge b-${t.priority==='high'?'red':t.priority==='medium'?'amber':'gray'}">${t.priority}</span>
                <span style="font-size:11px;color:${!t.done&&d<0?'#c0392b':!t.done&&d<=2?'#f57f17':'#888'}">Due ${fmtShort(t.dueDate)}${!t.done&&d<0?' · Overdue':!t.done&&d<=2?' · Soon':''}</span>
              </div>
            </div>
          </div>
        </div>`;}).join('') : em('No tasks assigned to you yet')}
      </div>
      <div>
        <div class="sh"><span class="sh-title">My Projects</span></div>
        ${myP.length ? myP.map(p=>{const pt=S.tasks.filter(t=>t.projectId===p.id&&t.assignee===m.id);const done=pt.filter(t=>t.done).length;return `<div class="card" style="margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div class="proj-dot ${p.dotClass||'d-green'}"></div>
            <div style="font-size:13px;font-weight:500;flex:1">${esc(p.name)}</div>
            <span class="badge ${p.status==='completed'?'b-green':'b-blue'}">${p.status==='completed'?'✓ Done':p.status}</span>
          </div>
          <div style="font-size:11px;color:#888;margin-bottom:8px">Due ${fmtDate(p.dueDate)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <div class="pb" style="flex:1"><div class="pb-fill" style="width:${p.progress}%;background:${p.progress===100?'#2e7d32':dotColor(p.dotClass||'d-green')}"></div></div>
            <span style="font-size:11px;font-weight:600">${p.progress}%</span>
          </div>
          <div style="font-size:11px;color:#888">${done}/${pt.length} of your tasks done</div>
        </div>`;}).join('') : em('No projects assigned to you')}
      </div>
    </div>`;
}

function mToggleTask(id) {
  const t = S.tasks.find(t=>t.id===id);
  if (!t || t.assignee !== S.currentUser) return;
  t.done = !t.done;
  recalcProject(t.projectId);
  save(); renderMemberPage();
}

// ── MEMBER TASKS (table view, assigned only) ──────────────────
function mTasksHTML() {
  const m  = curMember(); if(!m) return '';
  const myT= S.tasks.filter(t=>t.assignee===m.id);
  if (!myT.length) return emptyState('No tasks assigned yet','Your admin will assign tasks to you','','');
  const open = myT.filter(t=>!t.done);
  const done = myT.filter(t=>t.done);
  return `<div class="card" style="padding:0"><table>
    <thead><tr>
      <th style="width:24px;padding-left:12px"></th>
      <th>Task</th><th>Project</th><th>Due</th><th>Priority</th><th>Status</th>
    </tr></thead>
    <tbody>
      ${open.map(t=>{const d=daysLeft(t.dueDate);const ex=S.expandedTasks[t.id];return `<tr onclick="S.expandedTasks['${t.id}']=!S.expandedTasks['${t.id}'];renderMemberPage()">
        <td style="padding-left:12px"><span style="font-size:10px;color:#bbb">${ex?'▾':'▸'}</span></td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="chk ${t.done?'done':''}" onclick="event.stopPropagation();mToggleTask('${t.id}')"></div><span>${esc(t.title)}</span></div></td>
        <td style="color:#888">${esc(t.project||'')}</td>
        <td style="color:${!t.done&&d<0?'#c0392b':!t.done&&d<=2?'#f57f17':'#888'};font-size:11px">${fmtShort(t.dueDate)}${!t.done&&d<0?' · OD':!t.done&&d<=2?' · Soon':''}</td>
        <td><span class="badge b-${t.priority==='high'?'red':t.priority==='medium'?'amber':'gray'}">${t.priority}</span></td>
        <td><span class="badge b-blue">open</span></td>
      </tr>${ex?`<tr><td colspan="6" style="padding:8px 14px 10px 50px;background:#fafaf9">
        ${t.notes?`<div style="font-size:12px;background:#f4f3f0;border-radius:6px;padding:8px 10px">${esc(t.notes)}</div>`:'<div style="font-size:11px;color:#aaa">No notes</div>'}
      </td></tr>`:''}`;}).join('')}
      ${done.length?`<tr><td colspan="6" style="padding:8px 12px;background:#f8f7f5;border-top:1.5px solid rgba(0,0,0,.08)"><span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#888;cursor:pointer" onclick="S.showDone=!S.showDone;renderMemberPage()">${S.showDone?'▾':'▸'} Completed (${done.length})</span></td></tr>${S.showDone?done.map(t=>`<tr><td></td><td><span style="text-decoration:line-through;color:#888">${esc(t.title)}</span></td><td style="color:#888">${esc(t.project||'')}</td><td></td><td></td><td><span class="badge b-green">done</span></td></tr>`).join(''):''}` :''}
    </tbody>
  </table></div>`;
}

// ── MEMBER PROJECTS (assigned only, no financials) ────────────
function mProjectsHTML() {
  const m  = curMember(); if(!m) return '';
  const myP= S.projects.filter(p=>(p.team||[]).includes(m.id));
  if (!myP.length) return emptyState('No projects assigned','Your admin will add you to projects','','');
  return `<div class="g3">${myP.map(p=>{
    const pt  = S.tasks.filter(t=>t.projectId===p.id&&t.assignee===m.id);
    const done= pt.filter(t=>t.done).length;
    const d   = daysLeft(p.dueDate); const ic=p.status==='completed';
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem">
        <div class="proj-dot ${p.dotClass||'d-green'}"></div>
        <div style="font-size:13px;font-weight:600;flex:1">${esc(p.name)}</div>
        <span class="badge ${ic?'b-green':'b-blue'}">${ic?'✓ Done':p.status}</span>
      </div>
      <div style="font-size:11px;color:${d<0&&!ic?'#c0392b':'#888'};margin-bottom:8px">Due ${fmtDate(p.dueDate)}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div class="pb" style="flex:1"><div class="pb-fill" style="width:${p.progress}%;background:${ic?'#2e7d32':dotColor(p.dotClass||'d-green')}"></div></div>
        <span style="font-size:11px;font-weight:600">${p.progress}%</span>
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:8px">${done}/${pt.length} of your tasks done</div>
      ${pt.map(t=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:.5px solid rgba(0,0,0,.05)">
        <div class="chk ${t.done?'done':''}" onclick="mToggleTask('${t.id}')" style="width:13px;height:13px;flex-shrink:0"></div>
        <span style="font-size:12px;flex:1;${t.done?'text-decoration:line-through;color:#888':''}">${esc(t.title)}</span>
        <span style="font-size:10px;color:#aaa">${fmtShort(t.dueDate)}</span>
      </div>`).join('')}
    </div>`;
  }).join('')}</div>`;
}

// ── MEMBER CLIENTS (no revenue) ──────────────────────────────
function mClientsHTML() {
  return `<div class="card">
    <div style="font-size:11px;color:#888;margin-bottom:.75rem">Client contact directory — financial details are admin-only.</div>
    ${S.clients.map(cl=>`<div class="li">
      <div class="av ${cl.avClass||'av-a'}" style="width:32px;height:32px;border-radius:8px;font-size:11px">${esc(cl.initials||'?')}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${esc(cl.name)}</div>
        <div style="font-size:11px;color:#888">${esc(cl.industry||'—')} · ${cl.email!=='—'?esc(cl.email||''):''}</div>
      </div>
      <span class="badge ${cl.status==='active'?'b-green':'b-amber'}">${cl.status}</span>
    </div>`).join('') || em('No clients yet')}
  </div>`;
}

// ── MEMBER INVOICES (no amounts) ─────────────────────────────
function mInvoicesHTML() {
  return `<div class="card">
    <div style="font-size:11px;color:#888;margin-bottom:.75rem">Invoice status — financial amounts are admin-only.</div>
    <table><thead><tr><th>Invoice</th><th>Client</th><th>Due Date</th><th>Status</th></tr></thead>
    <tbody>${S.invoices.map(i=>`<tr>
      <td style="font-weight:700">${esc(i.id)}</td>
      <td>${esc(i.client)}</td>
      <td style="color:#888">${fmtDate(i.dueDate)}</td>
      <td><span class="badge ${i.status==='paid'?'b-green':i.status==='pending'?'b-blue':'b-red'}">${i.status}</span></td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#888;padding:1.5rem">No invoices</td></tr>'}</tbody></table>
  </div>`;
}

// ── MEMBER LEADS (no value/financials) ───────────────────────
function mLeadsHTML() {
  if (!S.leads.length) return emptyState('No leads yet','','','');
  return `<div>${S.leads.map(l=>`<div class="lead-card">
    <div class="lead-hd" onclick="S.expandedLeads['${l.id}']=!S.expandedLeads['${l.id}'];renderMemberPage()">
      <span style="font-size:11px;color:#bbb;width:18px">${S.expandedLeads[l.id]?'▾':'▸'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title)}</div>
        ${l.company?`<div style="font-size:11px;color:#888">${esc(l.company)}</div>`:''}
      </div>
      <span class="badge ${STAGE_BADGE[l.stage]||'b-gray'}">${l.stage}</span>
    </div>
    ${S.expandedLeads[l.id]?`<div class="lead-body">
      <div class="lead-pipe">${LEAD_STAGES.map(st=>{const idx=LEAD_STAGES.indexOf(st),ci=LEAD_STAGES.indexOf(l.stage);return `<div class="lead-stage ${st===l.stage?'cur':idx<ci?'past':''}">${st}</div>`;}).join('')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${[['Contact',l.contact||'—'],['Phone',l.phone||'—'],['Stage',l.stage]].map(([k,v])=>`<div>
          <div style="font-size:10px;color:#888;font-weight:600;text-transform:uppercase;margin-bottom:3px">${k}</div>
          <div style="font-size:12px">${esc(v)}</div>
        </div>`).join('')}
      </div>
    </div>`:''}</div>`).join('')}</div>`;
}

// ── MEMBER QUOTATIONS (no pricing) ───────────────────────────
function mQuotationsHTML() {
  return `<div class="card">
    <div style="font-size:11px;color:#888;margin-bottom:.875rem">Quotation status overview — financial details are admin-only.</div>
    <table><thead><tr><th>Quote No</th><th>Client</th><th>Services</th><th>Status</th><th>Created</th></tr></thead>
    <tbody>${S.quotations.map(q=>`<tr>
      <td style="font-weight:700">${esc(q.quoteNo)}</td>
      <td>${esc(q.clientName||q.leadTitle||'—')}</td>
      <td style="color:#888">${(q.items||[]).map(i=>esc(i.service)).join(', ')||'—'}</td>
      <td><span class="badge ${q.status==='accepted'?'b-green':q.status==='sent'?'b-blue':q.status==='rejected'?'b-red':'b-gray'}">${q.status}</span></td>
      <td style="color:#888">${fmtDate(q.createdAt)}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#888;padding:1.5rem">No quotations</td></tr>'}</tbody></table>
  </div>`;
}

// ── ICON MAP FOR MEMBER SIDEBAR ──────────────────────────────
function mSVG(k) {
  const icons = {
    dashboard:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>',
    tasks:      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h8M5 8h8M5 12h8"/><circle cx="2.5" cy="4" r="1"/><circle cx="2.5" cy="8" r="1"/><circle cx="2.5" cy="12" r="1"/></svg>',
    projects:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h8M2 12h5"/></svg>',
    leads:      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2a3 3 0 110 6 3 3 0 010-6z"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>',
    quotations: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5l-3-3z"/><path d="M9 2v4h4M5 8h6M5 11h3"/></svg>',
    clients:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 7h6M5 10h4"/></svg>',
    invoices:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5l-3-3z"/><path d="M9 2v4h4M5 8h6M5 11h4"/></svg>',
    calendar:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>',
    alerts:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5z"/><path d="M6.5 13a1.5 1.5 0 003 0"/></svg>',
    activity:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h2l2-5 3 10 2-5h3"/></svg>',
  };
  return icons[k] || icons.dashboard;
}
