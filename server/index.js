import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkLicense } from './license.js';
checkLicense();   // exits immediately if license is missing / invalid / wrong machine
import { db, getSetting, setSetting } from './db.js';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { initWhatsApp, getStatus as waStatus, sendWA, restartWhatsApp } from './whatsapp.js';
import { generateInvoicePDF, fillTemplate } from './pdf.js';
import {
  buildAuthUrl, completeOAuth, listAccounts, setActiveAccount,
  unlinkAccount, revealPassword, runBackup, getRecentLog, startScheduler,
} from './backup.js';
import pkgWWJS from 'whatsapp-web.js';
const { MessageMedia } = pkgWWJS;

// Look up a template, preferring the customer's language. Keys are stored as
// `wa_msg_X` (Arabic) and `wa_msg_X_en` (English). Fall back to Arabic if the
// English version is missing.
function pickTemplate(baseKey, language) {
  if (language === 'en') {
    const en = getSetting(`${baseKey}_en`, '');
    if (en) return en;
  }
  return getSetting(baseKey, '');
}

function notifyWA(phone, templateKey, vars, language) {
  if (!phone) return;
  const tpl = pickTemplate(templateKey, language);
  if (!tpl) return;
  const msg = fillTemplate(tpl, vars);
  sendWA(phone, msg).catch(e => console.error('[WA notify]', e.message));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const sessions = new Map();
const tokenGen = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24);

// ───── HELPERS ─────
// Whitelist of tables that have a `code` column. nextCode is called with
// hardcoded values today, but the whitelist hardens against future misuse.
const CODE_TABLES = new Set([
  'customers', 'vehicles', 'work_orders', 'invoices', 'parts',
  'suppliers', 'expenses', 'waitlist', 'part_returns',
]);
function nextCode(table, prefix) {
  if (!CODE_TABLES.has(table)) throw new Error(`nextCode: invalid table ${table}`);
  const r = db.prepare(`SELECT code FROM ${table} ORDER BY id DESC LIMIT 1`).get();
  if (!r) return `${prefix}-0001`;
  const n = parseInt(r.code.split('-')[1] || '0', 10) + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'no token' });
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ error: 'invalid session' });
  if (Date.now() - session.lastSeen > 8 * 60 * 60 * 1000) {
    sessions.delete(token);
    return res.status(401).json({ error: 'expired' });
  }
  session.lastSeen = Date.now();
  req.worker = session.worker;
  next();
}

function logAudit(workerId, action, entity, entityId, details = '') {
  db.prepare(`INSERT INTO audit_log (worker_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)`)
    .run(workerId, action, entity, entityId, details);
}

// ───── AUTH ─────
// Public endpoint used by the login screen to render the avatar grid.
// SECURITY: never include `pin` or `pin_hash` here — anyone on the LAN
// can hit this endpoint without auth.
app.get('/api/workers', (req, res) => {
  const workers = db.prepare(`SELECT id, name, name_ar, role, role_ar, color, avatar, theme, lang FROM workers WHERE active = 1`).all();
  res.json(workers);
});

app.post('/api/login', (req, res) => {
  const { worker_id, pin } = req.body;
  const worker = db.prepare(`SELECT * FROM workers WHERE id = ? AND active = 1`).get(worker_id);
  if (!worker) return res.status(404).json({ error: 'worker not found' });
  if (!bcrypt.compareSync(String(pin), worker.pin_hash)) {
    return res.status(401).json({ error: 'invalid pin' });
  }
  const token = tokenGen();
  sessions.set(token, { worker, lastSeen: Date.now() });
  const safe = { id: worker.id, name: worker.name, name_ar: worker.name_ar, role: worker.role, role_ar: worker.role_ar, color: worker.color, avatar: worker.avatar, theme: worker.theme, lang: worker.lang };
  logAudit(worker.id, 'login', 'worker', worker.id, '');
  res.json({ token, worker: safe });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  const token = req.headers['x-auth-token'];
  sessions.delete(token);
  logAudit(req.worker.id, 'logout', 'worker', req.worker.id, '');
  res.json({ ok: true });
});

app.post('/api/me/prefs', authMiddleware, (req, res) => {
  const { theme, lang } = req.body;
  if (theme) db.prepare(`UPDATE workers SET theme = ? WHERE id = ?`).run(theme, req.worker.id);
  if (lang) db.prepare(`UPDATE workers SET lang = ? WHERE id = ?`).run(lang, req.worker.id);
  res.json({ ok: true });
});

app.post('/api/me/pin', authMiddleware, (req, res) => {
  const { current, next } = req.body;
  const w = db.prepare(`SELECT pin_hash FROM workers WHERE id = ?`).get(req.worker.id);
  if (!bcrypt.compareSync(String(current), w.pin_hash)) return res.status(401).json({ error: 'wrong pin' });
  if (!/^\d{4}$/.test(String(next))) return res.status(400).json({ error: '4 digits required' });
  // Only store the bcrypt hash. The plaintext `pin` column is set to NULL.
  db.prepare(`UPDATE workers SET pin_hash = ?, pin = NULL WHERE id = ?`).run(bcrypt.hashSync(String(next), 8), req.worker.id);
  logAudit(req.worker.id, 'change_pin', 'worker', req.worker.id, '');
  res.json({ ok: true });
});

// ───── SETTINGS ─────
app.get('/api/settings', (req, res) => {
  const all = db.prepare(`SELECT key, value FROM settings`).all();
  const map = {};
  all.forEach(r => { map[r.key] = r.value; });
  res.json(map);
});

app.post('/api/settings', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'forbidden' });
  const updates = req.body;
  Object.entries(updates).forEach(([k, v]) => setSetting(k, v));
  logAudit(req.worker.id, 'update', 'settings', 0, JSON.stringify(updates));
  res.json({ ok: true });
});

// ───── WORKERS / STAFF MANAGEMENT ─────
app.post('/api/workers', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'owner only' });
  const { name, name_ar, role, role_ar, color, avatar, pin } = req.body;
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'pin must be 4 digits' });
  // Store only bcrypt hash. The plaintext `pin` column is intentionally left unset.
  const r = db.prepare(`INSERT INTO workers (name, name_ar, role, role_ar, color, avatar, pin_hash) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(name, name_ar, role, role_ar, color, avatar, bcrypt.hashSync(String(pin), 8));
  logAudit(req.worker.id, 'create', 'worker', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/workers/:id', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'owner only' });
  db.prepare(`UPDATE workers SET active = 0 WHERE id = ?`).run(req.params.id);
  logAudit(req.worker.id, 'deactivate', 'worker', req.params.id);
  res.json({ ok: true });
});

// ───── CUSTOMERS ─────
app.get('/api/customers', authMiddleware, (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM vehicles WHERE customer_id = c.id AND deleted = 0) as vehicle_count,
      (SELECT COUNT(*) FROM work_orders WHERE customer_id = c.id AND deleted = 0) as wo_count
    FROM customers c
    WHERE c.deleted = 0
      AND (LOWER(c.name) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.code) LIKE ?)
    ORDER BY c.id DESC
  `).all(q, q, q);
  res.json(rows);
});

app.get('/api/customers/:id', authMiddleware, (req, res) => {
  const c = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'not found' });
  c.vehicles = db.prepare(`SELECT * FROM vehicles WHERE customer_id = ? AND deleted = 0`).all(c.id);
  c.work_orders = db.prepare(`SELECT * FROM work_orders WHERE customer_id = ? AND deleted = 0 ORDER BY id DESC`).all(c.id);
  c.invoices = db.prepare(`SELECT * FROM invoices WHERE customer_id = ? ORDER BY id DESC`).all(c.id);
  res.json(c);
});

app.post('/api/customers', authMiddleware, (req, res) => {
  const { name, phone, email, address, language, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const code = nextCode('customers', 'CUS');
  const r = db.prepare(`INSERT INTO customers (code, name, phone, email, address, language, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(code, name, phone || '', email || '', address || '', language || 'ar', notes || '');
  logAudit(req.worker.id, 'create', 'customer', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid, code });
});

app.put('/api/customers/:id', authMiddleware, (req, res) => {
  const { name, phone, email, address, language, notes } = req.body;
  db.prepare(`UPDATE customers SET name=?, phone=?, email=?, address=?, language=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name || '', phone || '', email || '', address || '', language || 'ar', notes || '', req.params.id);
  logAudit(req.worker.id, 'update', 'customer', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/customers/:id', authMiddleware, (req, res) => {
  db.prepare(`UPDATE customers SET deleted = 1 WHERE id = ?`).run(req.params.id);
  logAudit(req.worker.id, 'soft_delete', 'customer', req.params.id);
  res.json({ ok: true });
});

// ───── VEHICLES ─────
app.get('/api/vehicles', authMiddleware, (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT v.*, c.name as customer_name, c.phone as customer_phone
    FROM vehicles v
    JOIN customers c ON c.id = v.customer_id
    WHERE v.deleted = 0
      AND (LOWER(v.plate) LIKE ? OR LOWER(v.make) LIKE ? OR LOWER(v.model) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(v.code) LIKE ?)
    ORDER BY v.id DESC
  `).all(q, q, q, q, q);
  res.json(rows);
});

app.post('/api/vehicles', authMiddleware, (req, res) => {
  const { customer_id, make, model, year, plate, vin, color, mileage, next_service_mileage, next_service_date, notes } = req.body;
  const code = nextCode('vehicles', 'VEH');
  const r = db.prepare(`INSERT INTO vehicles (code, customer_id, make, model, year, plate, vin, color, mileage, next_service_mileage, next_service_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, customer_id, make, model, year, plate, vin || '', color || '', mileage || 0, next_service_mileage || null, next_service_date || null, notes || '');
  logAudit(req.worker.id, 'create', 'vehicle', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid, code });
});

app.put('/api/vehicles/:id', authMiddleware, (req, res) => {
  const { make, model, year, plate, vin, color, mileage, next_service_mileage, next_service_date, notes } = req.body;
  db.prepare(`UPDATE vehicles SET make=?, model=?, year=?, plate=?, vin=?, color=?, mileage=?, next_service_mileage=?, next_service_date=?, notes=? WHERE id=?`)
    .run(make || '', model || '', year || null, plate || '', vin || '', color || '', mileage || 0, next_service_mileage || null, next_service_date || null, notes || '', req.params.id);
  logAudit(req.worker.id, 'update', 'vehicle', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/vehicles/:id', authMiddleware, (req, res) => {
  db.prepare(`UPDATE vehicles SET deleted = 1 WHERE id = ?`).run(req.params.id);
  logAudit(req.worker.id, 'soft_delete', 'vehicle', req.params.id);
  res.json({ ok: true });
});

// ───── PARTS ─────
app.get('/api/parts', authMiddleware, (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT p.*, s.name as supplier_name
    FROM parts p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.deleted = 0
      AND (LOWER(p.name) LIKE ? OR LOWER(p.name_ar) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.code) LIKE ?)
    ORDER BY p.id DESC
  `).all(q, q, q, q);
  res.json(rows);
});

app.post('/api/parts', authMiddleware, (req, res) => {
  const { name, name_ar, sku, category, unit, cost_price, sell_price, stock, min_stock, supplier_id } = req.body;
  const code = nextCode('parts', 'PRT');
  const r = db.prepare(`INSERT INTO parts (code, name, name_ar, sku, category, unit, cost_price, sell_price, stock, min_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, name, name_ar || '', sku || '', category || '', unit || 'pcs', cost_price || 0, sell_price || 0, stock || 0, min_stock || 0, supplier_id || null);
  logAudit(req.worker.id, 'create', 'part', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid, code });
});

app.put('/api/parts/:id', authMiddleware, (req, res) => {
  const { name, name_ar, sku, category, unit, cost_price, sell_price, stock, min_stock, supplier_id } = req.body;
  db.prepare(`UPDATE parts SET name=?, name_ar=?, sku=?, category=?, unit=?, cost_price=?, sell_price=?, stock=?, min_stock=?, supplier_id=? WHERE id=?`)
    .run(name || '', name_ar || '', sku || '', category || '', unit || 'pcs', Number(cost_price) || 0, Number(sell_price) || 0, Number(stock) || 0, Number(min_stock) || 0, supplier_id || null, req.params.id);
  logAudit(req.worker.id, 'update', 'part', req.params.id);
  res.json({ ok: true });
});

app.post('/api/parts/:id/adjust', authMiddleware, (req, res) => {
  const { delta, reason } = req.body;
  db.prepare(`UPDATE parts SET stock = stock + ? WHERE id = ?`).run(Number(delta), req.params.id);
  logAudit(req.worker.id, 'stock_adjust', 'part', req.params.id, `delta=${delta} reason=${reason || ''}`);
  res.json({ ok: true });
});

app.delete('/api/parts/:id', authMiddleware, (req, res) => {
  db.prepare(`UPDATE parts SET deleted = 1 WHERE id = ?`).run(req.params.id);
  logAudit(req.worker.id, 'soft_delete', 'part', req.params.id);
  res.json({ ok: true });
});

app.get('/api/parts/low-stock', authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT * FROM parts WHERE deleted = 0 AND stock <= min_stock`).all();
  res.json(rows);
});

// ───── SUPPLIERS ─────
app.get('/api/suppliers', authMiddleware, (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT * FROM suppliers
    WHERE deleted = 0
      AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ? OR LOWER(code) LIKE ? OR LOWER(address) LIKE ?)
    ORDER BY id DESC
  `).all(q, q, q, q, q);
  res.json(rows);
});

app.post('/api/suppliers', authMiddleware, (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  const code = nextCode('suppliers', 'SUP');
  const r = db.prepare(`INSERT INTO suppliers (code, name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(code, name, phone || '', email || '', address || '', notes || '');
  logAudit(req.worker.id, 'create', 'supplier', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid, code });
});

app.put('/api/suppliers/:id', authMiddleware, (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  db.prepare(`UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=? WHERE id=?`)
    .run(name || '', phone || '', email || '', address || '', notes || '', req.params.id);
  res.json({ ok: true });
});

app.delete('/api/suppliers/:id', authMiddleware, (req, res) => {
  db.prepare(`UPDATE suppliers SET deleted = 1 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ───── PART RETURNS ─────
app.get('/api/part-returns', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT pr.*, p.name as part_name, p.code as part_code, s.name as supplier_name, w.name as authorized_name
    FROM part_returns pr
    LEFT JOIN parts p ON p.id = pr.part_id
    LEFT JOIN suppliers s ON s.id = pr.supplier_id
    LEFT JOIN workers w ON w.id = pr.authorized_by
    ORDER BY pr.id DESC
  `).all();
  res.json(rows);
});

app.post('/api/part-returns', authMiddleware, (req, res) => {
  const { part_id, supplier_id, quantity, reason, credit_amount } = req.body;
  const r = db.prepare(`INSERT INTO part_returns (part_id, supplier_id, quantity, reason, credit_amount, authorized_by) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(part_id, supplier_id, quantity, reason, credit_amount, req.worker.id);
  db.prepare(`UPDATE parts SET stock = stock - ? WHERE id = ?`).run(quantity, part_id);
  logAudit(req.worker.id, 'create', 'part_return', r.lastInsertRowid);
  res.json({ id: r.lastInsertRowid });
});

// Update return status: pending → shipped → credited (or rejected at any time)
app.patch('/api/part-returns/:id/status', authMiddleware, (req, res) => {
  const allowed = ['pending', 'shipped', 'credited', 'rejected'];
  const status = String(req.body.status || '');
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
  const ret = db.prepare(`SELECT * FROM part_returns WHERE id = ?`).get(req.params.id);
  if (!ret) return res.status(404).json({ error: 'not found' });
  // If rejected, restore stock (the part was never actually returned)
  if (status === 'rejected' && ret.status !== 'rejected') {
    db.prepare(`UPDATE parts SET stock = stock + ? WHERE id = ?`).run(ret.quantity, ret.part_id);
  }
  // If un-rejecting, deduct stock again
  if (ret.status === 'rejected' && status !== 'rejected') {
    db.prepare(`UPDATE parts SET stock = stock - ? WHERE id = ?`).run(ret.quantity, ret.part_id);
  }
  db.prepare(`UPDATE part_returns SET status = ? WHERE id = ?`).run(status, req.params.id);
  logAudit(req.worker.id, 'update_status', 'part_return', req.params.id, status);
  res.json({ ok: true, status });
});

// ───── WORK ORDERS ─────
app.get('/api/work-orders', authMiddleware, (req, res) => {
  const status = req.query.status;
  const where = status ? `AND wo.status = ?` : '';
  const params = status ? [status] : [];
  const rows = db.prepare(`
    SELECT wo.*, c.name as customer_name, c.phone as customer_phone, c.language as customer_lang,
      v.plate, v.make, v.model, v.year,
      w.name as technician_name, w.color as technician_color
    FROM work_orders wo
    JOIN customers c ON c.id = wo.customer_id
    JOIN vehicles v ON v.id = wo.vehicle_id
    LEFT JOIN workers w ON w.id = wo.technician_id
    WHERE wo.deleted = 0 ${where}
    ORDER BY
      CASE wo.priority WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
      wo.id DESC
  `).all(...params);
  res.json(rows);
});

app.get('/api/work-orders/:id', authMiddleware, (req, res) => {
  const wo = db.prepare(`
    SELECT wo.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.language as customer_lang,
      v.plate, v.make, v.model, v.year, v.mileage,
      w.name as technician_name, w.color as technician_color
    FROM work_orders wo
    JOIN customers c ON c.id = wo.customer_id
    JOIN vehicles v ON v.id = wo.vehicle_id
    LEFT JOIN workers w ON w.id = wo.technician_id
    WHERE wo.id = ?
  `).get(req.params.id);
  if (!wo) return res.status(404).json({ error: 'not found' });
  wo.parts = db.prepare(`
    SELECT wop.*, p.name as part_name, p.name_ar, p.code as part_code, p.unit
    FROM work_order_parts wop
    JOIN parts p ON p.id = wop.part_id
    WHERE wop.work_order_id = ?
  `).all(wo.id);
  wo.labor = db.prepare(`SELECT * FROM work_order_labor WHERE work_order_id = ?`).all(wo.id);
  wo.invoice = db.prepare(`SELECT * FROM invoices WHERE work_order_id = ?`).get(wo.id);
  res.json(wo);
});

app.post('/api/work-orders', authMiddleware, (req, res) => {
  const { customer_id, vehicle_id, technician_id, problem, priority, damage_checklist, customer_signature, notes, mileage } = req.body;
  const code = nextCode('work_orders', 'WO');
  const tracker_token = 'tk_' + tokenGen();
  const r = db.prepare(`INSERT INTO work_orders (code, customer_id, vehicle_id, technician_id, status, priority, problem, damage_checklist, customer_signature, notes, tracker_token, mileage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, customer_id, vehicle_id, technician_id || null, 'in_progress', priority || 'normal', problem || '', damage_checklist || '', customer_signature || '', notes || '', tracker_token, mileage || 0);
  // Update vehicle mileage if provided
  if (mileage && Number(mileage) > 0) {
    db.prepare(`UPDATE vehicles SET mileage = ? WHERE id = ? AND mileage < ?`).run(Number(mileage), vehicle_id, Number(mileage));
    logAudit(req.worker.id, 'mileage_update', 'vehicle', vehicle_id, `mileage=${mileage} via ${code}`);
  }
  logAudit(req.worker.id, 'create', 'work_order', r.lastInsertRowid);
  // Send WA notification to customer
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customer_id);
  if (customer?.phone) {
    notifyWA(customer.phone, 'wa_msg_new_wo', { name: customer.name, wo_code: code, problem: problem || '' }, customer.language);
  }
  res.json({ id: r.lastInsertRowid, code, tracker_token });
});

app.put('/api/work-orders/:id', authMiddleware, (req, res) => {
  const { technician_id, problem, diagnosis, priority, status, notes, estimate_total, damage_checklist, customer_signature } = req.body;
  const prev = db.prepare(`SELECT status, customer_id, code FROM work_orders WHERE id = ?`).get(req.params.id);
  const newStatus = status || 'in_progress';
  db.prepare(`UPDATE work_orders SET technician_id=?, problem=?, diagnosis=?, priority=?, status=?, notes=?, estimate_total=?, damage_checklist=COALESCE(?, damage_checklist), customer_signature=COALESCE(?, customer_signature) WHERE id=?`)
    .run(
      technician_id || null,
      problem || '',
      diagnosis || '',
      priority || 'normal',
      newStatus,
      notes || '',
      estimate_total || 0,
      damage_checklist === undefined ? null : damage_checklist,
      customer_signature === undefined ? null : customer_signature,
      req.params.id
    );
  logAudit(req.worker.id, 'update', 'work_order', req.params.id);
  // Send WA on status change
  const STATUS_TEMPLATES = {
    in_progress: 'wa_msg_in_progress',
    waiting_parts: 'wa_msg_waiting_parts',
    urgent: 'wa_msg_urgent',
    ready: 'wa_msg_ready',
  };
  if (prev && prev.status !== newStatus && STATUS_TEMPLATES[newStatus]) {
    const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(prev.customer_id);
    if (customer?.phone) {
      notifyWA(customer.phone, STATUS_TEMPLATES[newStatus], { name: customer.name, wo_code: prev.code }, customer.language);
    }
  }
  res.json({ ok: true });
});

app.post('/api/work-orders/:id/parts', authMiddleware, (req, res) => {
  const { part_id, quantity, unit_price } = req.body;
  const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(part_id);
  if (!part) return res.status(404).json({ error: 'part not found' });
  if (part.stock < quantity) return res.status(400).json({ error: 'insufficient stock', available: part.stock });
  const r = db.prepare(`INSERT INTO work_order_parts (work_order_id, part_id, quantity, unit_price) VALUES (?, ?, ?, ?)`)
    .run(req.params.id, part_id, quantity, unit_price || part.sell_price);
  db.prepare(`UPDATE parts SET stock = stock - ? WHERE id = ?`).run(quantity, part_id);
  logAudit(req.worker.id, 'add_part', 'work_order', req.params.id, `part_id=${part_id} qty=${quantity}`);
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/work-orders/:woid/parts/:id', authMiddleware, (req, res) => {
  const wop = db.prepare(`SELECT * FROM work_order_parts WHERE id = ?`).get(req.params.id);
  if (wop) {
    db.prepare(`UPDATE parts SET stock = stock + ? WHERE id = ?`).run(wop.quantity, wop.part_id);
    db.prepare(`DELETE FROM work_order_parts WHERE id = ?`).run(req.params.id);
  }
  res.json({ ok: true });
});

app.post('/api/work-orders/:id/labor', authMiddleware, (req, res) => {
  const { description, hours, rate } = req.body;
  const r = db.prepare(`INSERT INTO work_order_labor (work_order_id, description, hours, rate) VALUES (?, ?, ?, ?)`)
    .run(req.params.id, description, hours || 1, rate || Number(getSetting('labor_rate', 15)));
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/work-orders/:woid/labor/:id', authMiddleware, (req, res) => {
  db.prepare(`DELETE FROM work_order_labor WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/work-orders/:id/close', authMiddleware, (req, res) => {
  const wo = db.prepare(`SELECT * FROM work_orders WHERE id = ?`).get(req.params.id);
  if (!wo) return res.status(404).json({ error: 'not found' });
  if (wo.status === 'invoiced') return res.status(400).json({ error: 'already invoiced' });

  const parts = db.prepare(`SELECT * FROM work_order_parts WHERE work_order_id = ?`).all(wo.id);
  const labor = db.prepare(`SELECT * FROM work_order_labor WHERE work_order_id = ?`).all(wo.id);
  const partsTotal = parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);
  const laborTotal = labor.reduce((s, l) => s + l.hours * l.rate, 0);
  const subtotal = partsTotal + laborTotal;
  const vatRate = Number(getSetting('vat_rate', 0.05));
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(wo.customer_id);
  const code = nextCode('invoices', 'INV');
  const r = db.prepare(`INSERT INTO invoices (code, work_order_id, customer_id, subtotal, vat_rate, vat_amount, total, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(code, wo.id, wo.customer_id, subtotal, vatRate, vatAmount, total, customer.language || 'ar');

  db.prepare(`UPDATE work_orders SET status = 'invoiced', closed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(wo.id);
  logAudit(req.worker.id, 'close', 'work_order', wo.id, `invoice=${code}`);

  // No WA / PDF here — those are sent on payment (mark-paid)
  res.json({ ok: true, invoice_id: r.lastInsertRowid, invoice_code: code });
});

// Send invoice WA text + PDF after payment (fire-and-forget)
function sendInvoiceWAandPDF(invoiceId, method) {
  try {
    const inv = db.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.language as customer_lang,
        wo.code as wo_code, wo.problem, v.plate, v.make, v.model, v.year
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN work_orders wo ON wo.id = i.work_order_id
      LEFT JOIN vehicles v ON v.id = wo.vehicle_id
      WHERE i.id = ?
    `).get(invoiceId);
    if (!inv?.customer_phone) return;

    const tpl = pickTemplate('wa_msg_invoice', inv.customer_lang) || 'فاتورة: {invoice_code} · {total} OMR';
    const waMsg = fillTemplate(tpl, {
      name: inv.customer_name,
      invoice_code: inv.code,
      total: Number(inv.total).toFixed(3),
      wo_code: inv.wo_code || '',
    });
    const notifId = db.prepare(`INSERT INTO notifications (customer_id, channel, message, status) VALUES (?, ?, ?, ?)`)
      .run(inv.customer_id, 'whatsapp', waMsg, 'queued').lastInsertRowid;

    sendWA(inv.customer_phone, waMsg)
      .then(() => db.prepare(`UPDATE notifications SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE id=?`).run(notifId))
      .catch(e => db.prepare(`UPDATE notifications SET status='failed', error=? WHERE id=?`).run(e.message, notifId));

    const invData = {
      code: inv.code,
      language: inv.customer_lang || 'ar',
      customer_name: inv.customer_name,
      customer_phone: inv.customer_phone,
      wo_code: inv.wo_code,
      problem: inv.problem,
      plate: inv.plate,
      make: inv.make,
      model: inv.model,
      year: inv.year,
      parts: inv.work_order_id ? db.prepare(`
        SELECT wop.*, p.name as part_name, p.name_ar, p.code as part_code, p.unit
        FROM work_order_parts wop JOIN parts p ON p.id = wop.part_id
        WHERE wop.work_order_id = ?`).all(inv.work_order_id) : [],
      labor: inv.work_order_id ? db.prepare(`SELECT * FROM work_order_labor WHERE work_order_id = ?`).all(inv.work_order_id) : [],
      subtotal: inv.subtotal,
      vat_rate: inv.vat_rate,
      vat_amount: inv.vat_amount,
      total: inv.total,
      paid: 1,
      payment_method: method,
      issued_at: inv.issued_at,
    };
    const allSettings = Object.fromEntries(db.prepare(`SELECT key, value FROM settings`).all().map(r => [r.key, r.value]));

    generateInvoicePDF(invData, allSettings)
      .then(pdfBuf => {
        const media = new MessageMedia('application/pdf', pdfBuf.toString('base64'), `Invoice-${inv.code}.pdf`);
        return sendWA(inv.customer_phone, media);
      })
      .catch(e => console.error('[PDF invoice WA]', e.message));
  } catch (e) {
    console.error('[sendInvoiceWAandPDF]', e.message);
  }
}

app.post('/api/work-orders/:id/rate', (req, res) => {
  const { rating, feedback, token } = req.body;
  const wo = db.prepare(`SELECT * FROM work_orders WHERE id = ?`).get(req.params.id);
  if (!wo || wo.tracker_token !== token) return res.status(403).json({ error: 'invalid' });
  db.prepare(`UPDATE work_orders SET rating = ?, rating_feedback = ? WHERE id = ?`).run(rating, feedback || '', wo.id);
  res.json({ ok: true });
});

app.delete('/api/work-orders/:id', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'forbidden' });
  db.prepare(`UPDATE work_orders SET deleted = 1 WHERE id = ?`).run(req.params.id);
  logAudit(req.worker.id, 'soft_delete', 'work_order', req.params.id);
  res.json({ ok: true });
});

// public job tracker (no auth) — customer sees their job by token
app.get('/api/track/:token', (req, res) => {
  const wo = db.prepare(`
    SELECT wo.code, wo.status, wo.priority, wo.problem, wo.opened_at, wo.closed_at,
      c.name as customer_name, v.plate, v.make, v.model, v.year,
      w.name as technician_name
    FROM work_orders wo
    JOIN customers c ON c.id = wo.customer_id
    JOIN vehicles v ON v.id = wo.vehicle_id
    LEFT JOIN workers w ON w.id = wo.technician_id
    WHERE wo.tracker_token = ?
  `).get(req.params.token);
  if (!wo) return res.status(404).json({ error: 'not found' });
  res.json(wo);
});

// ───── INVOICES ─────
app.get('/api/invoices', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
      wo.code as wo_code, v.plate, v.make, v.model
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN work_orders wo ON wo.id = i.work_order_id
    LEFT JOIN vehicles v ON v.id = wo.vehicle_id
    ORDER BY i.id DESC
  `).all();
  res.json(rows);
});

app.get('/api/invoices/:id', authMiddleware, (req, res) => {
  const inv = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address, c.email as customer_email,
      wo.code as wo_code, wo.problem, wo.diagnosis, v.plate, v.make, v.model, v.year, v.mileage
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN work_orders wo ON wo.id = i.work_order_id
    LEFT JOIN vehicles v ON v.id = wo.vehicle_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'not found' });
  if (inv.work_order_id) {
    inv.parts = db.prepare(`
      SELECT wop.*, p.name as part_name, p.name_ar, p.code as part_code, p.unit
      FROM work_order_parts wop
      JOIN parts p ON p.id = wop.part_id
      WHERE wop.work_order_id = ?
    `).all(inv.work_order_id);
    inv.labor = db.prepare(`SELECT * FROM work_order_labor WHERE work_order_id = ?`).all(inv.work_order_id);
  }
  res.json(inv);
});

app.post('/api/invoices/:id/pay', authMiddleware, (req, res) => {
  const { method } = req.body;
  const m = method || 'cash';
  db.prepare(`UPDATE invoices SET paid = 1, payment_method = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(m, req.params.id);
  logAudit(req.worker.id, 'pay', 'invoice', req.params.id, `method=${m}`);
  res.json({ ok: true });
  // Fire-and-forget: send WA text + PDF invoice
  sendInvoiceWAandPDF(req.params.id, m);
});

// ───── EXPENSES ─────
app.get('/api/expenses', authMiddleware, (req, res) => {
  const rows = db.prepare(`SELECT * FROM expenses ORDER BY expense_date DESC, id DESC`).all();
  res.json(rows);
});

app.post('/api/expenses', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'forbidden' });
  const { category, description, amount, expense_date, recurring } = req.body;
  const r = db.prepare(`INSERT INTO expenses (category, description, amount, expense_date, recurring) VALUES (?, ?, ?, ?, ?)`)
    .run(category || 'general', description || '', amount || 0, expense_date || new Date().toISOString().slice(0, 10), recurring ? 1 : 0);
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/expenses/:id', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'forbidden' });
  db.prepare(`DELETE FROM expenses WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ───── WAITLIST ─────
app.get('/api/waitlist', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT wl.*, c.name as customer_name, c.phone as customer_phone, v.plate, v.make, v.model
    FROM waitlist wl
    LEFT JOIN customers c ON c.id = wl.customer_id
    LEFT JOIN vehicles v ON v.id = wl.vehicle_id
    WHERE wl.status = 'waiting'
    ORDER BY wl.id ASC
  `).all();
  res.json(rows);
});

app.post('/api/waitlist', authMiddleware, (req, res) => {
  const { customer_id, vehicle_id, problem, preferred_date } = req.body;
  const r = db.prepare(`INSERT INTO waitlist (customer_id, vehicle_id, problem, preferred_date) VALUES (?, ?, ?, ?)`)
    .run(customer_id, vehicle_id || null, problem || '', preferred_date || null);
  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/waitlist/:id', authMiddleware, (req, res) => {
  db.prepare(`UPDATE waitlist SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/waitlist/:id/notify', authMiddleware, (req, res) => {
  const wl = db.prepare(`SELECT * FROM waitlist WHERE id = ?`).get(req.params.id);
  if (!wl) return res.status(404).json({ error: 'not found' });
  db.prepare(`INSERT INTO notifications (customer_id, channel, message) VALUES (?, ?, ?)`)
    .run(wl.customer_id, 'whatsapp', `Good news! A slot is now open for your service. Please contact us to schedule.`);
  db.prepare(`UPDATE waitlist SET status = 'notified' WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// ───── NOTIFICATIONS ─────
app.get('/api/notifications', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, c.name as customer_name, c.phone as customer_phone
    FROM notifications n
    LEFT JOIN customers c ON c.id = n.customer_id
    ORDER BY n.id DESC LIMIT 100
  `).all();
  res.json(rows);
});

app.post('/api/notifications/:id/send', authMiddleware, async (req, res) => {
  const n = db.prepare(`SELECT n.*, c.phone FROM notifications n LEFT JOIN customers c ON c.id = n.customer_id WHERE n.id = ?`).get(req.params.id);
  if (!n) return res.status(404).json({ error: 'not found' });
  if (!n.phone) return res.status(400).json({ error: 'customer has no phone' });
  try {
    await sendWA(n.phone, n.message);
    db.prepare(`UPDATE notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
    res.json({ ok: true, sent: true });
  } catch (e) {
    db.prepare(`UPDATE notifications SET status = 'failed', error = ? WHERE id = ?`).run(e.message, req.params.id);
    res.status(500).json({ error: e.message });
  }
});

// ───── SEARCH (global) ─────
app.get('/api/search', authMiddleware, (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  if (!req.query.q) return res.json([]);
  const customers = db.prepare(`SELECT 'customer' as type, id, code, name, phone as detail FROM customers WHERE deleted = 0 AND (LOWER(name) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(code) LIKE ?) LIMIT 5`).all(q, q, q);
  const vehicles = db.prepare(`SELECT 'vehicle' as type, id, code, (make || ' ' || model || ' ' || COALESCE(year, '')) as name, plate as detail FROM vehicles WHERE deleted = 0 AND (LOWER(plate) LIKE ? OR LOWER(make) LIKE ? OR LOWER(model) LIKE ? OR LOWER(code) LIKE ?) LIMIT 5`).all(q, q, q, q);
  const wos = db.prepare(`SELECT 'work_order' as type, id, code, problem as name, status as detail FROM work_orders WHERE deleted = 0 AND (LOWER(code) LIKE ? OR LOWER(problem) LIKE ?) LIMIT 5`).all(q, q);
  const invs = db.prepare(`SELECT 'invoice' as type, id, code, ('Total: ' || total) as name, (CASE paid WHEN 1 THEN 'paid' ELSE 'unpaid' END) as detail FROM invoices WHERE LOWER(code) LIKE ? LIMIT 5`).all(q);
  const partsR = db.prepare(`SELECT 'part' as type, id, code, name, ('Stock: ' || stock) as detail FROM parts WHERE deleted = 0 AND (LOWER(name) LIKE ? OR LOWER(name_ar) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(code) LIKE ?) LIMIT 5`).all(q, q, q, q);
  res.json([...customers, ...vehicles, ...wos, ...invs, ...partsR]);
});

// ───── DASHBOARD ─────
app.get('/api/dashboard', authMiddleware, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const open_wo = db.prepare(`SELECT COUNT(*) as c FROM work_orders WHERE deleted = 0 AND status IN ('open','in_progress','urgent','waiting_parts')`).get().c;
  const ready_wo = db.prepare(`SELECT COUNT(*) as c FROM work_orders WHERE deleted = 0 AND status = 'ready'`).get().c;
  const customers_count = db.prepare(`SELECT COUNT(*) as c FROM customers WHERE deleted = 0`).get().c;
  const vehicles_count = db.prepare(`SELECT COUNT(*) as c FROM vehicles WHERE deleted = 0`).get().c;
  const low_stock = db.prepare(`SELECT COUNT(*) as c FROM parts WHERE deleted = 0 AND stock <= min_stock`).get().c;
  const month_revenue = db.prepare(`SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE issued_at >= ? AND paid = 1`).get(monthStart).t;
  const today_revenue = db.prepare(`SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE DATE(issued_at) = ? AND paid = 1`).get(today).t;
  const unpaid_total = db.prepare(`SELECT COALESCE(SUM(total), 0) as t FROM invoices WHERE paid = 0`).get().t;
  const month_expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as t FROM expenses WHERE expense_date >= ?`).get(monthStart).t;
  const waitlist_count = db.prepare(`SELECT COUNT(*) as c FROM waitlist WHERE status = 'waiting'`).get().c;
  const avg_rating = db.prepare(`SELECT AVG(rating) as r FROM work_orders WHERE rating IS NOT NULL AND rating > 0`).get().r;

  res.json({
    open_wo, ready_wo, customers_count, vehicles_count, low_stock, waitlist_count,
    month_revenue, today_revenue, unpaid_total, month_expenses,
    avg_rating: avg_rating ? Number(avg_rating).toFixed(1) : null,
    profit: month_revenue - month_expenses,
  });
});

// ───── REPORTS ─────
app.get('/api/reports/revenue', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT DATE(issued_at) as day, SUM(total) as total, SUM(vat_amount) as vat, COUNT(*) as count
    FROM invoices
    WHERE issued_at >= DATE('now', '-30 days')
    GROUP BY DATE(issued_at)
    ORDER BY day ASC
  `).all();
  res.json(rows);
});

app.get('/api/reports/technicians', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT w.id, w.name, w.color, w.avatar,
      COUNT(DISTINCT wo.id) as job_count,
      COUNT(DISTINCT CASE WHEN wo.status = 'invoiced' THEN wo.id END) as completed,
      COALESCE(AVG(wo.rating), 0) as avg_rating
    FROM workers w
    LEFT JOIN work_orders wo ON wo.technician_id = w.id AND wo.deleted = 0
    WHERE w.role = 'Technician'
    GROUP BY w.id
  `).all();
  res.json(rows);
});

app.get('/api/audit-log', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'forbidden' });
  const rows = db.prepare(`
    SELECT a.*, w.name as worker_name, w.color as worker_color
    FROM audit_log a
    LEFT JOIN workers w ON w.id = a.worker_id
    ORDER BY a.id DESC LIMIT 200
  `).all();
  res.json(rows);
});

// ───── BACKUP ─────
app.post('/api/backup', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'owner only' });
  try {
    const backupDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupDir, `garage-${stamp}.db`);
    // VACUUM INTO produces a clean compacted backup file
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    logAudit(req.worker.id, 'backup', 'system', 0, dest);
    res.json({ ok: true, file: path.basename(dest), size: fs.statSync(dest).size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ───── CLOUD BACKUPS (restic + rclone → Google Drive) ─────
// OAuth flow: client opens /api/backup/auth-url in a popup, completes Google
// consent, hits /api/backup/oauth/callback which closes the popup.
app.get('/api/backup/auth-url', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  res.json(buildAuthUrl());
});

// Public callback (no auth — Google redirects here from user's browser)
app.get('/api/backup/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(`<html><body><h2>OAuth error</h2><pre>${error}</pre></body></html>`);
  if (!code || !state) return res.status(400).send('Missing code or state');
  try {
    const out = await completeOAuth(code, state);
    res.send(`<!doctype html><html><head><title>Linked</title>
<style>body{font-family:system-ui;background:#0F172A;color:#E2E8F0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#1E293B;padding:32px 40px;border-radius:16px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.5);max-width:380px}
h2{margin:0 0 8px;color:#10B981}
p{color:#94A3B8;font-size:14px;margin:0}</style></head>
<body><div class="card"><div style="font-size:48px;margin-bottom:12px">✅</div>
<h2>Account linked</h2>
<p>${out.email} — you can close this tab.</p></div>
<script>setTimeout(()=>{ try{ if(window.opener) window.opener.postMessage({type:'autoshop-backup-linked', email:${JSON.stringify(out.email)}}, '*'); }catch(e){} window.close(); }, 800);</script>
</body></html>`);
  } catch (e) {
    res.status(500).send(`<html><body><h2>Error</h2><pre>${e.message}</pre></body></html>`);
  }
});

app.get('/api/backup/accounts', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  res.json(listAccounts());
});

app.post('/api/backup/accounts/:id/activate', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  try { res.json(setActiveAccount(Number(req.params.id))); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/backup/accounts/:id/run', authMiddleware, async (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  // Run async — don't make the HTTP request hold the connection for the whole backup
  runBackup(Number(req.params.id)).catch(e => console.error('[Backup] run error:', e.message));
  res.json({ ok: true, started: true });
});

app.delete('/api/backup/accounts/:id', authMiddleware, async (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  try { res.json(await unlinkAccount(Number(req.params.id))); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/backup/accounts/:id/password', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  try { res.json({ password: revealPassword(Number(req.params.id)) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/backup/log', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  res.json(getRecentLog(50));
});

app.get('/api/backups', authMiddleware, (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'owner only' });
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) return res.json([]);
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const s = fs.statSync(path.join(backupDir, f));
      return { name: f, size: s.size, created: s.mtime };
    })
    .sort((a, b) => b.created - a.created);
  res.json(files);
});

// ───── OCR ─────
// Send a one-shot WhatsApp alert to the admin (rate-limited to once per hour per topic)
const _alertCooldown = new Map();
function alertAdmin(topic, body) {
  const last = _alertCooldown.get(topic) || 0;
  if (Date.now() - last < 60 * 60 * 1000) return;
  _alertCooldown.set(topic, Date.now());
  const phone = getSetting('admin_alert_phone', '');
  if (!phone) return;
  sendWA(phone, `⚠️ AutoShop alert\n${topic}\n${body}`).catch(e => console.error('[alertAdmin]', e.message));
}

app.post('/api/ocr/vehicle', authMiddleware, async (req, res) => {
  try {
    // Accept either { image: dataUrl } (legacy) or { images: [dataUrl, ...] }
    const list = Array.isArray(req.body?.images) ? req.body.images
               : (req.body?.image ? [req.body.image] : []);
    if (list.length === 0) return res.status(400).json({ error: 'image(s) required' });
    if (list.length > 6) return res.status(400).json({ error: 'too many images (max 6)' });

    const apiKey = process.env.GEMINI_API_KEY || getSetting('gemini_api_key', '');
    if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set. Add it in Settings.' });

    const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    const inlineParts = [];
    for (const item of list) {
      if (typeof item !== 'string') return res.status(400).json({ error: 'each image must be a base64 data URL' });
      const m = item.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return res.status(400).json({ error: 'image must be a base64 data URL' });
      const [, mimeType, b64] = m;
      if (!supported.includes(mimeType)) return res.status(400).json({ error: `unsupported mime: ${mimeType}` });
      inlineParts.push({ inlineData: { mimeType, data: b64 } });
    }

    const prompt = `These are photos of an Omani vehicle registration card (Royal Oman Police "رخصة مركبة"), written in Arabic.
The card has TWO sides. The front shows make/model/year/plate/VIN/color/license validity. The back shows owner name, nationality, address, insurance company, insurance policy number, insurance type, first registration date.
You may receive one or both sides — combine information from all images provided.
Return ONLY a valid JSON object — no explanation, no markdown fences:
{
  "make": "vehicle brand in English (e.g. Toyota, Nissan)",
  "model": "vehicle model in English (e.g. Camry, Patrol)",
  "year": year as integer (سنة الصنع or سنة الطراز),
  "plate": "plate number exactly as shown (e.g. 95753 or '24 ب / 95753')",
  "vin": "chassis number (the field labeled رقم الشاصي / رقم القاعدة — the long alphanumeric VIN code)",
  "color": "color in English",
  "owner_name": "owner full name as written (Arabic)",
  "insurance_company": "insurance company name (English if shown, otherwise Arabic)",
  "insurance_policy_number": "insurance policy number",
  "insurance_type": "third party / comprehensive / null",
  "first_registration_date": "YYYY-MM-DD",
  "license_expiry": "YYYY-MM-DD (صلاحية الرخصة إلى)"
}
Use null for any field not visible in the provided images. The chassis number (VIN) is critical — extract it precisely character by character.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      contents: [{
        parts: [
          { text: prompt },
          ...inlineParts,
        ],
      }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    };

    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      const errBody = await r.text();
      console.error('[OCR Gemini]', r.status, errBody.slice(0, 300));
      if (r.status === 401 || r.status === 403) {
        alertAdmin('Gemini API key invalid', `OCR request failed with HTTP ${r.status}. Update the key in Settings.`);
      } else if (r.status === 429) {
        alertAdmin('Gemini API quota exceeded', `OCR request blocked with HTTP 429. Check your Google Cloud usage.`);
      }
      return res.status(r.status).json({ error: `Gemini ${r.status}`, detail: errBody.slice(0, 300) });
    }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const json = raw.replace(/```[a-z]*\n?/gi, '').trim();
    let parsed;
    try { parsed = JSON.parse(json); }
    catch { return res.status(502).json({ error: 'Gemini returned non-JSON', raw: raw.slice(0, 200) }); }
    res.json(parsed);
  } catch (e) {
    console.error('[OCR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ───── STATIC CLIENT ─────
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  }));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ───── START ─────
function getLanIp() {
  const nics = os.networkInterfaces();
  for (const name of Object.keys(nics)) {
    for (const nic of nics[name]) {
      if (nic.family === 'IPv4' && !nic.internal && !nic.address.startsWith('169.')) {
        return nic.address;
      }
    }
  }
  return '127.0.0.1';
}

// ───── WHATSAPP ─────
app.get('/api/whatsapp/status', authMiddleware, (req, res) => res.json(waStatus()));

app.post('/api/whatsapp/restart', authMiddleware, async (req, res) => {
  if (req.worker.role !== 'Manager') return res.status(403).json({ error: 'manager only' });
  const clear = !!req.body?.clear;
  try {
    await restartWhatsApp({ clearSession: clear });
    res.json({ ok: true, cleared: clear });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const lan = getLanIp();
  console.log('');
  console.log('  ════════════════════════════════════════════════');
  console.log('   AutoShop Pro — Garage Management Platform');
  console.log('   Powered by Basil Al Shukaili');
  console.log('  ════════════════════════════════════════════════');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${lan}:${PORT}`);
  console.log(`   Backups:  ${path.join(__dirname, '..', 'backups')}`);
  console.log('  ════════════════════════════════════════════════');
  console.log('');
  // Start WhatsApp client after server is up
  initWhatsApp();
  // Start the cloud-backup scheduler (runs daily if an account is active)
  startScheduler();
});
