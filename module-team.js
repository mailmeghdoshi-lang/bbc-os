// ================================================================
// BBC AGENCY OS — module-team.js
// Admin CRUD for team members + module access control
// ================================================================
function pgTeam(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openAddMember()">+ Add Member</button>`;
  if (!S.team.length) {
    c.innerHTML = emptyState('No team members yet','Add members, set their modules, share their login credentials','openAddMember()','+ Add Member');
    return;
  }
  c.innerHTML = `
    <div style="margin-bottom:1rem;padding:10px 14px;background:#e3f2fd;border:.5px solid #90caf9;border-radius:8px;font-size:12px;color:#1565c0">
      <b>Module Access Control.</b> Members log in with email & password. They only see modules you enable,
      only their own tasks & projects, and <b>never</b> see financial data or service pricing.
    </div>
    <div class="g2">
      ${S.team.map(m => {
        const mt     = S.tasks.filter(t=>t.assignee===m.id&&!t.done);
        const perms  = memberPerms(m);
        const modKeys= Object.keys(MODULES);
        const enabled= modKeys.filter(k=>perms[k]).length;
        return `<div class="card">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:1rem">
            <div class="av ${m.avClass||'av-a'}" style="width:42px;height:42px;font-size:14px">${m.id}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:700">${esc(m.name)}</div>
              <div style="font-size:11px;color:#888">${esc(m.role||'Team Member')}</div>
              <div style="font-size:11px;color:${m.email?'#1a1a1a':'#c0392b'};margin-top:3px">${m.email?'📧 '+esc(m.email):'⚠ No email set — click Edit'}</div>
              <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap">
                <span class="badge ${mt.length>2?'b-amber':mt.length>0?'b-green':'b-gray'}">${mt.length} open task${mt.length!==1?'s':''}</span>
                <span class="badge b-blue">${enabled} module${enabled!==1?'s':''} enabled</span>
              </div>
            </div>
            <div style="display:flex;gap:5px;flex-shrink:0">
              <button class="btn btn-sm" onclick="openEditMember('${m.id}')">✎ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="removeMember('${m.id}')">✕</button>
            </div>
          </div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:7px">Module Access — click to toggle</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:.875rem">
            ${modKeys.map(k => {
              const on = !!perms[k];
              return `<div onclick="togglePerm('${m.id}','${k}')" style="display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:7px;border:1px solid ${on?'#7c3aed':'rgba(0,0,0,.09)'};background:${on?'#f0e6ff':'#fafaf9'};cursor:pointer;user-select:none">
                <div class="toggle ${on?'on':''}"></div>
                <span style="font-size:11px;font-weight:${on?'600':'400'};color:${on?'#6d28d9':'#999'}">${MODULES[k].label}</span>
              </div>`;
            }).join('')}
          </div>
          <div style="font-size:10px;color:#f57f17;background:#fff8e1;border-radius:6px;padding:5px 9px;margin-bottom:.75rem">
            🔒 Services catalog, rates & all financial figures are permanently hidden from members.
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn" onclick="openAssignTask('${m.id}')" style="flex:1;font-size:11px">+ Assign Task</button>
            <button class="btn btn-sm" onclick="openEditMember('${m.id}')">Edit Details</button>
            <button class="btn btn-danger btn-sm" onclick="removeMember('${m.id}')">Remove</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function togglePerm(mid, mod) {
  const m = S.team.find(m=>m.id===mid); if(!m) return;
  if (!m.perms) m.perms = {...DEFAULT_PERMS};
  m.perms[mod] = !m.perms[mod];
  save(); toast(`${m.name}: ${MODULES[mod].label} ${m.perms[mod]?'✓ enabled':'disabled'}`); renderPage();
}

function removeMember(id) {
  const m = S.team.find(m=>m.id===id); if(!m) return;
  if (!confirm(`Remove "${m.name}" from the team?\n\nThey will lose login access. Their tasks will remain.`)) return;
  S.team.splice(S.team.findIndex(m=>m.id===id), 1);
  rebuildMaps(); save(); toast(`${m.name} removed`); renderPage();
}

function openAssignTask(mid) {
  const m = S.team.find(m=>m.id===mid); if(!m) return;
  if (!S.projects.length) { alert('Create a project first.'); return; }
  const po = S.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  showModal(`<div class="modal-title">Assign Task to ${esc(m.name)}</div>
    <div class="fg"><label class="fl">Task Title *</label><input class="fi" id="ta-title" placeholder="e.g. Write homepage copy"></div>
    <div class="g2">
      <div class="fg"><label class="fl">Project</label><select class="fi" id="ta-proj">${po}</select></div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" id="ta-due" type="date"></div>
    </div>
    <div class="fg"><label class="fl">Priority</label><select class="fi" id="ta-pri"><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select></div>
    <div class="fg"><label class="fl">Notes</label><textarea class="fi" id="ta-notes"></textarea></div>
    <input type="hidden" id="ta-assign" value="${mid}">
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTask()">Assign</button></div>`);
}

function openAddMember() {
  const mods = Object.keys(MODULES);
  showModal(`<div class="modal-title">Add Team Member</div>
    <div class="g2">
      <div class="fg"><label class="fl">Full Name *</label><input class="fi" id="mm-name" placeholder="e.g. Anika Sharma"></div>
      <div class="fg"><label class="fl">Role</label><input class="fi" id="mm-role" placeholder="e.g. Graphic Designer"></div>
      <div class="fg"><label class="fl">Email * (used to log in)</label><input class="fi" id="mm-email" type="email" placeholder="anika@agency.co"></div>
      <div class="fg"><label class="fl">Initials (2–3 chars)</label><input class="fi" id="mm-id" maxlength="3" placeholder="AS"></div>
      <div class="fg"><label class="fl">Password *</label><div class="pw-wrap"><input class="fi" id="mm-p1" type="password" placeholder="Min 6 characters"><span class="pw-eye" onclick="toggleEye('mm-p1',this)">👁</span></div></div>
      <div class="fg"><label class="fl">Confirm Password *</label><input class="fi" id="mm-p2" type="password"></div>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#888;margin-bottom:8px">Module Access</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:1rem">
      ${mods.map(k=>`<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:7px;border:1px solid rgba(0,0,0,.09);cursor:pointer;background:#fafaf9">
        <input type="checkbox" id="mp-${k}" ${DEFAULT_PERMS[k]?'checked':''} style="accent-color:#7c3aed;width:14px;height:14px">
        <span style="font-size:11px">${MODULES[k].label}</span>
      </label>`).join('')}
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveMember()">Add Member</button></div>`);
}

async function saveMember() {
  const name  = document.getElementById('mm-name').value.trim();  if (!name)  { alert('Name required.'); return; }
  const email = document.getElementById('mm-email').value.trim().toLowerCase(); if (!email) { alert('Email required.'); return; }
  const p1    = document.getElementById('mm-p1').value;
  const p2    = document.getElementById('mm-p2').value;
  if (p1.length < 6)  { alert('Password must be at least 6 characters.'); return; }
  if (p1 !== p2)      { alert('Passwords do not match.'); return; }
  if (S.team.find(m=>(m.email||'').toLowerCase()===email) || email===S.adminEmail.toLowerCase()) {
    alert('This email is already in use.'); return;
  }
  const rawId = document.getElementById('mm-id').value.trim().toUpperCase() || mkInit(name);
  const mid   = rawId.slice(0,3);
  if (S.team.find(m=>m.id===mid)) { alert(`Initials "${mid}" already in use. Choose different initials.`); return; }
  const perms = {};
  Object.keys(MODULES).forEach(k => { perms[k] = document.getElementById(`mp-${k}`)?.checked || false; });
  S.team.push({
    id:mid, name, email, role:document.getElementById('mm-role').value.trim()||'Team Member',
    avClass:avClass(S.team.length), perms, pwdHash:await hashPwd(p1)
  });
  rebuildMaps(); save();
  logAct('client', `Team member <b>${esc(name)}</b> added`, '👤');
  toast(`${name} added ✓`); closeModal(); renderPage();
}

function openEditMember(id) {
  const m = S.team.find(m=>m.id===id); if(!m) return;
  showModal(`<div class="modal-title">Edit — ${esc(m.name)}</div>
    <div class="fg"><label class="fl">Full Name *</label><input class="fi" id="em-name" value="${esc(m.name)}"></div>
    <div class="fg"><label class="fl">Role</label><input class="fi" id="em-role" value="${esc(m.role||'')}"></div>
    <div class="fg"><label class="fl">Email</label><input class="fi" id="em-email" type="email" value="${esc(m.email||'')}"></div>
    <div style="border-top:.5px solid #eee;padding-top:.875rem;margin:.875rem 0">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:8px">Reset Password (leave blank to keep current)</div>
      <div class="g2">
        <div class="fg"><label class="fl">New Password</label><div class="pw-wrap"><input class="fi" id="em-p1" type="password" placeholder="Min 6 chars"><span class="pw-eye" onclick="toggleEye('em-p1',this)">👁</span></div></div>
        <div class="fg"><label class="fl">Confirm</label><input class="fi" id="em-p2" type="password"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="updateMember('${id}')">Save</button></div>`);
}

async function updateMember(id) {
  const m = S.team.find(m=>m.id===id); if(!m) return;
  m.name = document.getElementById('em-name').value.trim() || m.name;
  m.role = document.getElementById('em-role').value.trim() || m.role;
  const ne = document.getElementById('em-email').value.trim().toLowerCase();
  if (ne && ne !== (m.email||'').toLowerCase()) {
    if (S.team.find(t=>t.id!==id&&(t.email||'').toLowerCase()===ne)||ne===S.adminEmail.toLowerCase()) {
      alert('Email already in use.'); return;
    }
    m.email = ne;
  }
  const p1 = document.getElementById('em-p1').value;
  if (p1) {
    if (p1.length < 6)                                 { alert('Min 6 chars.'); return; }
    if (p1 !== document.getElementById('em-p2').value) { alert('Passwords do not match.'); return; }
    m.pwdHash = await hashPwd(p1);
  }
  rebuildMaps(); save(); toast(`${m.name} updated ✓`); closeModal(); renderPage();
}
