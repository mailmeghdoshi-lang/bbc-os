// ================================================================
// BBC AGENCY OS — module-quotations.js
// Create, view, print quotations linked to leads
// ================================================================

function pgQuotations(c, a) {
  a.innerHTML = `<button class="btn btn-primary" onclick="openCreateQuote(null)">+ New Quotation</button>`;
  if (!S.quotations.length) {
    c.innerHTML = emptyState('No quotations yet','Create quotes from leads or directly here','openCreateQuote(null)','+ New Quotation');
    return;
  }
  c.innerHTML = `<div class="card"><table>
    <thead><tr>
      <th>Quote No</th><th>Lead / Client</th><th>Items</th>
      <th style="text-align:right">Total</th><th>Status</th><th>Created</th><th></th>
    </tr></thead>
    <tbody>
      ${S.quotations.map(q=>`<tr>
        <td style="font-weight:700">${esc(q.quoteNo)}</td>
        <td>${esc(q.clientName||q.leadTitle||'—')}</td>
        <td style="color:#888">${(q.items||[]).length} item${(q.items||[]).length!==1?'s':''}</td>
        <td style="font-weight:700;text-align:right">${fmtINR(q.total)}</td>
        <td><span class="badge ${q.status==='accepted'?'b-green':q.status==='sent'?'b-blue':q.status==='rejected'?'b-red':'b-gray'}">${q.status}</span></td>
        <td style="color:#888">${fmtDate(q.createdAt)}</td>
        <td>
          <div style="display:flex;gap:5px;justify-content:flex-end;align-items:center">
            <button class="btn btn-sm" onclick="openViewQuote('${q.id}')">Preview</button>
            <button class="btn btn-sm btn-purple" onclick="printQuote('${q.id}')">PDF</button>
            <select class="fi" onchange="updateQStatus('${q.id}',this.value)" style="width:auto;padding:3px 8px;font-size:11px">
              ${['draft','sent','accepted','rejected'].map(s=>`<option ${q.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

function openCreateQuote(leadId) {
  _qri = 0;
  const lead   = leadId ? S.leads.find(l=>l.id===leadId) : null;
  const svcs   = allServices();
  const lo     = S.leads.map(l=>`<option value="${l.id}" ${lead&&lead.id===l.id?'selected':''}>${esc(l.title)}</option>`).join('');
  const initSvcs = lead && lead.services && lead.services.length ? lead.services : [];
  const initRows = initSvcs.length
    ? initSvcs.map(sn => { const sv=svcs.find(s=>s.name===sn); return qRow(_qri++, sn, sv?sv.price:0, 0, 1); }).join('')
    : qRow(_qri++, '', 0, 0, 1);

  showModal(`<div class="modal-title">${lead ? `Create Quote — ${esc(lead.title)}` : 'New Quotation'}</div>
    <div class="fg"><label class="fl">Linked Lead</label>
      <select class="fi" id="q-lead" onchange="qPrefillLead()">
        <option value="">— No linked lead —</option>${lo}
      </select>
    </div>
    <div class="g2">
      <div class="fg"><label class="fl">Client / Company *</label><input class="fi" id="q-client" value="${lead?esc(lead.company||lead.title):''}"></div>
      <div class="fg"><label class="fl">Contact Person</label><input class="fi" id="q-contact" value="${lead?esc(lead.contact||''):''}"></div>
      <div class="fg"><label class="fl">Email</label><input class="fi" id="q-email" type="email" value="${lead?esc(lead.email||''):''}"></div>
      <div class="fg"><label class="fl">Phone</label><input class="fi" id="q-phone" value="${lead?esc(lead.phone||''):''}"></div>
      <div class="fg"><label class="fl">Valid Until</label><input class="fi" id="q-valid" type="date"></div>
      <div class="fg"><label class="fl">Payment Terms</label><input class="fi" id="q-terms" value="50% advance, 50% on delivery"></div>
    </div>
    <div class="fg"><label class="fl">Scope / Introduction</label><textarea class="fi" id="q-scope" style="min-height:60px">${lead&&lead.notes?esc(lead.notes):''}</textarea></div>
    <div style="margin-bottom:8px">
      <div class="qrow-hd"><span>Service</span><span>Rate (₹)</span><span>Qty</span><span>Disc %</span><span>Net (₹)</span><span></span></div>
      <div id="q-rows">${initRows}</div>
    </div>
    <button class="btn btn-sm" onclick="addQRow()" style="margin-bottom:1rem">+ Add Line Item</button>
    <div class="g2">
      <div class="fg"><label class="fl">GST %</label><input class="fi" id="q-gst" type="number" value="18" oninput="calcQTotal()"></div>
      <div></div>
    </div>
    <div style="background:#f4f3f0;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:.875rem" id="q-total">Subtotal: ₹0</div>
    <div class="fg"><label class="fl">Notes / Terms & Conditions</label><textarea class="fi" id="q-notes" placeholder="Revisions policy, content to be provided by client, timelines..."></textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveQuote()">Save Quotation</button>
    </div>`);
  setTimeout(calcQTotal, 50);
}

function qRow(i, svcName, rate, disc, qty) {
  const svcs = allServices();
  const opts = svcs.map(s=>`<option value="${esc(s.name)}" data-price="${s.price}" ${s.name===svcName?'selected':''}>${esc(s.name)} (${fmtINR(s.price)})</option>`).join('');
  return `<div class="qrow" id="qrow-${i}">
    <select class="fi" id="qs-${i}" onchange="onQSvcChange(${i})" style="font-size:11px">
      <option value="">— Select service —</option>${opts}
    </select>
    <input class="fi" id="qr-${i}" type="number" placeholder="Rate ₹" value="${rate||''}" oninput="calcQTotal()" style="font-size:12px">
    <input class="fi" id="qq-${i}" type="number" placeholder="Qty" value="${qty||1}" min="1" oninput="calcQTotal()" style="font-size:12px">
    <input class="fi" id="qd-${i}" type="number" placeholder="0%" value="${disc||0}" min="0" max="100" oninput="calcQTotal()" style="font-size:12px;${disc>0?'background:#fffde7':''}">
    <input class="fi" id="qn-${i}" type="number" readonly style="font-size:12px;background:#f4f3f0">
    <button class="btn btn-danger btn-sm" onclick="document.getElementById('qrow-${i}').remove();calcQTotal()" style="padding:4px 7px">✕</button>
  </div>`;
}

function addQRow() {
  const c = document.getElementById('q-rows'); if(!c) return;
  const d = document.createElement('div');
  d.innerHTML = qRow(_qri, '', 0, 0, 1);
  c.appendChild(d.firstElementChild);
  _qri++; calcQTotal();
}

function onQSvcChange(i) {
  const sel = document.getElementById(`qs-${i}`); if(!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const price = opt ? opt.getAttribute('data-price') : 0;
  const r = document.getElementById(`qr-${i}`); if(r) r.value = price || '';
  calcQTotal();
}

function calcQTotal() {
  let sub = 0, discTotal = 0;
  for (let i = 0; i <= _qri + 5; i++) {
    const r = document.getElementById(`qr-${i}`);
    const q = document.getElementById(`qq-${i}`);
    const d = document.getElementById(`qd-${i}`);
    const n = document.getElementById(`qn-${i}`);
    if (!r) continue;
    const rate = Number(r.value)||0;
    const qty  = Number(q?.value)||1;
    const dp   = Number(d?.value)||0;
    const gross= rate * qty;
    const da   = Math.round(gross * dp / 100);
    const net  = gross - da;
    if (n) n.value = Math.round(net) || '';
    if (d) d.style.background = dp > 0 ? '#fffde7' : '';
    sub      += gross;
    discTotal+= da;
  }
  const net    = sub - discTotal;
  const gstPct = Number(document.getElementById('q-gst')?.value)||0;
  const gstAmt = Math.round(net * gstPct / 100);
  const total  = Math.round(net + gstAmt);
  const tb = document.getElementById('q-total');
  if (tb) tb.innerHTML = `
    <span style="margin-right:12px">Subtotal: <b>${fmtINR(Math.round(sub))}</b></span>
    ${discTotal>0?`<span style="margin-right:12px;color:#2e7d32">Discount: <b>−${fmtINR(Math.round(discTotal))}</b></span>`:''}
    <span style="margin-right:12px">GST (${gstPct}%): <b>${fmtINR(gstAmt)}</b></span>
    <b style="font-size:15px">Grand Total: ${fmtINR(total)}</b>`;
}

function qPrefillLead() {
  const sel = document.getElementById('q-lead'); if(!sel) return;
  const l = S.leads.find(l=>l.id===sel.value); if(!l) return;
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.value=val; };
  set('q-client', l.company||l.title);
  set('q-contact', l.contact||'');
  set('q-email', l.email||'');
  set('q-phone', l.phone||'');
}

function getQItems() {
  const items = [];
  for (let i = 0; i <= _qri + 5; i++) {
    const sv = document.getElementById(`qs-${i}`);
    const ra = document.getElementById(`qr-${i}`);
    const qq = document.getElementById(`qq-${i}`);
    const dc = document.getElementById(`qd-${i}`);
    if (!ra) continue;
    const svc = sv?.value, rate = Number(ra.value)||0;
    if (!svc && !rate) continue;
    const qty   = Number(qq?.value)||1;
    const dp    = Number(dc?.value)||0;
    const gross = rate * qty;
    const da    = Math.round(gross * dp / 100);
    const net   = Math.round(gross - da);
    items.push({ service:svc||'Custom', rate, qty, discPct:dp, discAmt:da, gross:Math.round(gross), net });
  }
  return items;
}

function saveQuote() {
  const client = document.getElementById('q-client')?.value.trim();
  if (!client) { alert('Client name required.'); return; }
  const items = getQItems();
  if (!items.length) { alert('Add at least one service line item.'); return; }

  const leadId = document.getElementById('q-lead')?.value || '';
  const lead   = S.leads.find(l=>l.id===leadId);
  const sub    = items.reduce((s,i)=>s+i.gross, 0);
  const totDisc= items.reduce((s,i)=>s+i.discAmt, 0);
  const net    = sub - totDisc;
  const gstPct = Number(document.getElementById('q-gst')?.value)||0;
  const gstAmt = Math.round(net * gstPct / 100);
  const total  = Math.round(net + gstAmt);
  const qNo    = 'QT-' + String(S.quotations.length + 1).padStart(3,'0');

  const q = {
    id:uid(), quoteNo:qNo, leadId, leadTitle:lead?lead.title:'',
    clientName:client,
    contactName: document.getElementById('q-contact')?.value.trim()||'',
    email:       document.getElementById('q-email')?.value.trim()||'',
    phone:       document.getElementById('q-phone')?.value.trim()||'',
    validUntil:  document.getElementById('q-valid')?.value||'',
    terms:       document.getElementById('q-terms')?.value.trim()||'',
    scope:       document.getElementById('q-scope')?.value.trim()||'',
    addNotes:    document.getElementById('q-notes')?.value.trim()||'',
    items, subtotal:sub, totalDiscount:totDisc, netTotal:net,
    gstPct, gstAmt, total,
    status:'draft', createdAt:new Date().toISOString()
  };

  S.quotations.push(q);
  if (lead) {
    if (!lead.quotations) lead.quotations = [];
    lead.quotations.push(q.id);
    if (total > 0 && !lead.value) lead.value = total;
  }

  save();
  logAct('lead', `Quotation <b>${qNo}</b> created for <b>${esc(client)}</b>`, '📄');
  toast(`${qNo} saved ✓`);
  closeModal();
  S.page = 'quotations';
  renderPage();
}

function updateQStatus(id, status) {
  const q = S.quotations.find(q=>q.id===id); if(!q) return;
  q.status = status; save(); renderPage();
}

// ── QUOTE HTML (used for preview and PDF print) ──────────────────
function quoteHTML(q) {
  const rows = (q.items||[]).map(it=>`<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px">${esc(it.service)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:12px">${fmtINR(it.rate)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:12px">${it.qty}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:12px;color:${it.discPct>0?'#2e7d32':'#888'}">${it.discPct>0?it.discPct+'%':'—'}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:12px;font-weight:600">${fmtINR(it.net)}</td>
  </tr>`).join('');

  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:2px solid #1a1a1a">
    <div>
      <div style="font-size:22px;font-weight:900;font-style:italic;color:#7c3aed">${esc(AGENCY_NAME)}</div>
      <div style="font-size:11px;color:#888;margin-top:4px">${OWNER_EMAIL} · ${PHONE} · ${WEBSITE}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em">Quotation</div>
      <div style="font-size:16px;font-weight:700;color:#7c3aed">${esc(q.quoteNo)}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">Date: ${fmtDate(q.createdAt)}</div>
      ${q.validUntil ? `<div style="font-size:11px;color:#888">Valid Till: ${fmtDate(q.validUntil)}</div>` : ''}
    </div>
  </div>
  <div style="background:#f8f8f8;border-radius:8px;padding:14px;margin-bottom:1.5rem">
    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Prepared For</div>
    <div style="font-size:15px;font-weight:700">${esc(q.clientName)}</div>
    ${q.contactName ? `<div style="font-size:12px;color:#555;margin-top:2px">${esc(q.contactName)}</div>` : ''}
    ${q.email ? `<div style="font-size:12px;color:#555">${esc(q.email)}</div>` : ''}
    ${q.phone ? `<div style="font-size:12px;color:#555">${esc(q.phone)}</div>` : ''}
  </div>
  ${q.scope ? `<div style="margin-bottom:1.5rem">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin-bottom:8px">Scope of Work</div>
    <div style="font-size:13px;color:#444;line-height:1.7">${esc(q.scope)}</div>
  </div>` : ''}
  <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
    <thead>
      <tr style="background:#1a1a1a;color:#fff">
        <th style="padding:10px 12px;text-align:left;font-size:11px">Service / Deliverable</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px">Rate (₹)</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px">Qty</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px">Discount</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px">Net (₹)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-bottom:1.5rem">
    <div style="min-width:260px">
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#888"><span>Subtotal</span><span>${fmtINR(q.subtotal)}</span></div>
      ${q.totalDiscount>0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#2e7d32"><span>Total Discount</span><span>−${fmtINR(q.totalDiscount)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#888"><span>GST (${q.gstPct}%)</span><span>${fmtINR(q.gstAmt)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:18px;font-weight:700;border-top:2px solid #1a1a1a;margin-top:4px"><span>Total</span><span>${fmtINR(q.total)}</span></div>
    </div>
  </div>
  ${q.terms ? `<div style="border-top:1px solid #eee;padding-top:1rem;margin-bottom:1rem">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin-bottom:6px">Payment Terms</div>
    <div style="font-size:13px;color:#444">${esc(q.terms)}</div>
  </div>` : ''}
  ${q.addNotes ? `<div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:.05em;margin-bottom:6px">Notes</div>
    <div style="font-size:13px;color:#444">${esc(q.addNotes)}</div>
  </div>` : ''}
  <div style="margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center">
    This quotation is valid for 15 days from the date of issue. ${esc(AGENCY_NAME)} · ${OWNER_EMAIL} · ${PHONE}
  </div>`;
}

function openViewQuote(id) {
  const q = S.quotations.find(q=>q.id===id); if(!q) return;
  showModal(`<div class="modal-title">${esc(q.quoteNo)} — Preview</div>
    <div style="font-family:-apple-system,sans-serif">${quoteHTML(q)}</div>
    <div class="modal-footer no-print">
      <button class="btn" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="printQuote('${q.id}')">Download / Print PDF</button>
    </div>`);
}

function printQuote(id) {
  const q = S.quotations.find(q=>q.id===id); if(!q) return;
  const w = window.open('', '_blank');
  const body = quoteHTML(q);
  // Build print page — avoid script tags inside template literal
  const printPage = [
    '<!DOCTYPE html><html><head>',
    '<meta charset="UTF-8">',
    '<title>' + esc(q.quoteNo) + ' — ' + esc(q.clientName) + '</title>',
    '<style>',
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:2.5rem;color:#1a1a1a;max-width:820px;margin:0 auto}',
    '@media print{@page{margin:1.5cm}}',
    '</style>',
    '</head><body>',
    body,
    '</body></html>'
  ].join('');
  w.document.write(printPage);
  w.document.close();
  setTimeout(() => w.print(), 400);
}
