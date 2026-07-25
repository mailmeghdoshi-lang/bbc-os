// ================================================================
// BBC AGENCY OS — module-alerts.js
// Deadline alerts + lead follow-up alerts
// Follow-up alerts are ADMIN ONLY — never shown to team members
// ================================================================
function pgAlerts(c, a) {
  const al = getAlerts();
  const ov = al.filter(x=>x.type==='over');
  const soon = al.filter(x=>x.type==='soon');
  const fu = getFollowups(); // admin-only per core.js
  c.innerHTML = `<div style="max-width:680px">
    ${!al.length && !fu.length ? `<div class="card" style="text-align:center;padding:2rem;color:#888">✓ All clear — nothing needs attention right now</div>` : ''}
    ${fu.length ? `<div style="margin-bottom:1.25rem">
      <div style="font-size:10px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">📞 Lead Follow-ups (${fu.length})</div>
      ${fu.map(l=>`<div class="alert-card al-purple">
        <div style="width:7px;height:7px;border-radius:50%;background:#7c3aed;margin-top:4px;flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#6d28d9;margin-bottom:2px">Follow-up · ${esc(l.stage)}</div>
          <div style="font-size:13px;font-weight:500">${esc(l.title)}</div>
          <div style="font-size:11px;color:#6d28d9;margin-top:2px">${fmtDT(l.followupAt)}${l.followupPhone?' · '+esc(l.followupPhone):''}</div>
          ${l.followupNote ? `<div style="font-size:11px;color:#555;margin-top:2px">${esc(l.followupNote)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm" style="background:#e8f5e9;color:#2e7d32;border-color:#b2dfdb" onclick="markFollowupDone('${l.id}')">✓ Done</button>
          <button class="btn btn-sm" onclick="openLead('${l.id}')">Open Lead</button>
        </div>
      </div>`).join('')}
    </div>` : ''}
    ${ov.length ? `<div style="margin-bottom:1.25rem">
      <div style="font-size:10px;font-weight:700;color:#c0392b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">Overdue (${ov.length})</div>
      ${ov.map(alertCard).join('')}
    </div>` : ''}
    ${soon.length ? `<div>
      <div style="font-size:10px;font-weight:700;color:#f57f17;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">Due Soon (${soon.length})</div>
      ${soon.map(alertCard).join('')}
    </div>` : ''}
  </div>`;
}

function alertCard(al) {
  const ov = al.type === 'over';
  return `<div class="alert-card ${ov?'al-red':'al-amber'}">
    <div style="width:7px;height:7px;border-radius:50%;background:${ov?'#c0392b':'#f57f17'};margin-top:4px;flex-shrink:0"></div>
    <div style="flex:1">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:${ov?'#c0392b':'#f57f17'};margin-bottom:2px">${esc(al.kind)} ${ov?'Overdue':'Due Soon'}</div>
      <div style="font-size:13px;font-weight:500">${esc(al.name)}</div>
      <div style="font-size:11px;color:${ov?'#c0392b':'#f57f17'};margin-top:2px">${esc(al.detail)}</div>
    </div>
  </div>`;
}
