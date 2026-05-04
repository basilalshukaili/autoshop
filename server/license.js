// License verification — machine-locked, ECDSA P-256 signed.
// The private key is held only by the developer.
// This module runs at startup and exits the process if the license is missing or invalid.

import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Developer public key (embedded — cannot generate valid licenses without private key) ───
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEc5nWckjyno5BVXa9V12ojlPmDiOG
QAcdk5ksrDFv6G6eMzSV6iyfMkpMjwnrI9F8+rey6noCrtLlmYdVhyoudQ==
-----END PUBLIC KEY-----`;

// ─── Machine fingerprint ────────────────────────────────────────────────
// Combines hostname + first physical MAC address → SHA-256 hex.
// Changing the machine (or cloning to another PC) will break the license.
export function getMachineId() {
  const hostname = os.hostname();
  const nets = os.networkInterfaces();
  const macs = [];
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        macs.push(iface.mac.toLowerCase());
      }
    }
  }
  macs.sort();
  const raw = `${hostname}|${macs[0] || 'none'}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ─── License check (called once at server startup) ─────────────────────
export function checkLicense() {
  const licPath = path.join(__dirname, '..', 'license.key');

  if (!fs.existsSync(licPath)) {
    console.error('\n[License] ❌ No license file found (license.key).');
    console.error('[License]    Contact the developer to obtain a license.');
    console.error('[License]    Machine ID:', getMachineId());
    process.exit(1);
  }

  let lic;
  try {
    lic = JSON.parse(fs.readFileSync(licPath, 'utf8'));
  } catch {
    console.error('[License] ❌ License file is corrupted or invalid JSON.');
    process.exit(1);
  }

  const machineId = getMachineId();

  if (!lic.machine || !lic.client || !lic.issued || !lic.sig) {
    console.error('[License] ❌ License file is missing required fields.');
    process.exit(1);
  }

  if (lic.machine !== machineId) {
    console.error('[License] ❌ License is not valid for this machine.');
    console.error('[License]    Licensed machine:', lic.machine.slice(0, 16) + '...');
    console.error('[License]    This machine:    ', machineId.slice(0, 16) + '...');
    console.error('[License]    Contact the developer to transfer the license.');
    process.exit(1);
  }

  // Verify developer signature
  const payload = `${lic.machine}|${lic.client}|${lic.issued}`;
  let valid = false;
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(payload);
    valid = verify.verify(PUBLIC_KEY, lic.sig, 'base64');
  } catch {
    valid = false;
  }

  if (!valid) {
    console.error('[License] ❌ License signature is invalid (tampered or forged).');
    process.exit(1);
  }

  console.log(`[License] ✓ Valid — ${lic.client} (issued ${lic.issued})`);
}
