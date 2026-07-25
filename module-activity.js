// ================================================================
// BBC AGENCY OS — module-activity.js
// ================================================================
function pgActivity(c, a) {
  a.innerHTML = `<button class="btn btn-danger btn-sm" onclick="if(confirm('Clear all activity?')){S.activity=[];save();renderPage();}">Clear Log</button>`;
  c.innerHTML = `<div class="card" style="max-width:640px">
    ${S.activity.length ? S.activity.map(act => `
      <div style="display:flex;gap:12px;padding:10px 0;border-bottom:.5px solid rgba(0,0,0,.06)">
        <div style="width:28px;height:28px;border-radius:50%;background:#f3e8ff;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">${act.icon||'•'}</div>
        <div>
          <div style="font-size:12px">${act.text}</div>
          <div style="font-size:10px;color:#888;margin-top:2px">${act.time}</div>
        </div>
      </div>`).join('') : em('No activity yet')}
  </div>`;
}
