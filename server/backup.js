// Backup orchestrator: restic + rclone → Google Drive
// Manages multiple linked Google accounts, daily incremental backups,
// auto-prune old snapshots, transparent token refresh.

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── OAuth credentials ─────────────────────────────────────────────────
// Per Google docs, the "client_secret" of an installed/desktop app is
// not actually a secret — embedding here is fine for a self-hosted app.
const OAUTH_CLIENT_ID = '86981435468-vsl6073aeqv767vj2tugp9ft6ulgt5g2.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3000/api/backup/oauth/callback';
// drive.file scope: only access files this app creates (safer than full drive access)
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

// ─── Paths ─────────────────────────────────────────────────────────────
const BIN_DIR = path.join(__dirname, 'bin');
const RCLONE_CONFIG = path.join(BIN_DIR, 'rclone.conf');
const DATA_DIR = path.join(__dirname, '..', 'data');
const RESTIC_VERSION = '0.17.3';
const RCLONE_VERSION = 'v1.68.2';

const resticPath = () => path.join(BIN_DIR, 'restic.exe');
const rclonePath = () => path.join(BIN_DIR, 'rclone.exe');

// ─── In-memory OAuth state (10-min lifetime) ───────────────────────────
const _oauthStates = new Map();

// ─── Spawn helper ──────────────────────────────────────────────────────
function spawnAsync(cmd, args, opts = {}, allowedCodes = [0]) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());
    proc.on('error', reject);
    proc.on('close', code => {
      if (allowedCodes.includes(code)) resolve({ stdout, stderr, code });
      else reject(new Error(`${path.basename(cmd)} exit ${code}: ${(stderr || stdout).slice(0, 1000)}`));
    });
  });
}

// ─── Binary management ─────────────────────────────────────────────────
async function downloadFile(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Download failed (${r.status}): ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
}

async function unzipWindows(zipPath, destDir) {
  // Use PowerShell's built-in Expand-Archive (always available on Win 10+)
  await spawnAsync('powershell', [
    '-NoProfile', '-Command',
    `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
  ]);
}

async function ensureBinaries(progressCb) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const log = (m) => { console.log('[Backup]', m); progressCb?.(m); };

  if (!fs.existsSync(resticPath())) {
    log('Downloading restic...');
    const zipUrl = `https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/restic_${RESTIC_VERSION}_windows_amd64.zip`;
    const zipPath = path.join(BIN_DIR, '_restic.zip');
    await downloadFile(zipUrl, zipPath);
    log('Extracting restic...');
    await unzipWindows(zipPath, BIN_DIR);
    const files = fs.readdirSync(BIN_DIR);
    const exe = files.find(f => f.startsWith('restic_') && f.endsWith('.exe'));
    if (!exe) throw new Error('restic.exe not found in archive');
    fs.renameSync(path.join(BIN_DIR, exe), resticPath());
    fs.unlinkSync(zipPath);
    log('restic installed.');
  }

  if (!fs.existsSync(rclonePath())) {
    log('Downloading rclone...');
    const zipUrl = `https://downloads.rclone.org/${RCLONE_VERSION}/rclone-${RCLONE_VERSION}-windows-amd64.zip`;
    const zipPath = path.join(BIN_DIR, '_rclone.zip');
    await downloadFile(zipUrl, zipPath);
    log('Extracting rclone...');
    await unzipWindows(zipPath, BIN_DIR);
    const subdir = fs.readdirSync(BIN_DIR)
      .find(f => f.startsWith('rclone-') && f.endsWith('-windows-amd64') && fs.statSync(path.join(BIN_DIR, f)).isDirectory());
    if (!subdir) throw new Error('rclone subdirectory not found');
    fs.renameSync(path.join(BIN_DIR, subdir, 'rclone.exe'), rclonePath());
    fs.rmSync(path.join(BIN_DIR, subdir), { recursive: true });
    fs.unlinkSync(zipPath);
    log('rclone installed.');
  }
}

// ─── rclone config writer ──────────────────────────────────────────────
function writeRcloneConfig() {
  const accounts = db.prepare('SELECT * FROM backup_accounts').all();
  let conf = '';
  for (const a of accounts) {
    const tokenObj = {
      access_token: a.access_token,
      token_type: 'Bearer',
      refresh_token: a.refresh_token,
      expiry: new Date(a.access_expires_at || Date.now()).toISOString(),
    };
    conf += `[${a.rclone_remote}]\n`;
    conf += `type = drive\n`;
    conf += `client_id = ${OAUTH_CLIENT_ID}\n`;
    conf += `client_secret = ${OAUTH_CLIENT_SECRET}\n`;
    conf += `scope = drive.file\n`;
    conf += `token = ${JSON.stringify(tokenObj)}\n\n`;
  }
  fs.mkdirSync(BIN_DIR, { recursive: true });
  fs.writeFileSync(RCLONE_CONFIG, conf, { mode: 0o600 });
}

// ─── OAuth flow ────────────────────────────────────────────────────────
export function buildAuthUrl() {
  const state = crypto.randomBytes(16).toString('hex');
  _oauthStates.set(state, Date.now());
  // Garbage-collect old states
  for (const [s, t] of _oauthStates) {
    if (Date.now() - t > 10 * 60 * 1000) _oauthStates.delete(s);
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return { url: url.toString(), state };
}

export async function completeOAuth(code, state) {
  if (!_oauthStates.has(state)) throw new Error('Invalid or expired state');
  _oauthStates.delete(state);

  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: OAUTH_CLIENT_ID, client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
    }).toString(),
  });
  if (!tokRes.ok) throw new Error('Token exchange failed: ' + await tokRes.text());
  const tok = await tokRes.json();

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const user = await userRes.json();
  if (!user.email) throw new Error('Could not get user email');

  // If this email is already linked, update tokens instead of duplicating
  const existing = db.prepare('SELECT * FROM backup_accounts WHERE email = ?').get(user.email);
  if (existing) {
    db.prepare(`UPDATE backup_accounts SET refresh_token=?, access_token=?, access_expires_at=? WHERE id=?`)
      .run(tok.refresh_token || existing.refresh_token, tok.access_token,
           Date.now() + tok.expires_in * 1000, existing.id);
    writeRcloneConfig();
    return { ok: true, email: user.email, id: existing.id, existing: true };
  }

  const resticPassword = crypto.randomBytes(24).toString('base64');
  const remoteName = `gdrive_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const r = db.prepare(`
    INSERT INTO backup_accounts (email, refresh_token, access_token, access_expires_at, restic_password, rclone_remote, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(user.email, tok.refresh_token, tok.access_token,
         Date.now() + tok.expires_in * 1000, resticPassword, remoteName);

  // First-ever account becomes active automatically
  const count = db.prepare('SELECT COUNT(*) as c FROM backup_accounts').get().c;
  if (count === 1) db.prepare('UPDATE backup_accounts SET is_active = 1 WHERE id = ?').run(r.lastInsertRowid);

  writeRcloneConfig();
  return { ok: true, email: user.email, id: r.lastInsertRowid, existing: false };
}

async function refreshAccessToken(account) {
  if (Date.now() < (account.access_expires_at || 0) - 60_000) return account;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID, client_secret: OAUTH_CLIENT_SECRET,
      refresh_token: account.refresh_token, grant_type: 'refresh_token',
    }).toString(),
  });
  if (!r.ok) throw new Error('Token refresh failed: ' + await r.text());
  const tok = await r.json();
  account.access_token = tok.access_token;
  account.access_expires_at = Date.now() + tok.expires_in * 1000;
  db.prepare(`UPDATE backup_accounts SET access_token=?, access_expires_at=? WHERE id=?`)
    .run(account.access_token, account.access_expires_at, account.id);
  writeRcloneConfig();
  return account;
}

// ─── restic operations ─────────────────────────────────────────────────
function repoArg(account) { return `rclone:${account.rclone_remote}:AutoShopBackups`; }

// Restic calls rclone as a child process — it must be findable in PATH.
// We prepend BIN_DIR so both restic.exe and rclone.exe are always resolved.
function makeEnv(account) {
  const pathKey = Object.keys(process.env).find(k => k.toUpperCase() === 'PATH') || 'PATH';
  return {
    ...process.env,
    [pathKey]: `${BIN_DIR}${path.delimiter}${process.env[pathKey] || ''}`,
    RESTIC_PASSWORD: account.restic_password,
    RCLONE_CONFIG,
  };
}

async function ensureRepoExists(account) {
  const env = makeEnv(account);
  // Try a cheap check first
  try {
    await spawnAsync(resticPath(), ['-r', repoArg(account), 'cat', 'config'], { env });
    return;
  } catch {}
  // Init
  console.log('[Backup] Initializing restic repo for', account.email);
  await spawnAsync(resticPath(), ['-r', repoArg(account), 'init'], { env });
}

let _backupRunning = false;

export async function runBackup(accountId, { progressCb } = {}) {
  if (_backupRunning) throw new Error('Another backup is already running');
  _backupRunning = true;

  const account = db.prepare('SELECT * FROM backup_accounts WHERE id = ?').get(accountId);
  if (!account) { _backupRunning = false; throw new Error('Account not found'); }

  const log = db.prepare(`INSERT INTO backup_log (account_id, status) VALUES (?, 'running')`).run(accountId);
  const logId = log.lastInsertRowid;
  const reportProgress = (m) => { console.log('[Backup]', m); progressCb?.(m); };

  try {
    reportProgress('Ensuring binaries...');
    await ensureBinaries(progressCb);

    reportProgress('Refreshing access token...');
    await refreshAccessToken(account);

    writeRcloneConfig();

    reportProgress('Ensuring restic repository...');
    await ensureRepoExists(account);

    const env = makeEnv(account);

    // Backup data dir.
    // wwa-session = WhatsApp Web browser session (locked files, can re-auth) — exclude entirely.
    // *.log       = PM2 logs, not worth backing up.
    // exit 3      = restic partial success (some files skipped) — treat as OK.
    reportProgress('Running backup...');
    const out = await spawnAsync(resticPath(), [
      '-r', repoArg(account),
      'backup',
      '--json',
      '--exclude', path.join(DATA_DIR, 'wwa-session'),
      '--exclude', '*.log',
      DATA_DIR,
    ], { env }, [0, 3]);  // 3 = "incomplete, but snapshot created"

    let snapshotId = null, bytesAdded = 0, filesAdded = 0;
    for (const line of out.stdout.split('\n')) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        if (j.message_type === 'summary') {
          snapshotId = j.snapshot_id;
          bytesAdded = j.data_added || 0;
          filesAdded = j.files_new || 0;
        }
      } catch {}
    }

    // Auto-prune (keep 30 daily, 12 weekly, 12 monthly)
    reportProgress('Pruning old snapshots...');
    try {
      await spawnAsync(resticPath(), [
        '-r', repoArg(account),
        'forget', '--prune',
        '--keep-daily', '30',
        '--keep-weekly', '12',
        '--keep-monthly', '12',
      ], { env }, [0, 3]);
    } catch (e) {
      console.warn('[Backup] Prune skipped:', e.message);
    }

    db.prepare(`UPDATE backup_log SET finished_at=CURRENT_TIMESTAMP, status='success', bytes_added=?, files_added=?, snapshot_id=? WHERE id=?`)
      .run(bytesAdded, filesAdded, snapshotId, logId);
    db.prepare(`UPDATE backup_accounts SET last_backup_at=CURRENT_TIMESTAMP, last_backup_status='success', last_snapshot_id=?, last_backup_error=NULL, bytes_total=bytes_total+? WHERE id=?`)
      .run(snapshotId, bytesAdded, accountId);

    reportProgress(`Backup complete: ${snapshotId} (+${(bytesAdded / 1024).toFixed(1)} KB)`);
    return { ok: true, snapshotId, bytesAdded, filesAdded };
  } catch (e) {
    db.prepare(`UPDATE backup_log SET finished_at=CURRENT_TIMESTAMP, status='error', error=? WHERE id=?`)
      .run(e.message, logId);
    db.prepare(`UPDATE backup_accounts SET last_backup_status='error', last_backup_error=? WHERE id=?`)
      .run(e.message, accountId);
    console.error('[Backup] Failed:', e.message);
    throw e;
  } finally {
    _backupRunning = false;
  }
}

// ─── Account management ────────────────────────────────────────────────
export function listAccounts() {
  return db.prepare(`
    SELECT id, email, is_active, last_backup_at, last_backup_status, last_backup_error,
           last_snapshot_id, bytes_total, created_at
    FROM backup_accounts ORDER BY id DESC
  `).all();
}

export function setActiveAccount(id) {
  const a = db.prepare('SELECT id FROM backup_accounts WHERE id = ?').get(id);
  if (!a) throw new Error('Account not found');
  db.prepare('UPDATE backup_accounts SET is_active = 0').run();
  db.prepare('UPDATE backup_accounts SET is_active = 1 WHERE id = ?').run(id);
  return { ok: true };
}

export async function unlinkAccount(id) {
  const a = db.prepare('SELECT * FROM backup_accounts WHERE id = ?').get(id);
  if (!a) throw new Error('Account not found');
  // Best-effort: revoke the OAuth token at Google
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(a.refresh_token)}`, { method: 'POST' });
  } catch {}
  db.prepare('DELETE FROM backup_accounts WHERE id = ?').run(id);
  writeRcloneConfig();
  return { ok: true, password: a.restic_password };  // return password one final time
}

export function revealPassword(id) {
  const a = db.prepare('SELECT restic_password FROM backup_accounts WHERE id = ?').get(id);
  if (!a) throw new Error('Account not found');
  return a.restic_password;
}

export function getRecentLog(limit = 30) {
  return db.prepare(`
    SELECT bl.*, ba.email
    FROM backup_log bl
    LEFT JOIN backup_accounts ba ON ba.id = bl.account_id
    ORDER BY bl.id DESC LIMIT ?
  `).all(limit);
}

// ─── Scheduler ─────────────────────────────────────────────────────────
let _schedulerStarted = false;

export function startScheduler() {
  if (_schedulerStarted) return;
  _schedulerStarted = true;
  setTimeout(maybeAutoBackup, 60_000);            // 1 min after startup
  setInterval(maybeAutoBackup, 4 * 60 * 60 * 1000); // every 4h thereafter
  console.log('[Backup] Scheduler started');
}

async function maybeAutoBackup() {
  try {
    const active = db.prepare('SELECT * FROM backup_accounts WHERE is_active = 1').get();
    if (!active) return;
    const last = active.last_backup_at ? new Date(active.last_backup_at).getTime() : 0;
    const hoursSince = (Date.now() - last) / 3_600_000;
    if (hoursSince < 20) return;
    console.log(`[Backup] Auto-running scheduled backup (${hoursSince.toFixed(1)}h since last)`);
    await runBackup(active.id);
  } catch (e) {
    console.error('[Backup] Auto-backup failed:', e.message);
  }
}

// Expose redirect URI so server can register the route at the same path
export const BACKUP_REDIRECT_URI = REDIRECT_URI;
