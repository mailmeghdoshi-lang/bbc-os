// ================================================================
// BBC AGENCY OS — module-services.js
// Services catalog — admin only
// Add, edit, delete services. Changes persist to Firebase.
// Built-in services (services-data.js) can be overridden but not deleted.
// ================================================================

function pgServices(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openAddService()">+ Add Service</button>`;
  const svcs = allServices();
  const cats = svcCats();
  c.innerHTML = `
    <div style="margin-bottom:1rem;padding:10px 14px;background:#f3e8ff;border:.5px solid #d1b3ff;border-radius:8px;font-size:12px;color:#6d28d9">
      <b>Services Catalog — Admin only.</b> Add, edit or delete services here.
      Changes reflect instantly across Quotations and Lead forms.
      Built-in services can be edited — your edits are saved to Firebase.
    </div>
    ${cats.map(cat => {
      const catSvcs = svcs.filter(s=>s.cat===cat);
      return `<div class="card" style="margin-bottom:1rem;padding:0;overflow:hidden">
        <div class="cat-hd">
          <span>${esc(cat)}</span>
          <button class="btn btn-sm" onclick="openAddService('${esc(cat)}')" style="font-size:10px;margin-right:10px">+ Add to this category</button>
        </div>
        <table><thead><tr>
          <th>Code</th><th>Service Name</th><th>Description</th>
          <th>Unit</th><th style="text-align:right">Rate</th><th>HSN</th><th>GST</th><th>Type</th><th></th>
        </tr></thead>
        <tbody>
          ${catSvcs.map(s => {
            const isCustom = !!(S.customServices||[]).find(cs=>cs.code===s.code);
            return `<tr>
              <td><code style="font-size:10px;background:#f4f3f0;padding:2px 5px;border-radius:4px">${esc(s.code)}</code></td>
              <td style="font-weight:500;max-width:180px">${esc(s.name)}</td>
              <td style="color:#888;font-size:11px;max-width:220px">${esc(s.desc)}</td>
              <td><span class="badge b-gray">${esc(s.unit)}</span></td>
              <td style="text-align:right;font-weight:600">${fmtINR(s.price)}</td>
              <td style="color:#888;font-size:11px">${esc(s.hsn)}</td>
              <td><span class="badge b-blue">${s.gst}%</span></td>
              <td><span class="badge ${isCustom?'b-purple':'b-gray'}">${isCustom?'custom':'built-in'}</span></td>
              <td style="white-space:nowrap;text-align:right">
                <button class="btn btn-sm" onclick="openEditService('${esc(s.code)}')" style="margin-right:4px">✎ Edit</button>
                ${isCustom ? `<button class="btn btn-danger btn-sm" onclick="deleteService('${esc(s.code)}')">✕</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody></table>
      </div>`;
    }).join('')}`;
}

function openAddService(prefillCat) {
  const cats = svcCats();
  showModal(`<div class="modal-title">Add New Service</div>
    <div class="g2">
      <div class="fg"><label class="fl">Service Name *</label><input class="fi" id="sv-name" placeholder="e.g. Brand Audit"></div>
      <div class="fg"><label class="fl">Item Code * (must be unique)</label><input class="fi" id="sv-code" placeholder="e.g. BRD05" oninput="this.value=this.value.toUpperCase()"></div>
      <div class="fg" style="grid-column:1/-1"><label class="fl">Description</label><textarea class="fi" id="sv-desc" style="min-height:56px" placeholder="What is included in this service..."></textarea></div>
      <div class="fg"><label class="fl">Category</label>
        <input class="fi" id="sv-cat" value="${esc(prefillCat||'')}" placeholder="e.g. Brand Strategy & Identity" list="sv-cat-opts">
        <datalist id="sv-cat-opts">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
      </div>
      <div class="fg"><label class="fl">Unit</label>
        <select class="fi" id="sv-unit">
          ${['OTHERS','MONTH','NUMBERS','SETS','SESSION'].map(u=>`<option>${u}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="fl">Rate ₹ (excl. GST) *</label><input class="fi" id="sv-price" type="number" placeholder="0"></div>
      <div class="fg"><label class="fl">GST %</label>
        <select class="fi" id="sv-gst">
          <option value="18" selected>18%</option>
          <option value="12">12%</option>
          <option value="0">0% (Exempt)</option>
        </select>
      </div>
      <div class="fg"><label class="fl">HSN Code</label><input class="fi" id="sv-hsn" value="998361" placeholder="998361"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveNewService()">Add Service</button>
    </div>`);
}

function saveNewService() {
  const name  = document.getElementById('sv-name').value.trim();
  const code  = document.getElementById('sv-code').value.trim().toUpperCase();
  const cat   = document.getElementById('sv-cat').value.trim();
  const price = Number(document.getElementById('sv-price').value)||0;
  if (!name)  { alert('Service name is required.');  return; }
  if (!code)  { alert('Item code is required.');      return; }
  if (!cat)   { alert('Category is required.');       return; }
  if (!price) { alert('Rate is required.');            return; }
  if (allServices().find(s=>s.code===code)) { alert(`Code "${code}" is already in use. Choose a different code.`); return; }
  if (!S.customServices) S.customServices = [];
  S.customServices.push({
    name, code, cat,
    desc:  document.getElementById('sv-desc').value.trim(),
    unit:  document.getElementById('sv-unit').value,
    price, gst: Number(document.getElementById('sv-gst').value)||18,
    hsn:   document.getElementById('sv-hsn').value.trim()||'998361'
  });
  save();
  logAct('client', `Service <b>${esc(name)}</b> added to catalog`, '★');
  toast(`"${name}" added ✓`); closeModal(); renderPage();
}

function openEditService(code) {
  const s = allServices().find(s=>s.code===code); if(!s) return;
  const cats = svcCats();
  showModal(`<div class="modal-title">Edit Service — <code>${esc(s.code)}</code></div>
    <div style="background:#fff8e1;border:.5px solid #ffe082;border-radius:7px;padding:8px 12px;font-size:11px;color:#f57f17;margin-bottom:1rem">
      Editing a built-in service saves your version to Firebase and overrides the default for everyone.
    </div>
    <div class="g2">
      <div class="fg"><label class="fl">Service Name *</label><input class="fi" id="sv-name" value="${esc(s.name)}"></div>
      <div class="fg"><label class="fl">Item Code (read-only)</label><input class="fi" value="${esc(s.code)}" readonly style="background:#f4f3f0;color:#888"></div>
      <div class="fg" style="grid-column:1/-1"><label class="fl">Description</label><textarea class="fi" id="sv-desc" style="min-height:56px">${esc(s.desc)}</textarea></div>
      <div class="fg"><label class="fl">Category</label>
        <input class="fi" id="sv-cat" value="${esc(s.cat)}" list="sv-cat-opts2">
        <datalist id="sv-cat-opts2">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
      </div>
      <div class="fg"><label class="fl">Unit</label>
        <select class="fi" id="sv-unit">${['OTHERS','MONTH','NUMBERS','SETS','SESSION'].map(u=>`<option ${s.unit===u?'selected':''}>${u}</option>`).join('')}</select>
      </div>
      <div class="fg"><label class="fl">Rate ₹ (excl. GST) *</label><input class="fi" id="sv-price" type="number" value="${s.price}"></div>
      <div class="fg"><label class="fl">GST %</label>
        <select class="fi" id="sv-gst">${[18,12,0].map(g=>`<option value="${g}" ${s.gst===g?'selected':''}>${g}%</option>`).join('')}</select>
      </div>
      <div class="fg"><label class="fl">HSN Code</label><input class="fi" id="sv-hsn" value="${esc(s.hsn)}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveEditService('${esc(code)}')">Save Changes</button>
    </div>`);
}

function saveEditService(code) {
  const name  = document.getElementById('sv-name').value.trim();
  const cat   = document.getElementById('sv-cat').value.trim();
  const price = Number(document.getElementById('sv-price').value)||0;
  if (!name || !cat || !price) { alert('Name, category and rate are required.'); return; }
  if (!S.customServices) S.customServices = [];
  // Remove existing custom entry for this code (if any), then push updated
  S.customServices = S.customServices.filter(s=>s.code!==code);
  S.customServices.push({
    name, code, cat,
    desc:  document.getElementById('sv-desc').value.trim(),
    unit:  document.getElementById('sv-unit').value,
    price, gst: Number(document.getElementById('sv-gst').value)||18,
    hsn:   document.getElementById('sv-hsn').value.trim()||'998361'
  });
  save();
  logAct('client', `Service <b>${esc(name)}</b> updated`, '✎');
  toast(`"${name}" updated ✓`); closeModal(); renderPage();
}

function deleteService(code) {
  const s = allServices().find(s=>s.code===code); if(!s) return;
  if (!confirm(`Delete "${s.name}"?\n\nThis cannot be undone.`)) return;
  S.customServices = (S.customServices||[]).filter(cs=>cs.code!==code);
  save(); toast(`"${s.name}" deleted`); renderPage();
}
