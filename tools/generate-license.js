#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// AutoShop Pro — License Generator
// KEEP THIS FILE AND THE PRIVATE KEY PRIVATE. DO NOT SHARE OR COMMIT.
// ─────────────────────────────────────────────────────────────────────────────
//
// Usage:
//   node generate-license.js <machine_id> "<client name>"
//
// Example:
//   node generate-license.js a1b2c3d4e5f6... "Al-Rashid Auto Workshop"
//
// To get a machine's ID, run this on the target PC:
//   node -e "import('./server/license.js').then(m => console.log(m.getMachineId()))" --input-type=module
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'node:crypto';
import fs from 'node:fs';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgku5eQ/XunLDu1Ue8
rVV/T8RQxc32jK/Wu+YllffmnAqhRANCAARzmdZySPKejkFVdr1XXaiOU+YOI4ZA
Bx2TmSysMW/obp4zNJXqLJ8ySkyPCesj0Xz6t7LqegKu0uWZh1WHKi51
-----END PRIVATE KEY-----`;

const [,, machineId, clientName] = process.argv;

if (!machineId || !clientName) {
  console.error('Usage: node generate-license.js <machine_id> "<client name>"');
  process.exit(1);
}

if (machineId.length !== 64) {
  console.error('Error: machine_id should be 64 hex characters (SHA-256 output).');
  process.exit(1);
}

const issued = new Date().toISOString().slice(0, 10);
const payload = `${machineId}|${clientName}|${issued}`;

const sign = crypto.createSign('SHA256');
sign.update(payload);
const sig = sign.sign(PRIVATE_KEY, 'base64');

const license = { machine: machineId, client: clientName, issued, sig };
const json = JSON.stringify(license, null, 2);

// Write to file
const outFile = `license-${clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.key`;
fs.writeFileSync(outFile, json);

console.log('\n✅ License generated!\n');
console.log(json);
console.log(`\nSaved to: ${outFile}`);
console.log('Send this file to the client as "license.key" in the project root.');
