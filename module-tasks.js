// ================================================================
// BBC AGENCY OS — module-tasks.js
// ================================================================
function pgTasks(c, a) {
  a.innerHTML = `
    <button class="btn" onclick="S.taskTab=S.taskTab==='list'?'board':'list';renderPage()">
      ${S.taskTab==='list'?'Switch to Board':'Switch to List'}
    </button>
    <button class="btn btn-primary" onclick="openAddTask()">+ Add Task</button>`;

  if (!S.tasks.length) { c.innerHTML = emptyState('No tasks yet','Create a project first, then add tasks','openAddTask()','+ Add Task'); return; }

  const openT = S.tasks.filter(t=>!t.done);
  const doneT = S.tasks.filter(t=>t.done);

  if (S.taskTab === 'list') {
    c.innerHTML = `<div class="card" style="padding:0"><table>
      <thead><tr>
        <th style="width:24px;padding-left:12px"></th>
        <th>Task</th><th>Project</th><th>Assignee</th><th>Due</th><th>Priority</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${openT.map(t=>taskRow(t)).join('')}
        ${doneT.length ? `
          <tr><td colspan="7" style="padding:8px 12px;background:#f8f7f5;border-top:1.5px solid rgba(0,0,0,.08)">
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;cursor:pointer" onclick="S.showDone=!S.showDone;renderPage()">
              ${S.showDone?'▾':'▸'} Completed (${doneT.length}) — click to ${S.showDone?'hide':'show'}
            </span>
          </td></tr>
          ${S.showDone ? doneT.map(t=>taskRow(t)).join('') : ''}
        ` : ''}
      </tbody>
    </table></div>`;
  } else {
    // Kanban board
    const cols = [
      {k:'todo', l:'To Do'},
      {k:'doing', l:'In Progress'},
      {k:'review', l:'Review'},
      {k:'done', l:'Done ✓'}
    ];
    const buckets = {todo:[], doing:[], review:[], done:[]};
    openT.forEach((t,i) => { if(i%3===0) buckets.review.push(t); else if(i%3===1) buckets.doing.push(t); else buckets.todo.push(t); });
    buckets.done = doneT;
    c.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem">
      ${cols.map(col=>`<div style="background:#f4f3f0;border-radius:12px;padding:.875rem">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:.75rem;display:flex;justify-content:space-between">
          <span>${col.l}</span>
          <span style="background:#fff;border:.5px solid #eee;border-radius:10px;padding:1px 7px;font-size:10px">${buckets[col.k].length}</span>
        </div>
        ${buckets[col.k].map(t=>{const d=daysLeft(t.dueDate);return `<div style="background:#fff;border:.5px solid #eee;border-radius:8px;padding:.75rem;margin-bottom:.5rem;cursor:pointer" onclick="openEditTask('${t.id}')">
          <div style="font-size:12px;font-weight:500;margin-bottom:5px;${t.done?'text-decoration:line-through;color:#888':''}">${esc(t.title)}</div>
          <div style="font-size:11px;color:${!t.done&&d<0?'#c0392b':!t.done&&d<=2?'#f57f17':'#888'};margin-bottom:5px">${fmtShort(t.dueDate)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:80px">${esc(t.project||'')}</span>
            <span class="badge b-${t.priority==='high'?'red':t.priority==='medium'?'amber':'gray'}" style="font-size:9px">${t.priority}</span>
          </div>
        </div>`;}).join('') || `<div style="font-size:12px;color:#aaa;text-align:center;padding:1rem 0">Empty</div>`}
      </div>`).join('')}
    </div>`;
  }
}

function taskRow(t) {
  const d  = daysLeft(t.dueDate);
  const ex = S.expandedTasks[t.id];
  const m  = S.team.find(m=>m.id===t.assignee);
  return `<tr onclick="S.expandedTasks['${t.id}']=!S.expandedTasks['${t.id}'];renderPage()">
    <td style="padding-left:12px"><span style="font-size:10px;color:#bbb">${ex?'▾':'▸'}</span></td>
    <td><div style="display:flex;align-items:center;gap:8px">
      <div class="chk ${t.done?'done':''}" onclick="event.stopPropagation();taskToggle('${t.id}')"></div>
      <span style="${t.done?'text-decoration:line-through;color:#888':''}">${esc(t.title)}</span>
    </div></td>
    <td style="color:#888">${esc(t.project||'')}</td>
    <td><div style="display:flex;align-items:center;gap:6px">
      <div class="av ${m?m.avClass:'av-a'}" style="width:20px;height:20px;font-size:8px">${t.assignee==='OWNER'?S.ownerInitials:t.assignee}</div>
      <span style="color:#888">${nMap[t.assignee]||t.assignee}</span>
    </div></td>
    <td style="color:${!t.done&&d<0?'#c0392b':!t.done&&d<=2?'#f57f17':'#888'};font-size:11px">
      ${fmtShort(t.dueDate)}${!t.done&&d<0?' · OD':!t.done&&d<=2?' · Soon':''}
    </td>
    <td><span class="badge b-${t.priority==='high'?'red':t.priority==='medium'?'amber':'gray'}">${t.priority}</span></td>
    <td><span class="badge ${t.done?'b-green':'b-blue'}">${t.done?'done':'open'}</span></td>
  </tr>
  ${ex ? `<tr><td colspan="7" style="padding:10px 14px 10px 50px;background:#fafaf9;border-bottom:.5px solid rgba(0,0,0,.06)">
    ${t.notes ? `<div style="font-size:12px;background:#f4f3f0;border-radius:6px;padding:8px 10px;color:#444;margin-bottom:8px">${esc(t.notes)}</div>` : '<div style="font-size:11px;color:#aaa;margin-bottom:8px">No notes</div>'}
    <button class="btn btn-sm no-print" onclick="event.stopPropagation();openEditTask('${t.id}')">✎ Edit Task</button>
  </td></tr>` : ''}`;
}

function taskToggle(id) {
  const t = S.tasks.find(t=>t.id===id); if(!t) return;
  t.done = !t.done;
  recalcProject(t.projectId);
  logAct('task', `<b>${nMap[S.currentUser]||S.currentUser}</b> ${t.done?'completed':'reopened'} "<b>${esc(t.title)}</b>"`, t.done?'✓':'↺');
  save(); renderPage();
}

function openAddTask() {
  if (!S.projects.length) { alert('Create a project first.'); return; }
  const po = S.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const to = S.team.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('');
  showModal(`<div class="modal-title">Add Task</div>
    <div class="fg"><label class="fl">Task Title *</label><input class="fi" id="ta-title" placeholder="e.g. Design story set"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Project</label><select class="fi" id="ta-proj">${po}</select></div>
      <div class="fg"><label class="fl">Assign To</label><select class="fi" id="ta-assign"><option value="OWNER">${esc(S.ownerName)} (You)</option>${to}</select></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" id="ta-due" type="date"></div>
      <div class="fg"><label class="fl">Priority</label><select class="fi" id="ta-pri"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div>
    </div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="ta-notes" placeholder="Task details..."></textarea></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTask()">Add Task</button></div>`);
}

function saveTask() {
  const title = document.getElementById('ta-title').value.trim();
  if (!title) { alert('Title required.'); return; }
  const projId = document.getElementById('ta-proj').value;
  const proj   = S.projects.find(p=>p.id===projId);
  const assign = document.getElementById('ta-assign').value;
  const due    = document.getElementById('ta-due').value;
  S.tasks.push({
    id:uid(), title, project:proj?proj.name:'', projectId:projId, assignee:assign,
    priority:document.getElementById('ta-pri').value,
    notes:document.getElementById('ta-notes').value.trim(),
    done:false,
    dueDate: due ? new Date(due) : new Date(TODAY.getTime()+7*86400000)
  });
  if (proj && !(proj.team||[]).includes(assign)) proj.team = [...(proj.team||['OWNER']), assign];
  recalcProject(projId);
  logAct('task', `<b>${nMap[assign]||assign}</b> assigned "<b>${esc(title)}</b>"`, '→');
  save(); closeModal(); renderPage();
}

function openEditTask(id) {
  const t  = S.tasks.find(t=>t.id===id); if(!t) return;
  const po = S.projects.map(p=>`<option value="${p.id}" ${p.id===t.projectId?'selected':''}>${esc(p.name)}</option>`).join('');
  const to = S.team.map(m=>`<option value="${m.id}" ${m.id===t.assignee?'selected':''}>${esc(m.name)}</option>`).join('');
  const dv = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '';
  showModal(`<div class="modal-title">Edit Task</div>
    <div class="fg"><label class="fl">Title *</label><input class="fi" id="ta-title" value="${esc(t.title)}"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Project</label><select class="fi" id="ta-proj">${po}</select></div>
      <div class="fg"><label class="fl">Assign To</label><select class="fi" id="ta-assign"><option value="OWNER" ${t.assignee==='OWNER'?'selected':''}>${esc(S.ownerName)}</option>${to}</select></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" id="ta-due" type="date" value="${dv}"></div>
      <div class="fg"><label class="fl">Priority</label><select class="fi" id="ta-pri">
        <option value="high" ${t.priority==='high'?'selected':''}>High</option>
        <option value="medium" ${t.priority==='medium'?'selected':''}>Medium</option>
        <option value="low" ${t.priority==='low'?'selected':''}>Low</option>
      </select></div>
    </div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="ta-notes">${esc(t.notes||'')}</textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger btn-sm" onclick="deleteTask('${id}')">Delete</button>
      <button class="btn btn-primary" onclick="updateTask('${id}')">Save</button>
    </div>`);
}

function updateTask(id) {
  const t = S.tasks.find(t=>t.id===id); if(!t) return;
  t.title    = document.getElementById('ta-title').value.trim() || t.title;
  t.projectId= document.getElementById('ta-proj').value;
  const proj = S.projects.find(p=>p.id===t.projectId);
  if (proj) t.project = proj.name;
  t.assignee = document.getElementById('ta-assign').value;
  t.priority = document.getElementById('ta-pri').value;
  t.notes    = document.getElementById('ta-notes').value.trim();
  const due  = document.getElementById('ta-due').value;
  if (due) t.dueDate = new Date(due);
  save(); closeModal(); renderPage();
}

function deleteTask(id) {
  const t = S.tasks.find(t=>t.id===id); if(!t) return;
  if (!confirm(`Delete "${t.title}"?`)) return;
  S.tasks.splice(S.tasks.findIndex(t=>t.id===id), 1);
  recalcProject(t.projectId);
  save(); closeModal(); renderPage();
}
