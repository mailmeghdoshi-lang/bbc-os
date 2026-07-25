// ================================================================
// BBC AGENCY OS — module-shell.js
// Admin sidebar, topbar, page routing
// ================================================================

const SVG = {
  grid:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>',
  bell:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5z"/><path d="M6.5 13a1.5 1.5 0 003 0"/></svg>',
  calendar: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>',
  activity: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h2l2-5 3 10 2-5h3"/></svg>',
  folder:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h8M2 12h5"/></svg>',
  check:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h8M5 8h8M5 12h8"/><circle cx="2.5" cy="4" r="1"/><circle cx="2.5" cy="8" r="1"/><circle cx="2.5" cy="12" r="1"/></svg>',
  team:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5"/><circle cx="12" cy="5" r="2"/><path d="M15 13c0-2.21-1.34-4-3-4"/></svg>',
  user:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2a3 3 0 110 6 3 3 0 010-6z"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>',
  file:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5l-3-3z"/><path d="M9 2v4h4M5 8h6M5 11h3"/></svg>',
  star:     '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h12M8 2v12M4 4l8 8M12 4l-8 8"/></svg>',
  building: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 7h6M5 10h4"/></svg>',
  invoice:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 2H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5l-3-3z"/><path d="M9 2v4h4M5 8h6M5 11h4"/></svg>',
};

const PAGE_TITLES = {
  dashboard:'Dashboard', alerts:'Deadline Alerts', calendar:'Calendar',
  activity:'Activity Log', projects:'Projects', tasks:'Tasks & Board',
  team:'Team', leads:'Lead Master', quotations:'Quotations',
  services:'Services Catalog', clients:'Clients & CRM', invoices:'Invoices'
};

function renderShell() {
  const fu = getFollowups();
  const al = getAlerts();
  const ovCount = al.filter(a=>a.type==='over').length;

  document.getElementById('R').innerHTML = `
  <div class="app">
    <nav class="sb">
      <div class="sb-logo">
        <div class="sb-logo-name">${esc(S.agencyName)}</div>
        <div class="sb-logo-sub">Marketing OS · CRM</div>
      </div>
      <div class="sb-section">
        <div class="sb-lbl">Workspace</div>
        ${ni('dashboard', SVG.grid,     'Dashboard')}
        ${ni('alerts',    SVG.bell,     'Alerts',    ovCount+fu.length > 0 ? `<span class="sb-badge">${ovCount+fu.length}</span>` : '')}
        ${ni('calendar',  SVG.calendar, 'Calendar')}
        ${ni('activity',  SVG.activity, 'Activity Log')}
      </div>
      <div class="sb-section">
        <div class="sb-lbl">Work</div>
        ${ni('projects', SVG.folder, 'Projects')}
        ${ni('tasks',    SVG.check,  'Tasks')}
        ${ni('team',     SVG.team,   'Team')}
      </div>
      <div class="sb-section">
        <div class="sb-lbl">Sales</div>
        ${ni('leads',      SVG.user,     'Lead Master',     fu.length > 0 ? `<span class="sb-badge-p">${fu.length}</span>` : '')}
        ${ni('quotations', SVG.file,     'Quotations')}
        ${ni('services',   SVG.star,     'Services Catalog')}
        ${ni('clients',    SVG.building, 'Clients & CRM')}
        ${ni('invoices',   SVG.invoice,  'Invoices')}
      </div>
      <div class="sb-foot">
        <div class="sb-user" onclick="openSettings()">
          <div class="av av-a" style="width:28px;height:28px">${esc(S.ownerInitials)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(S.ownerName)}</div>
            <div style="font-size:10px;color:#888">Admin · Owner</div>
          </div>
        </div>
        <button class="btn" onclick="logout()" style="width:100%;font-size:11px;margin-top:4px">Switch User</button>
      </div>
    </nav>
    <div class="main">
      <div class="topbar">
        <div class="topbar-title" id="pg-title">Dashboard</div>
        <div class="topbar-actions" id="pg-actions"></div>
      </div>
      <div class="page" id="pg-content"></div>
    </div>
  </div>`;

  document.getElementById('M').innerHTML = '';
  renderPage();
}

function ni(pg, svg, label, extra = '') {
  return `<div class="sb-item ${S.page===pg?'on':''}" onclick="nav('${pg}')">${svg}<span style="flex:1">${label}</span>${extra}</div>`;
}

function nav(pg) {
  S.page = pg;
  document.querySelectorAll('.sb-item').forEach(el => {
    el.classList.toggle('on', el.getAttribute('onclick') === `nav('${pg}')`);
  });
  const t = document.getElementById('pg-title');
  if (t) t.textContent = PAGE_TITLES[pg] || pg;
  renderPage();
}

function renderPage() {
  const c = document.getElementById('pg-content');
  const a = document.getElementById('pg-actions');
  if (!c || !a) return;
  a.innerHTML = '';
  const t = document.getElementById('pg-title');
  if (t) t.textContent = PAGE_TITLES[S.page] || S.page;
  const pages = {
    dashboard:  pgDashboard,
    alerts:     pgAlerts,
    calendar:   pgCalendar,
    activity:   pgActivity,
    projects:   pgProjects,
    tasks:      pgTasks,
    team:       pgTeam,
    leads:      pgLeads,
    quotations: pgQuotations,
    services:   pgServices,
    clients:    pgClients,
    invoices:   pgInvoices,
  };
  const fn = pages[S.page] || pgDashboard;
  fn(c, a);
}
