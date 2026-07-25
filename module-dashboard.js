// ================================================================
// BBC AGENCY OS — module-dashboard.js
// ================================================================
function pgDashboard(c, a) {
  const fu = getFollowups(), al = getAlerts(), ov = al.filter(x=>x.type==='over');
  const paid = S.invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount),0);
  const pend = S.invoices.filter(i=>i.status==='pending').reduce((s,i)=>s+Number(i.amount),0);
  const openLeads = S.leads.filter(l=>!['Onboarded','Lost','Rejected'].includes(l.stage));
  c.innerHTML = `
    ${fu.length ? `<div style="margin-bottom:.875rem;padding:10px 14px;background:#f3e8ff;border:.5px solid #d1b3ff;border-radius:9px">
      <div style="font-size:10px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">📞 Lead Follow-ups Due Today</div>
      ${fu.map(l=>`<div style="display:flex;align-items:center;gap:10px;margin-top:5px">
        <span style="font-size:13px;font-weight:500;flex:1">${esc(l.title)}</span>
        <span style="font-size:11px;color:#6d28d9">${fmtDT(l.followupAt)}</span>
        ${l.followupPhone?`<span style="font-size:11px;color:#888">${esc(l.followupPhone)}</span>`:''}
        <button class="btn btn-sm" style="background:#e8f5e9;color:#2e7d32;border-color:#b2dfdb" onclick="markFollowupDone('${l.id}')">✓ Done</button>
        <button class="btn btn-sm" onclick="openLead('${l.id}')">Open</button>
      </div>`).join('')}
    </div>` : ''}
    ${ov.length ? `<div onclick="nav('alerts')" style="cursor:pointer;margin-bottom:.875rem;padding:10px 14px;background:#fef0f0;border:.5px solid #fcc;border-radius:9px;display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:12px;color:#c0392b;font-weight:500">⚠ ${ov.length} item${ov.length!==1?'s':''} overdue</span>
      <span style="font-size:11px;color:#c0392b">View Alerts →</span>
    </div>` : ''}
    <div class="g4" style="margin-bottom:1.25rem">
      <div class="stat"><div class="stat-label">Active Projects</div><div class="stat-val">${S.projects.filter(p=>p.status==='active').length}</div><div class="stat-sub">${S.projects.filter(p=>p.status==='completed').length} completed</div></div>
      <div class="stat"><div class="stat-label">Open Tasks</div><div class="stat-val">${S.tasks.filter(t=>!t.done).length}</div><div class="stat-sub">${S.tasks.filter(t=>t.done).length} done</div></div>
      <div class="stat"><div class="stat-label">Active Leads</div><div class="stat-val">${openLeads.length}</div><div class="stat-sub">${S.leads.filter(l=>l.stage==='Onboarded').length} onboarded</div></div>
      <div class="stat"><div class="stat-label">Revenue Collected</div><div class="stat-val" style="font-size:15px">${fmtINR(paid)}</div><div class="stat-sub">${fmtINR(pend)} pending</div></div>
    </div>
    <div class="g2" style="margin-bottom:1rem">
      <div class="card">
        <div class="sh"><span class="sh-title">Active Projects</span><button class="btn btn-sm" onclick="nav('projects')">View all</button></div>
        ${S.projects.filter(p=>p.status==='active').slice(0,5).map(p=>{const d=daysLeft(p.dueDate);return `<div class="li">
          <div class="proj-dot ${p.dotClass||'d-green'}"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div>
            <div style="font-size:11px;color:#888">${esc(p.client)} · ${fmtShort(p.dueDate)}</div>
            <div class="pb" style="margin-top:4px"><div class="pb-fill" style="width:${p.progress}%;background:${dotColor(p.dotClass||'d-green')}"></div></div>
          </div>
          <span class="badge b-${p.progress===100?'green':p.progress>40?'blue':'amber'}">${p.progress}%</span>
        </div>`;}).join('') || em('No active projects')}
      </div>
      <div class="card">
        <div class="sh"><span class="sh-title">Lead Pipeline</span><button class="btn btn-sm" onclick="nav('leads')">View all</button></div>
        ${LEAD_STAGES.map(st=>{const cnt=S.leads.filter(l=>l.stage===st).length;return `<div class="li">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${STAGE_COLOR[st]};flex-shrink:0"></span>
          <span style="font-size:12px;flex:1">${st}</span>
          <span class="badge ${STAGE_BADGE[st]||'b-gray'}">${cnt}</span>
        </div>`;}).join('')}
      </div>
    </div>
    <div class="g2">
      <div class="card">
        <div class="sh"><span class="sh-title">Upcoming Tasks</span><button class="btn btn-sm" onclick="nav('tasks')">View all</button></div>
        ${S.tasks.filter(t=>!t.done).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5).map(t=>{const d=daysLeft(t.dueDate);return `<div class="li">
          <div class="chk" onclick="taskToggle('${t.id}')" style="flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</div>
            <div style="font-size:11px;color:#888">${esc(t.project||'')}${t.assignee&&t.assignee!=='OWNER'?' · '+( nMap[t.assignee]||t.assignee):''}</div>
          </div>
          <span class="badge ${d<0?'b-red':d<=2?'b-amber':'b-gray'}" style="font-size:9px">${d<0?'Overdue':d===0?'Today':d<=2?'Soon':fmtShort(t.dueDate)}</span>
        </div>`;}).join('') || em('No open tasks')}
      </div>
      <div class="card">
        <div class="sh"><span class="sh-title">Recent Activity</span><button class="btn btn-sm" onclick="nav('activity')">View all</button></div>
        ${S.activity.slice(0,6).map(a=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:.5px solid rgba(0,0,0,.05)">
          <div style="width:24px;height:24px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">${a.icon||'•'}</div>
          <div><div style="font-size:12px">${a.text}</div><div style="font-size:10px;color:#888;margin-top:2px">${a.time}</div></div>
        </div>`).join('') || em('No activity yet')}
      </div>
    </div>`;
}

function markFollowupDone(id) {
  const l = S.leads.find(l=>l.id===id); if(!l) return;
  l.followupDone = true; save();
  toast(`Follow-up with ${l.title} marked done ✓`);
  logAct('lead', `Follow-up with <b>${esc(l.title)}</b> completed`, '✓');
  renderPage();
}

function openLead(id) { S.expandedLeads[id] = true; nav('leads'); }
