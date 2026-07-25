// ================================================================
// BBC AGENCY OS — module-projects.js
// ================================================================
function pgProjects(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openAddProject()">+ New Project</button>`;
  if (!S.projects.length) { c.innerHTML = emptyState('No projects yet','Add a client first, then create a project','openAddProject()','+ New Project'); return; }
  c.innerHTML = `<div class="g3">${S.projects.map(p => {
    const tasks = S.tasks.filter(t=>t.projectId===p.id);
    const done  = tasks.filter(t=>t.done).length;
    const d = daysLeft(p.dueDate); const ic = p.status==='completed';
    const teamAv = (p.team||[]).map(id => {
      const m = S.team.find(m=>m.id===id);
      return `<div class="av ${m?m.avClass:'av-a'}" style="width:22px;height:22px;margin-left:-5px;border:1.5px solid #fff;font-size:8px">${id==='OWNER'?S.ownerInitials:id}</div>`;
    }).join('');
    return `<div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem">
        <div class="proj-dot ${p.dotClass||'d-green'}"></div>
        <div style="font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</div>
        <span class="badge ${ic?'b-green':p.status==='active'?'b-blue':'b-amber'}">${ic?'✓ Done':p.status}</span>
      </div>
      <div style="font-size:11px;color:#888;margin-bottom:3px">${esc(p.client)}</div>
      <div style="font-size:11px;color:${d<0&&!ic?'#c0392b':d<=7&&!ic?'#f57f17':'#888'};margin-bottom:10px">
        Due ${fmtDate(p.dueDate)}${d<0&&!ic?' · Overdue':d<=7&&!ic?' · Due soon':''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;margin-left:5px">${teamAv}</div>
        <span style="font-size:11px;color:#888">${done}/${tasks.length} tasks</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div class="pb" style="flex:1"><div class="pb-fill" style="width:${p.progress}%;background:${ic?'#2e7d32':dotColor(p.dotClass||'d-green')}"></div></div>
        <span style="font-size:12px;font-weight:700;color:${ic?'#2e7d32':dotColor(p.dotClass||'d-green')}">${p.progress}%</span>
      </div>
      ${ic ? `<div style="font-size:11px;color:#2e7d32;background:#e8f5e9;border-radius:6px;padding:5px 9px;text-align:center;margin-bottom:8px">✓ All tasks complete</div>` : ''}
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="openAddTaskForProject('${p.id}')" style="flex:1;font-size:11px">+ Add Task</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Delete</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function openAddProject() {
  if (!S.clients.length) { alert('Add a client first before creating a project.'); return; }
  window._extraTasks = [];
  const co = S.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const to = S.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  showModal(`<div class="modal-title">New Project</div>
    <div style="background:#f3e8ff;border:.5px solid #d1b3ff;border-radius:7px;padding:8px 12px;font-size:11px;color:#6d28d9;margin-bottom:1rem">⚡ At least one task is required when creating a project.</div>
    <div class="fg"><label class="fl">Project Name *</label><input class="fi" id="pj-name" placeholder="e.g. Q3 Social Campaign"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Client *</label><select class="fi" id="pj-client">${co}</select></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" id="pj-due" type="date"></div>
    </div>
    <div class="fg"><label class="fl">Status</label><select class="fi" id="pj-status"><option value="active">Active</option><option value="lead">Lead / Proposal</option></select></div>
    <div style="border-top:.5px solid #eee;margin:.875rem 0;padding-top:.875rem">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-bottom:8px">First Task <span style="color:#c0392b">*</span></div>
    </div>
    <div class="fg"><label class="fl">Task Title *</label><input class="fi" id="t1-title" placeholder="e.g. Initial brief and kickoff"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Assign To</label><select class="fi" id="t1-assign"><option value="OWNER">${esc(S.ownerName)} (You)</option>${to}</select></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" id="t1-due" type="date"></div>
    </div>
    <div class="fg"><label class="fl">Priority</label><select class="fi" id="t1-pri"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="t1-notes" style="min-height:56px" placeholder="Task details..."></textarea></div>
    <div id="extra-tasks"></div>
    <button class="btn btn-sm" onclick="addExtraTask()" style="margin-bottom:.75rem">+ Add Another Task</button>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProject()">Create Project & Tasks</button>
    </div>`);
}

function addExtraTask() {
  const i = (window._extraTasks || []).length;
  if (!window._extraTasks) window._extraTasks = [];
  window._extraTasks.push(i);
  const to = S.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  const div = document.createElement('div');
  div.id = `et-${i}`;
  div.style.cssText = 'background:#f8f7f5;border-radius:8px;padding:10px;margin-bottom:8px;border:.5px solid #eee';
  div.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <span style="font-size:11px;font-weight:600;color:#888">Task ${i+2}</span>
    <button class="btn btn-danger btn-sm" onclick="this.closest('[id]').remove()">✕</button>
  </div>
  <div class="fg" style="margin-bottom:6px"><input class="fi" id="et${i}-t" placeholder="Task title *"></div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
    <select class="fi" id="et${i}-a"><option value="OWNER">${esc(S.ownerName)}</option>${to}</select>
    <input class="fi" id="et${i}-d" type="date">
    <select class="fi" id="et${i}-p"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select>
  </div>`;
  document.getElementById('extra-tasks').appendChild(div);
}

function saveProject() {
  const name = document.getElementById('pj-name').value.trim();
  if (!name) { alert('Project name required.'); return; }
  const t1 = document.getElementById('t1-title').value.trim();
  if (!t1) { alert('At least one task is required.'); document.getElementById('t1-title').focus(); return; }
  const clientId = document.getElementById('pj-client').value;
  const cl = S.clients.find(c=>c.id===clientId);
  const due = document.getElementById('pj-due').value;
  const pid = uid();
  const dotC = dotClass(S.projects.length);
  const proj = {
    id:pid, name, client:cl.name, clientId, status:document.getElementById('pj-status').value,
    progress:0, dotClass:dotC, team:['OWNER'],
    dueDate: due ? new Date(due) : new Date(TODAY.getTime()+30*86400000)
  };
  S.projects.push(proj);
  if (cl) cl.projects = (cl.projects||0) + 1;

  // Save first task
  const t1due = document.getElementById('t1-due').value;
  const t1assign = document.getElementById('t1-assign').value;
  S.tasks.push({
    id:uid(), title:t1, project:name, projectId:pid, assignee:t1assign,
    priority:document.getElementById('t1-pri').value,
    notes:document.getElementById('t1-notes').value.trim(),
    done:false,
    dueDate: t1due ? new Date(t1due) : new Date(TODAY.getTime()+7*86400000)
  });
  if (!proj.team.includes(t1assign)) proj.team.push(t1assign);

  // Extra tasks
  (window._extraTasks||[]).forEach(i => {
    const titleEl = document.getElementById(`et${i}-t`);
    if (!titleEl) return;
    const tt = titleEl.value.trim(); if (!tt) return;
    const tdue = document.getElementById(`et${i}-d`)?.value;
    const tassign = document.getElementById(`et${i}-a`)?.value || 'OWNER';
    S.tasks.push({
      id:uid(), title:tt, project:name, projectId:pid, assignee:tassign,
      priority:document.getElementById(`et${i}-p`)?.value||'medium',
      notes:'', done:false,
      dueDate: tdue ? new Date(tdue) : new Date(TODAY.getTime()+7*86400000)
    });
    if (!proj.team.includes(tassign)) proj.team.push(tassign);
  });
  window._extraTasks = [];
  recalcProject(pid); save();
  logAct('project', `Project <b>${esc(name)}</b> created`, '📁');
  toast(`"${name}" created`); closeModal(); renderPage();
}

function openAddTaskForProject(pid) {
  const p = S.projects.find(p=>p.id===pid); if(!p) return;
  const to = S.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  showModal(`<div class="modal-title">Add Task — ${esc(p.name)}</div>
    <div class="fg"><label class="fl">Task Title *</label><input class="fi" id="ta-title" placeholder="e.g. Design story set"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Assign To</label><select class="fi" id="ta-assign"><option value="OWNER">${esc(S.ownerName)} (You)</option>${to}</select></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" id="ta-due" type="date"></div>
    </div>
    <div class="fg"><label class="fl">Priority</label><select class="fi" id="ta-pri"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="ta-notes" placeholder="Task details..."></textarea></div>
    <input type="hidden" id="ta-proj" value="${pid}">
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTask()">Add Task</button></div>`);
}

function deleteProject(pid) {
  const p = S.projects.find(p=>p.id===pid); if(!p) return;
  const taskCount = S.tasks.filter(t=>t.projectId===pid).length;
  if (!confirm(`Delete "${p.name}"?\n\n${taskCount} task${taskCount!==1?'s':''} will also be deleted.`)) return;
  S.projects.splice(S.projects.findIndex(p=>p.id===pid), 1);
  S.tasks = S.tasks.filter(t=>t.projectId!==pid);
  save(); toast(`"${p.name}" deleted`); renderPage();
}
