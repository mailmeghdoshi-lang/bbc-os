// ================================================================
// BBC AGENCY OS — core.js
// Shared state, Firebase, helpers, constants
// DO NOT EDIT unless you're changing data structure
// ================================================================

// ── CONSTANTS ───────────────────────────────────────────────────
const OWNER_NAME     = 'Megh Doshi';
const OWNER_EMAIL    = 'megh@butterbranding.co';
const OWNER_INITIALS = 'MD';
const AGENCY_NAME    = 'Butter Branding Co';
const PHONE          = '+91 97692 77652';
const WEBSITE        = 'butterbranding.co';

const LEAD_STAGES = ['Prospect','Discussion','Proposal Sent','PI Invoice Sent','Onboarded','Lost','Rejected'];
const STAGE_COLOR = {
  Prospect:'#7c3aed', Discussion:'#1565c0', 'Proposal Sent':'#f57f17',
  'PI Invoice Sent':'#00695c', Onboarded:'#2e7d32', Lost:'#c0392b', Rejected:'#888'
};
const STAGE_BADGE = {
  Prospect:'b-purple', Discussion:'b-blue', 'Proposal Sent':'b-amber',
  'PI Invoice Sent':'b-teal', Onboarded:'b-green', Lost:'b-red', Rejected:'b-gray'
};
const AV_CLASSES  = ['av-a','av-b','av-c','av-d','av-e'];
const DOT_CLASSES = ['d-green','d-blue','d-amber','d-gray'];
const DOT_COLORS  = {'d-green':'#2e7d32','d-blue':'#1565c0','d-amber':'#f57f17','d-gray':'#888'};

const MODULES = {
  dashboard:  { label:'Dashboard'      },
  tasks:      { label:'Tasks'          },
  projects:   { label:'Projects'       },
  leads:      { label:'Lead Master'    },
  quotations: { label:'Quotations'     },
  clients:    { label:'Clients & CRM'  },
  invoices:   { label:'Invoices'       },
  calendar:   { label:'Calendar'       },
  alerts:     { label:'Alerts'         },
  activity:   { label:'Activity Log'   },
};
const DEFAULT_PERMS = {
  dashboard:true, tasks:true, projects:false, leads:false,
  quotations:false, clients:false, invoices:false,
  calendar:false, alerts:false, activity:false
};

// ── FIREBASE ────────────────────────────────────────────────────
firebase.initializeApp({
  apiKey:            'AIzaSyDcYu1WCNYi42_3ODgmu-0xscdPwXQsUdI',
  authDomain:        'bbc-os.firebaseapp.com',
  databaseURL:       'https://bbc-os-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'bbc-os',
  storageBucket:     'bbc-os.firebasestorage.app',
  messagingSenderId: '144820389936',
  appId:             '1:144820389936:web:e5b045368636837e1cc5f5'
});
const db = firebase.database();

// ── STATE ────────────────────────────────────────────────────────
const TODAY = new Date(); TODAY.setHours(0,0,0,0);

const S = {
  // Firebase-persisted
  agencyName: AGENCY_NAME, ownerName: OWNER_NAME,
  ownerInitials: OWNER_INITIALS, adminEmail: OWNER_EMAIL, adminPwdHash: '',
  clients: [], projects: [], tasks: [], team: [],
  invoices: [], activity: [], calEvents: [], leads: [], quotations: [],
  customServices: [],
  // Session only (never saved to Firebase)
  page: 'dashboard', currentUser: null,
  calYear: TODAY.getFullYear(), calMonth: TODAY.getMonth(),
  taskTab: 'list', showDone: false,
  expandedLeads: {}, expandedTasks: {},
  _loaded: false, _firstRender: false
};

// ── NAME MAP ────────────────────────────────────────────────────
const nMap = {};
function rebuildMaps() {
  Object.keys(nMap).forEach(k => delete nMap[k]);
  nMap['OWNER'] = S.ownerName.split(' ')[0];
  S.team.forEach(m => { nMap[m.id] = m.name.split(' ')[0]; });
}

// ── HELPERS ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const fmtINR   = n => '₹' + Number(n||0).toLocaleString('en-IN');
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—';
const fmtDT    = d => {
  if(!d) return '—';
  const dt = new Date(d);
  return fmtShort(dt)+' '+dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
};
const daysLeft = d => {
  const t = new Date(d); t.setHours(0,0,0,0);
  return Math.ceil((t - TODAY) / 86400000);
};
const mkInit   = n => n.trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const avClass  = i => AV_CLASSES[i % AV_CLASSES.length];
const dotClass = i => DOT_CLASSES[i % DOT_CLASSES.length];
const dotColor = cls => DOT_COLORS[cls] || '#888';
const isAdmin  = () => S.currentUser === 'OWNER';
const curMember= () => S.team.find(m => m.id === S.currentUser);
const memberPerms = m => m ? (m.perms || {...DEFAULT_PERMS}) : {...DEFAULT_PERMS};

// ── SERVICES ────────────────────────────────────────────────────
// Returns merged built-in + custom services
// Custom with same code overrides built-in (for edits)
function allServices() {
  const customCodes = new Set((S.customServices||[]).map(s => s.code));
  return [
    ...BASE_SERVICES.filter(s => !customCodes.has(s.code)),
    ...(S.customServices||[])
  ].sort((a,b) => a.cat.localeCompare(b.cat) || a.code.localeCompare(b.code));
}
function svcCats() { return [...new Set(allServices().map(s => s.cat))]; }

// ── ACTIVITY LOG ────────────────────────────────────────────────
function logAct(type, text, icon) {
  S.activity.unshift({
    id: uid(), type, text, icon,
    time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
    ts: Date.now()
  });
  if (S.activity.length > 200) S.activity.length = 200;
}

// ── PROJECT PROGRESS ────────────────────────────────────────────
function recalcProject(pid) {
  const p = S.projects.find(p => p.id === pid); if(!p) return;
  const all = S.tasks.filter(t => t.projectId === pid);
  p.progress = all.length ? Math.round(all.filter(t=>t.done).length / all.length * 100) : 0;
  if (p.progress === 100) p.status = 'completed';
  else if (p.status === 'completed') p.status = 'active';
}

// ── ALERTS ──────────────────────────────────────────────────────
function getAlerts() {
  const uid = S.currentUser;
  const a = [];
  S.tasks
    .filter(t => !t.done && (isAdmin() || t.assignee === uid))
    .forEach(t => {
      const d = daysLeft(t.dueDate);
      if (d < 0) a.push({type:'over', kind:'Task',    name:t.title, detail:`${Math.abs(d)}d overdue`, d});
      else if(d<=3) a.push({type:'soon', kind:'Task', name:t.title, detail:d===0?'Due today':`Due in ${d}d`, d});
    });
  S.projects
    .filter(p => p.status==='active' && p.progress<100 && (isAdmin()||(p.team||[]).includes(uid)))
    .forEach(p => {
      const d = daysLeft(p.dueDate);
      if (d < 0) a.push({type:'over', kind:'Project',    name:p.name, detail:`${Math.abs(d)}d overdue`, d});
      else if(d<=7) a.push({type:'soon', kind:'Project', name:p.name, detail:d===0?'Due today':`Due in ${d}d`, d});
    });
  if (isAdmin()) {
    S.invoices
      .filter(i => i.status!=='paid' && i.status!=='draft')
      .forEach(i => {
        const d = daysLeft(i.dueDate);
        if (d < 0) a.push({type:'over', kind:'Invoice',    name:i.id, detail:`${fmtINR(i.amount)} · ${Math.abs(d)}d overdue`, d});
        else if(d<=5) a.push({type:'soon', kind:'Invoice', name:i.id, detail:`${fmtINR(i.amount)} · ${d===0?'Due today':'Due in '+d+'d'}`, d});
      });
  }
  return a.sort((a,b) => a.d - b.d);
}

function getFollowups() {
  if (!isAdmin()) return [];
  const now = new Date();
  return S.leads
    .filter(l => {
      if (!l.followupAt || l.followupDone || ['Onboarded','Lost','Rejected'].includes(l.stage)) return false;
      const diff = Math.round((new Date(l.followupAt) - now) / 60000);
      return diff >= -30 && diff <= 1440;
    })
    .sort((a,b) => new Date(a.followupAt) - new Date(b.followupAt));
}

// ── FIREBASE SAVE / LOAD ─────────────────────────────────────────
function save() {
  const toISO = d => d instanceof Date ? d.toISOString() : d;
  db.ref('bbcOS').set({
    agencyName:     S.agencyName,
    ownerName:      S.ownerName,
    ownerInitials:  S.ownerInitials,
    adminEmail:     S.adminEmail,
    adminPwdHash:   S.adminPwdHash,
    clients:        S.clients,
    team:           S.team,
    activity:       S.activity,
    leads:          S.leads,
    quotations:     S.quotations,
    customServices: S.customServices || [],
    projects:  S.projects.map(p => ({...p, dueDate: toISO(p.dueDate)})),
    tasks:     S.tasks.map(t    => ({...t, dueDate: toISO(t.dueDate)})),
    invoices:  S.invoices.map(i => ({...i, dueDate: toISO(i.dueDate)})),
    calEvents: S.calEvents.map(e=> ({...e, date:    toISO(e.date)})),
  }).catch(e => console.error('Firebase save error:', e));
}

function startFirebase() {
  // Show loading splash
  document.getElementById('R').innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#F5F4F1">
      <div style="font-size:24px;font-weight:900;font-style:italic;background:linear-gradient(135deg,#7c3aed,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${AGENCY_NAME}</div>
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em">Marketing OS · CRM</div>
      <div style="display:flex;gap:5px">
        ${[0,.15,.3].map(d=>`<div style="width:7px;height:7px;border-radius:50%;background:#7c3aed;animation:pulse 1.2s ${d}s ease-in-out infinite"></div>`).join('')}
      </div>
      <div style="font-size:11px;color:#aaa">Connecting to database…</div>
    </div>`;

  db.ref('bbcOS').on('value', snap => {
    const d = snap.val();
    if (d) {
      S.agencyName     = d.agencyName     || AGENCY_NAME;
      S.ownerName      = d.ownerName      || OWNER_NAME;
      S.ownerInitials  = d.ownerInitials  || OWNER_INITIALS;
      S.adminEmail     = d.adminEmail     || OWNER_EMAIL;
      S.adminPwdHash   = d.adminPwdHash   || '';
      S.clients        = d.clients        || [];
      S.team           = d.team           || [];
      S.activity       = d.activity       || [];
      S.leads          = d.leads          || [];
      S.quotations     = d.quotations     || [];
      S.customServices = d.customServices || [];
      S.projects  = (d.projects  ||[]).map(p => ({...p, dueDate: new Date(p.dueDate)}));
      S.tasks     = (d.tasks     ||[]).map(t => ({...t, dueDate: new Date(t.dueDate)}));
      S.invoices  = (d.invoices  ||[]).map(i => ({...i, dueDate: new Date(i.dueDate)}));
      S.calEvents = (d.calEvents ||[]).map(e => ({...e, date:    new Date(e.date)}));
    }
    rebuildMaps();
    S._loaded = true;
    if (!S._firstRender) {
      S._firstRender = true;
      render();          // First load → show login or dashboard
    } else if (S.currentUser) {
      isAdmin() ? renderPage() : renderMemberPage(); // Live sync update
    }
  }, err => {
    document.getElementById('R').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:10px">
        <div style="font-size:14px;font-weight:600;color:#c0392b">⚠ Cannot connect to database</div>
        <div style="font-size:12px;color:#888">Check your internet connection.</div>
        <button onclick="location.reload()" style="margin-top:8px;padding:8px 16px;border-radius:7px;border:none;background:#1a1a1a;color:#fff;cursor:pointer;font-family:inherit">Retry</button>
      </div>`;
  });
}

// ── CRYPTO ──────────────────────────────────────────────────────
async function hashPwd(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
async function checkPwd(input, stored) {
  return !!stored && await hashPwd(input) === stored;
}

// ── TOAST ───────────────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── UI HELPERS ──────────────────────────────────────────────────
function em(txt) {
  return `<div style="font-size:12px;color:#888;text-align:center;padding:1.5rem 0">${txt}</div>`;
}
function emptyState(title, sub, action, label) {
  return `<div style="background:#fff;border:.5px solid rgba(0,0,0,.1);border-radius:12px;padding:1rem 1.25rem;text-align:center;padding:3rem 2rem">
    <div style="font-size:14px;font-weight:600;margin-bottom:6px">${title}</div>
    <div style="font-size:12px;color:#888;margin-bottom:1.25rem">${sub}</div>
    ${action ? `<button class="btn btn-primary" onclick="${action}">${label}</button>` : ''}
  </div>`;
}

// ── MODAL ───────────────────────────────────────────────────────
let _qri = 0; // quote row index — reset on closeModal

function showModal(html) {
  document.getElementById('M').innerHTML = `
    <div class="overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">${html}</div>
    </div>`;
}
function closeModal() {
  document.getElementById('M').innerHTML = '';
  _qri = 0;
}

// ── PASSWORD EYE TOGGLE ─────────────────────────────────────────
function toggleEye(id, el) {
  const inp = document.getElementById(id); if(!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  el.style.opacity = inp.type === 'text' ? '1' : '.4';
}

// ── LOGOUT ──────────────────────────────────────────────────────
function logout() { S.currentUser = null; render(); }
