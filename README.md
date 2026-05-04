# AutoShop Pro

Garage management platform for the Sultanate of Oman. Bilingual (English / العربية), runs entirely on a single Windows PC, all tablets connect over Wi-Fi.

**Powered by Basil Al Shukaili** · +968 94639405 · basilalshukaili@gmail.com

---

## What's inside

* Customers · Vehicles · Work Orders · Parts · Suppliers · Invoices · Expenses
* Waitlist · Part Returns · Notifications · Reports · Audit Log · Backups
* PIN-based tablet quick-switch for shared devices (4-digit PINs, 90-second auto-lock)
* Bilingual UI (EN/AR) with full RTL support and dark/light theme
* Auto-invoice on work-order close with 5% Oman VAT
* Customer job-tracker link (no login needed) for WhatsApp share
* Vehicle damage checklist with customer signature capture
* Color-coded status board and global search (Ctrl+K)
* Soft delete + audit log + manager-approved permanent deletes
* SQLite database (single file) with one-click backup

---

## Stack

* **Backend** — Node.js + Express, single file `server/index.js`
* **Database** — SQLite via Node's built-in `node:sqlite` module (no native build required)
* **Frontend** — React 18 + Vite, served as static files by the same Node process
* **One process, one port** — http://localhost:3000

---

## First-time install (Windows)

1. **Install Node.js 22 or newer** from https://nodejs.org if not already installed.
2. Double-click `install.bat` — it installs server + client deps and builds the UI.
3. Double-click `start.bat` to launch the server.
4. Open http://localhost:3000 in any browser.

> If you get a Windows firewall prompt the first time, click **Allow access** so other devices on the shop Wi-Fi can reach the server.

---

## Demo accounts

| Worker  | Role         | PIN  |
| ------- | ------------ | ---- |
| Basil   | Owner        | 0000 |
| Ahmed   | Manager      | 1234 |
| Khalid  | Technician   | 5678 |
| Sara    | Receptionist | 9012 |
| Faisal  | Technician   | 3456 |

Change PINs from each worker's profile or under **Staff** (Owner only).

---

## Daily use

| Action | Where |
| ------ | ----- |
| New work order | `+ New Work Order` from sidebar or dashboard |
| Mark ready, send WhatsApp | Open the WO → "Send via WhatsApp" |
| Close & invoice | "Close & Generate Invoice" — VAT is added automatically |
| Print invoice | Open invoice → 🖨 Print Invoice (uses customer's preferred language) |
| Print job card | Open WO → 🖨 Print Job Card |
| Adjust stock | Parts page → ± Adjust Stock |
| Manual backup | Backups page → Backup Now (or `backup.bat`) |
| Switch user (90s idle auto) | Click ⏏ in the top bar |

---

## Connecting tablets, TV, and printer (LAN)

1. Plug the PC into the shop router via Ethernet.
2. Note the PC's local IP. From the start banner you saw `Network: http://<your-ip>:3000`.
   *(In our setup it was 192.168.10.229 — yours may differ.)*
3. On each tablet/TV:
   * Open Chrome → go to `http://<your-ip>:3000`
   * Tap menu → **Add to Home Screen** so it opens like an app.
4. The TV can be left on http://<your-ip>:3000/work-orders in fullscreen as a live job board.
5. Set a **static IP** for the PC on the router so the address never changes.

---

## Auto-start on boot (optional)

To make the server launch automatically when Windows starts:

1. Right-click PowerShell → **Run as Administrator**.
2. `cd "C:\Users\basil\Share\Garage\autoshop"`
3. `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force`
4. `.\install-autostart.ps1`

Removes itself with `schtasks /delete /tn AutoShopPro /f`.

---

## Backups

* `data/garage.db` is the only file you need to back up.
* The Backups page (Owner only) and `backup.bat` create timestamped copies in `backups/`.
* **Recommended:** point Google Drive / OneDrive at the `backups/` folder so every snapshot syncs to the cloud automatically (this is the only outbound internet usage besides WhatsApp links).

---

## Moving to the Garage PC

The whole installation is one folder — no system services, no global installs.

1. On the Garage PC, install Node.js 22+.
2. Copy the entire `autoshop/` folder over (USB stick, network share, or `scp`).
3. Double-click `install.bat` once.
4. Double-click `start.bat`.
5. (Optional) Run `install-autostart.ps1` for boot launch.

If you want to migrate live data:

* Copy `data/garage.db` from the dev PC into the same path on the Garage PC.
* The schema migrates itself on next start; existing rows are preserved.

---

## Settings to update for production

In **Settings** (Owner / Manager):

* Shop Name (EN/AR), Address, Phone, Email
* VAT Number (your shop's VAT registration with Oman Tax Authority)
* VAT Rate (default 0.05 = 5% — already set for Oman)
* Default Labor Rate
* Idle Lock seconds (default 90)

---

## Architecture map (vs. the v4.2 spec)

| Spec section | Implemented as |
| ------------ | -------------- |
| 01 Entity Hub | SQL schema in `server/db.js` (8 entities + audit + notifications + waitlist) |
| 02 Tablet Quick-Switch | `client/src/Login.jsx` — avatar grid + 4-digit PIN + 90s auto-lock via `useAutoLock` |
| 03 UX For Everyone | Global search (Ctrl+K), color-coded status board, soft-delete, toast notifications, smart defaults (labor rate, customer language) |
| 04 Smart Automations | Auto-invoice on close, low-stock detection, WhatsApp queueing on completion, VAT auto-calc, idle auto-lock |
| 05 New Features | Job priority, customer tracker link, damage checklist + signature, printable job card + invoice, 1–5 star rating, part-return tracking, waitlist, expense tracking, service-interval tracking, bilingual invoices, estimate vs actual |
| 06 Bilingual & Theme | `client/src/i18n.js` (EN/AR), `client/src/theme.js` (dark/light), per-user theme + lang stored on each worker |
| 07 User Roles | Server-side role gates on writes (Owner / Manager / Receptionist / Technician). Owner-only sections: Staff, Backups, permanent deletes. Sidebar shows only allowed pages per role |
| 08 Network & Setup | This README. Single Node process, one port, LAN-only by default. Internet is used only for outbound WhatsApp links and (optional) Drive/OneDrive sync of backups |

---

## File map

```
autoshop/
├── server/
│   ├── index.js        # Express + REST API
│   ├── db.js           # SQLite schema + seed data
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx           # router + sidebar + auto-lock
│   │   ├── Login.jsx         # PIN quick-switch
│   │   ├── GlobalSearch.jsx  # Ctrl+K palette
│   │   ├── theme.js i18n.js api.js ui.jsx
│   │   └── pages/            # one file per module
│   ├── dist/                 # built bundle (served by Node)
│   └── package.json
├── data/
│   └── garage.db       # all your data, one file
├── backups/            # snapshot files (sync this to cloud)
├── start.bat           # launch the server
├── install.bat         # one-time install
├── backup.bat          # quick manual backup
└── install-autostart.ps1
```

---

## Troubleshooting

* **`npm install` fails with VS errors** — already handled. We use Node's built-in `node:sqlite`, no native compilation.
* **Port 3000 already in use** — set a different port: `set PORT=8080 & start.bat`.
* **Tablet can't reach the PC** — check Windows firewall (allow Node.js inbound on private network), and that the PC has a static LAN IP.
* **WhatsApp button does nothing** — make sure the customer's phone number includes the country code (e.g. `+968 9...`). The button opens `wa.me/<phone>?text=...` in a new tab.
* **Forgot Owner PIN** — open `data/garage.db` with [DB Browser for SQLite](https://sqlitebrowser.org/), update `workers.pin_hash` with bcrypt hash of new pin (or just delete the DB and let demo data reseed).

---

© 2026 — Powered by Basil · Basil Al Shukaili · +968 94639405 · basilalshukaili@gmail.com
