import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, '..', 'data', 'wwa-session');
fs.mkdirSync(SESSION_DIR, { recursive: true });

// Windows Chrome paths to try
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME_EXE = CHROME_PATHS.find(p => fs.existsSync(p));

let _client = null;
let _state = 'off'; // 'off' | 'initializing' | 'qr' | 'ready' | 'error'
let _qrDataUrl = null;
let _error = null;

export function getStatus() {
  return { state: _state, qr: _qrDataUrl, error: _error };
}

export async function restartWhatsApp({ clearSession = false } = {}) {
  if (_client) {
    try { await _client.destroy(); } catch {}
    _client = null;
  }
  if (clearSession) {
    try {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      console.log('[WhatsApp] Session cleared');
    } catch (e) {
      console.error('[WhatsApp] Failed to clear session:', e.message);
    }
  }
  _state = 'off';
  _qrDataUrl = null;
  _error = null;
  initWhatsApp();
  return { ok: true };
}

export async function sendWA(phone, message) {
  if (_state !== 'ready') throw new Error(`WhatsApp not ready (state: ${_state})`);
  const num = phone.replace(/[\s+\-()]/g, '') + '@c.us';
  return _client.sendMessage(num, message);
}

export function initWhatsApp() {
  if (_client) {
    try { _client.destroy(); } catch {}
    _client = null;
  }
  _state = 'initializing';
  _qrDataUrl = null;
  _error = null;

  const puppeteerOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  };
  if (CHROME_EXE) {
    console.log(`[WhatsApp] Using system Chrome: ${CHROME_EXE}`);
    puppeteerOpts.executablePath = CHROME_EXE;
  }

  _client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR, clientId: 'garage' }),
    puppeteer: puppeteerOpts,
  });

  _client.on('qr', async (qr) => {
    _state = 'qr';
    _qrDataUrl = await qrcode.toDataURL(qr);
    console.log('[WhatsApp] QR ready — scan in the app UI');
  });

  _client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated');
    _qrDataUrl = null;
  });

  _client.on('ready', () => {
    _state = 'ready';
    _qrDataUrl = null;
    console.log('[WhatsApp] Ready ✓');
  });

  _client.on('auth_failure', (msg) => {
    _state = 'error';
    _error = 'Auth failed: ' + msg;
    console.error('[WhatsApp] Auth failure:', msg);
    setTimeout(initWhatsApp, 10_000);
  });

  _client.on('disconnected', (reason) => {
    _state = 'off';
    console.log('[WhatsApp] Disconnected:', reason);
    setTimeout(initWhatsApp, 8_000);
  });

  _client.initialize().catch(err => {
    _state = 'error';
    _error = err.message;
    console.error('[WhatsApp] Init error:', err.message);
    setTimeout(initWhatsApp, 15_000);
  });
}
