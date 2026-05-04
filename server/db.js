import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'garage.db');
export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ───── SCHEMA ─────
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT,
  role TEXT NOT NULL,
  role_ar TEXT,
  color TEXT,
  avatar TEXT,
  pin_hash TEXT NOT NULL,
  pin TEXT,
  active INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'dark',
  lang TEXT DEFAULT 'en',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  language TEXT DEFAULT 'ar',
  notes TEXT,
  deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  plate TEXT,
  vin TEXT,
  color TEXT,
  mileage INTEGER DEFAULT 0,
  next_service_mileage INTEGER,
  next_service_date TEXT,
  notes TEXT,
  deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  sku TEXT,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  cost_price REAL DEFAULT 0,
  sell_price REAL DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  supplier_id INTEGER,
  deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  technician_id INTEGER,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  problem TEXT,
  diagnosis TEXT,
  notes TEXT,
  estimate_total REAL DEFAULT 0,
  damage_checklist TEXT,
  customer_signature TEXT,
  rating INTEGER,
  rating_feedback TEXT,
  tracker_token TEXT,
  opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  deleted INTEGER DEFAULT 0,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (technician_id) REFERENCES workers(id)
);

CREATE TABLE IF NOT EXISTS work_order_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts(id)
);

CREATE TABLE IF NOT EXISTS work_order_labor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  hours REAL DEFAULT 0,
  rate REAL DEFAULT 0,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  work_order_id INTEGER UNIQUE,
  customer_id INTEGER NOT NULL,
  subtotal REAL NOT NULL,
  vat_rate REAL NOT NULL,
  vat_amount REAL NOT NULL,
  total REAL NOT NULL,
  paid INTEGER DEFAULT 0,
  payment_method TEXT,
  paid_at TEXT,
  issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
  language TEXT DEFAULT 'ar',
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  description TEXT,
  amount REAL,
  expense_date TEXT,
  recurring INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  vehicle_id INTEGER,
  problem TEXT,
  preferred_date TEXT,
  status TEXT DEFAULT 'waiting',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS part_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER,
  supplier_id INTEGER,
  quantity REAL,
  reason TEXT,
  credit_amount REAL,
  authorized_by INTEGER,
  return_date TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (part_id) REFERENCES parts(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (authorized_by) REFERENCES workers(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER,
  action TEXT,
  entity TEXT,
  entity_id INTEGER,
  details TEXT,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  channel TEXT,
  message TEXT,
  status TEXT DEFAULT 'queued',
  sent_at TEXT,
  error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_workorders_customer ON work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_workorders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_workorders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(stock);

CREATE TABLE IF NOT EXISTS backup_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  refresh_token TEXT,
  access_token TEXT,
  access_expires_at INTEGER,
  restic_password TEXT,
  rclone_remote TEXT,
  is_active INTEGER DEFAULT 0,
  last_backup_at TEXT,
  last_backup_status TEXT,
  last_backup_error TEXT,
  last_snapshot_id TEXT,
  bytes_total INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT,
  bytes_added INTEGER,
  files_added INTEGER,
  snapshot_id TEXT,
  error TEXT,
  FOREIGN KEY (account_id) REFERENCES backup_accounts(id) ON DELETE CASCADE
);
`);

// ───── MIGRATIONS ─────
try { db.exec('ALTER TABLE workers ADD COLUMN pin TEXT'); } catch {}
try { db.exec('ALTER TABLE work_orders ADD COLUMN mileage INTEGER DEFAULT 0'); } catch {}
// Backfill plaintext PINs for demo workers that predate this column
const _demos = [['Basil','0000'],['Ahmed','1234'],['Khalid','5678'],['Sara','9012'],['Faisal','3456']];
const _upPin = db.prepare('UPDATE workers SET pin = ? WHERE name = ? AND pin IS NULL');
for (const [name, pin] of _demos) _upPin.run(pin, name);
// Migrate roles: Owner→Manager, Receptionist→Technician
db.prepare(`UPDATE workers SET role = 'Manager', role_ar = 'مدير' WHERE role = 'Owner'`).run();
db.prepare(`UPDATE workers SET role = 'Technician', role_ar = 'فني' WHERE role = 'Receptionist'`).run();
// Seed WA test number and message templates if missing
const _setSetting = (k, v) => { if (!db.prepare('SELECT 1 FROM settings WHERE key=?').get(k)) db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').run(k, v); };
// Arabic templates (used when customer.language === 'ar')
_setSetting('wa_msg_new_wo',         'مرحباً {name}،\nتم استلام سيارتك لدينا 🔧\nأمر العمل: {wo_code}\nالمشكلة: {problem}\nسنُبلغك بأي تحديثات.');
_setSetting('wa_msg_in_progress',    'مرحباً {name}،\nسيارتك قيد الإصلاح الآن 🔧\nأمر العمل: {wo_code}');
_setSetting('wa_msg_waiting_parts',  'مرحباً {name}،\nأمر العمل {wo_code} في انتظار وصول قطع الغيار 🧰\nسنُبلغك فور توفّرها.');
_setSetting('wa_msg_urgent',         'مرحباً {name}،\nتم تصنيف أمر العمل {wo_code} كـ ⚠️ عاجل وتم إعطاؤه الأولوية.');
_setSetting('wa_msg_ready',          'مرحباً {name}،\nسيارتك جاهزة للاستلام ✅\nأمر العمل: {wo_code}\nتفضل بالاستلام في أقرب وقت.');
_setSetting('wa_msg_invoice',        'مرحباً {name}،\nشكراً للدفع 🙏\nالفاتورة: {invoice_code}\nالإجمالي: {total} OMR\nالفاتورة مرفقة.');
// English templates (used when customer.language === 'en')
_setSetting('wa_msg_new_wo_en',         'Hi {name},\nWe have received your vehicle 🔧\nWork Order: {wo_code}\nIssue: {problem}\nWe will keep you posted.');
_setSetting('wa_msg_in_progress_en',    'Hi {name},\nYour vehicle is being serviced now 🔧\nWork Order: {wo_code}');
_setSetting('wa_msg_waiting_parts_en',  'Hi {name},\nWork Order {wo_code} is on hold pending parts 🧰\nWe will notify you as soon as they arrive.');
_setSetting('wa_msg_urgent_en',         'Hi {name},\nWork Order {wo_code} has been flagged ⚠️ URGENT and prioritized.');
_setSetting('wa_msg_ready_en',          'Hi {name},\nYour vehicle is ready for pickup ✅\nWork Order: {wo_code}\nPlease come by at your convenience.');
_setSetting('wa_msg_invoice_en',        'Hi {name},\nThank you for your payment 🙏\nInvoice: {invoice_code}\nTotal: {total} OMR\nInvoice attached.');
// Gemini OCR API key (user provided 2026-05-03) — force overwrite
db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
  .run('gemini_api_key', 'AIzaSyBxCbOcfpKc6G55y5Ibj2llWMUjwdUO1w0');
// WhatsApp number to alert when API key fails / quota exceeded
_setSetting('admin_alert_phone', '+96894639405');
// Set all customer phones to Basil's number for live testing
db.prepare(`UPDATE customers SET phone='+96894639405'`).run();

// ───── SEED ─────
import bcrypt from 'bcryptjs';

const hasWorkers = db.prepare('SELECT COUNT(*) as c FROM workers').get().c;
if (!hasWorkers) {
  // SECURITY: only the bcrypt-hashed pin is stored. The legacy `pin` column
  // is left NULL so PINs cannot be recovered from the database.
  const insertWorker = db.prepare(`
    INSERT INTO workers (name, name_ar, role, role_ar, color, avatar, pin_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const seed = [
    ['Basil', 'باسل', 'Manager', 'مدير', '#6366F1', '👑', '0000'],
    ['Ahmed', 'أحمد', 'Manager', 'مدير', '#A78BFA', '🧑‍💼', '1234'],
    ['Khalid', 'خالد', 'Technician', 'فني', '#34D399', '👷', '5678'],
    ['Sara', 'سارة', 'Technician', 'فني', '#F472B6', '👩‍💼', '9012'],
    ['Faisal', 'فيصل', 'Technician', 'فني', '#38BDF8', '🧑‍🔧', '3456'],
  ];
  for (const [n, na, r, ra, c, av, pin] of seed) {
    insertWorker.run(n, na, r, ra, c, av, bcrypt.hashSync(pin, 8));
  }
}

// ───── ONE-TIME SECURITY MIGRATION ─────
// Earlier versions of the app stored worker PINs in plaintext in `workers.pin`.
// Wipe any leftover plaintext so a database leak doesn't expose login credentials.
db.exec(`UPDATE workers SET pin = NULL WHERE pin IS NOT NULL`);

const hasSettings = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
if (!hasSettings) {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('shop_name', 'AutoShop Pro');
  insertSetting.run('shop_name_ar', 'أوتوشوب برو');
  insertSetting.run('shop_address', 'Muscat, Sultanate of Oman');
  insertSetting.run('shop_address_ar', 'مسقط، سلطنة عُمان');
  insertSetting.run('shop_phone', '+968 94639405');
  insertSetting.run('shop_email', 'basilalshukaili@gmail.com');
  insertSetting.run('vat_rate', '0.05');
  insertSetting.run('vat_number', '');
  insertSetting.run('currency', 'OMR');
  insertSetting.run('currency_symbol', 'ر.ع');
  insertSetting.run('labor_rate', '15');
  insertSetting.run('idle_lock_seconds', '90');
  insertSetting.run('developer_name', 'Basil Al Shukaili');
  insertSetting.run('developer_phone', '+968 94639405');
  insertSetting.run('developer_email', 'basilalshukaili@gmail.com');
}

// ───── DEMO DATA ─────
const hasDemo = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
if (!hasDemo) {
  const customers = [
    ['CUS-0001', 'Khalid Al-Omari', '+96894639405', 'khalid@example.om', 'Al Khuwair, Muscat', 'ar'],
    ['CUS-0002', 'Mohammed Al-Hinai', '+96894639405', 'mohammed@example.om', 'Ruwi, Muscat', 'ar'],
    ['CUS-0003', 'Saud Al-Balushi', '+96894639405', 'saud@example.om', 'Seeb, Muscat', 'ar'],
    ['CUS-0004', 'Nasser Al-Rashdi', '+96894639405', 'nasser@example.om', 'Bawshar, Muscat', 'ar'],
  ];
  const ic = db.prepare(`INSERT INTO customers (code, name, phone, email, address, language) VALUES (?, ?, ?, ?, ?, ?)`);
  customers.forEach(c => ic.run(...c));

  const vehicles = [
    ['VEH-0001', 1, 'Toyota', 'Camry', 2021, '1234 ABC', 'Pearl White', 45000, 50000],
    ['VEH-0002', 2, 'Toyota', 'Land Cruiser', 2020, '5678 DEF', 'Black', 78000, 80000],
    ['VEH-0003', 3, 'Toyota', 'Corolla', 2022, '9012 GHI', 'Silver', 28000, 30000],
    ['VEH-0004', 4, 'Nissan', 'Patrol', 2019, '3456 JKL', 'White', 95000, 100000],
  ];
  const iv = db.prepare(`INSERT INTO vehicles (code, customer_id, make, model, year, plate, color, mileage, next_service_mileage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  vehicles.forEach(v => iv.run(...v));

  const suppliers = [
    ['SUP-0001', 'Toyota Parts Oman', '+968 24123456', 'parts@toyota.om', 'Wadi Kabir, Muscat'],
    ['SUP-0002', 'Al Habib Auto Parts', '+968 24234567', 'sales@habibauto.om', 'Ruwi, Muscat'],
    ['SUP-0003', 'Bin Mirza Tires', '+968 24345678', 'tires@binmirza.om', 'Ghala, Muscat'],
  ];
  const isu = db.prepare(`INSERT INTO suppliers (code, name, phone, email, address) VALUES (?, ?, ?, ?, ?)`);
  suppliers.forEach(s => isu.run(...s));

  const parts = [
    ['PRT-0001', 'Engine Oil 5W-30 (4L)', 'زيت محرك 5W-30', 'OIL-5W30-4L', 'Lubricants', 'pcs', 6.500, 9.500, 24, 8, 1],
    ['PRT-0002', 'Oil Filter', 'فلتر زيت', 'OF-TOY-001', 'Filters', 'pcs', 2.200, 4.500, 18, 6, 1],
    ['PRT-0003', 'Air Filter', 'فلتر هواء', 'AF-TOY-001', 'Filters', 'pcs', 3.800, 7.000, 12, 4, 1],
    ['PRT-0004', 'Brake Pad Set Front', 'طقم تيل أمامي', 'BP-FR-TOY', 'Brakes', 'set', 14.500, 24.000, 6, 4, 1],
    ['PRT-0005', 'Battery 70Ah', 'بطارية ٧٠ أمبير', 'BAT-70', 'Electrical', 'pcs', 28.000, 42.000, 4, 2, 2],
    ['PRT-0006', 'AC Refrigerant R134a', 'فريون R134a', 'GAS-R134', 'AC', 'can', 4.500, 8.000, 10, 5, 2],
    ['PRT-0007', 'Spark Plug', 'بوجي', 'SP-NGK-01', 'Engine', 'pcs', 1.500, 3.000, 32, 16, 1],
    ['PRT-0008', 'Wiper Blade 22"', 'مساحة ٢٢ بوصة', 'WP-22', 'Body', 'pcs', 2.800, 5.500, 14, 6, 2],
    ['PRT-0009', 'Tire 215/60 R16', 'إطار ٢١٥/٦٠', 'TR-21560R16', 'Tires', 'pcs', 22.000, 35.000, 8, 4, 3],
    ['PRT-0010', 'Coolant Antifreeze', 'مبرد محرك', 'CL-AF-001', 'Lubricants', 'L', 1.800, 3.500, 20, 8, 1],
  ];
  const ip = db.prepare(`INSERT INTO parts (code, name, name_ar, sku, category, unit, cost_price, sell_price, stock, min_stock, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  parts.forEach(p => ip.run(...p));

  const wo = db.prepare(`INSERT INTO work_orders (code, customer_id, vehicle_id, technician_id, status, priority, problem, tracker_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  wo.run('WO-0312', 1, 1, 5, 'urgent', 'urgent', 'Brake noise on front wheels', 'tk_demo_312');
  wo.run('WO-0318', 2, 2, 3, 'in_progress', 'normal', 'Oil change + filter service', 'tk_demo_318');
  wo.run('WO-0325', 3, 3, 5, 'ready', 'normal', 'AC not cooling well', 'tk_demo_325');
  wo.run('WO-0330', 4, 4, null, 'waiting_parts', 'normal', 'Battery replacement', 'tk_demo_330');
}

export function getSetting(key, fallback = null) {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? r.value : fallback;
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
}

console.log('[db] ready at', dbPath);
