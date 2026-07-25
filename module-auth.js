// ================================================================
// BBC AGENCY OS — module-auth.js
// Login, setup, logout
// ================================================================

function render() {
  if (!S.currentUser) { renderLogin(); return; }
  if (!isAdmin())     { renderMember(); return; }
  renderShell();
}

function renderLogin() {
  if (!S.adminPwdHash) { renderSetup(); return; }
  document.getElementById('R').innerHTML = `
    <div class="login-wrap"><div class="login-box">
      <div style="font-size:20px;font-weight:900;font-style:italic;background:linear-gradient(135deg,#7c3aed,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:2px">${esc(S.agencyName)}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1.75rem">Marketing OS · CRM</div>
      <div id="li-err" style="display:none;background:#fef0f0;border:.5px solid #fcc;border-radius:7px;padding:8px 12px;font-size:12px;color:#c0392b;margin-bottom:1rem"></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" id="li-email" type="email" placeholder="you@butterbranding.co" autocomplete="email"></div>
      <div class="fg"><label class="fl">Password</label><div class="pw-wrap"><input class="fi" id="li-pass" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"><span class="pw-eye" onclick="toggleEye('li-pass',this)">👁</span></div></div>
      <button class="btn btn-primary" id="li-btn" onclick="doLogin()" style="width:100%;padding:9px;font-size:13px;margin-top:4px">Sign In</button>
      <div style="margin-top:1rem;font-size:11px;color:#888;text-align:center">Forgot password? Delete <code>adminPwdHash</code> in Firebase Realtime Database to reset.</div>
    </div></div>`;
  setTimeout(() => { const e = document.getElementById('li-email'); if(e) e.focus(); }, 100);
}

function renderSetup() {
  document.getElementById('R').innerHTML = `
    <div class="login-wrap"><div class="login-box" style="width:440px">
      <div style="font-size:20px;font-weight:900;font-style:italic;background:linear-gradient(135deg,#7c3aed,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:2px">${esc(AGENCY_NAME)}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1.25rem">First Time Setup</div>
      <div style="background:#f3e8ff;border:.5px solid #d1b3ff;border-radius:8px;padding:10px 14px;font-size:12px;color:#6d28d9;margin-bottom:1.25rem">👋 Set your admin credentials to get started. You only see this once.</div>
      <div id="su-err" style="display:none;background:#fef0f0;border:.5px solid #fcc;border-radius:7px;padding:8px 12px;font-size:12px;color:#c0392b;margin-bottom:1rem"></div>
      <div class="fg"><label class="fl">Your Name</label><input class="fi" id="su-name" value="${esc(S.ownerName)}"></div>
      <div class="fg"><label class="fl">Admin Email *</label><input class="fi" id="su-email" type="email" value="${esc(S.adminEmail)}"></div>
      <div class="fg"><label class="fl">Password *</label><div class="pw-wrap"><input class="fi" id="su-p1" type="password" placeholder="Min 6 characters"><span class="pw-eye" onclick="toggleEye('su-p1',this)">👁</span></div></div>
      <div class="fg"><label class="fl">Confirm Password *</label><input class="fi" id="su-p2" type="password" onkeydown="if(event.key==='Enter')doSetup()"></div>
      <button class="btn btn-primary" onclick="doSetup()" style="width:100%;padding:9px;font-size:13px">Set Up & Sign In</button>
    </div></div>`;
}

async function doSetup() {
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim().toLowerCase();
  const p1    = document.getElementById('su-p1').value;
  const p2    = document.getElementById('su-p2').value;
  const err   = document.getElementById('su-err');
  if (!email || !p1)  { err.textContent = 'Email and password required.';    err.style.display = 'block'; return; }
  if (p1.length < 6)  { err.textContent = 'Password must be 6+ characters.'; err.style.display = 'block'; return; }
  if (p1 !== p2)      { err.textContent = 'Passwords do not match.';          err.style.display = 'block'; return; }
  if (name) { S.ownerName = name; S.ownerInitials = mkInit(name); }
  S.adminEmail    = email;
  S.adminPwdHash  = await hashPwd(p1);
  rebuildMaps(); save();
  S.currentUser = 'OWNER'; S.page = 'dashboard'; render();
}

async function doLogin() {
  const email = document.getElementById('li-email').value.trim().toLowerCase();
  const pass  = document.getElementById('li-pass').value;
  const err   = document.getElementById('li-err');
  const btn   = document.getElementById('li-btn');
  err.style.display = 'none';
  if (!email || !pass) { err.textContent = 'Enter email and password.'; err.style.display = 'block'; return; }
  btn.textContent = 'Signing in…'; btn.disabled = true;
  // Check admin
  if (email === S.adminEmail.toLowerCase() && await checkPwd(pass, S.adminPwdHash)) {
    S.currentUser = 'OWNER'; S.page = 'dashboard'; render(); return;
  }
  // Check team members
  const m = S.team.find(m => (m.email||'').toLowerCase() === email);
  if (m && m.pwdHash && await checkPwd(pass, m.pwdHash)) {
    S.currentUser = m.id; S.page = 'dashboard'; render(); return;
  }
  err.textContent = 'Incorrect email or password.'; err.style.display = 'block';
  btn.textContent = 'Sign In'; btn.disabled = false;
}

function openSettings() {
  showModal(`<div class="modal-title">Agency & Account Settings</div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-bottom:8px">Agency</div>
    <div class="fg"><label class="fl">Agency Name</label><input class="fi" id="st-agency" value="${esc(S.agencyName)}"></div>
    <div class="fg"><label class="fl">Your Full Name</label><input class="fi" id="st-name" value="${esc(S.ownerName)}"></div>
    <div style="border-top:.5px solid #eee;margin:.875rem 0;padding-top:.875rem">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.04em;margin-bottom:8px">Login Credentials</div>
      <div class="fg"><label class="fl">Admin Email</label><input class="fi" id="st-email" type="email" value="${esc(S.adminEmail)}"></div>
      <div style="font-size:11px;color:#888;margin-bottom:.75rem">Leave password blank to keep current.</div>
      <div class="g2">
        <div class="fg"><label class="fl">New Password</label><div class="pw-wrap"><input class="fi" id="st-p1" type="password" placeholder="Min 6 chars"><span class="pw-eye" onclick="toggleEye('st-p1',this)">👁</span></div></div>
        <div class="fg"><label class="fl">Confirm</label><input class="fi" id="st-p2" type="password"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveSettings()">Save</button></div>`);
}

async function saveSettings() {
  S.ownerName   = document.getElementById('st-name').value.trim()   || S.ownerName;
  S.agencyName  = document.getElementById('st-agency').value.trim() || S.agencyName;
  S.ownerInitials = mkInit(S.ownerName);
  const ne = document.getElementById('st-email').value.trim().toLowerCase();
  if (ne) {
    if (S.team.find(m => (m.email||'').toLowerCase() === ne)) { alert('Email in use by a team member.'); return; }
    S.adminEmail = ne;
  }
  const p1 = document.getElementById('st-p1').value;
  if (p1) {
    if (p1.length < 6)                               { alert('Min 6 chars.');           return; }
    if (p1 !== document.getElementById('st-p2').value) { alert('Passwords do not match.'); return; }
    S.adminPwdHash = await hashPwd(p1);
  }
  rebuildMaps(); save(); toast('Settings saved ✓'); closeModal(); render();
}
