# AutoShop Pro — Deployment Guide

## Requirements
- Windows 10 or 11
- Internet connection during setup
- Chrome browser

---

## Step 1 — Install Node.js

Download and install the **LTS version** from https://nodejs.org

Click Next through all defaults. When done, open **Command Prompt** and verify:
```bat
node --version
```
Should print something like `v24.x.x`.

---

## Step 2 — Install Git (if not already installed)

Download from https://git-scm.com and install with default options.

---

## Step 3 — Clone the project

Open **Command Prompt** and run:
```bat
cd C:\Users\%USERNAME%\Desktop
git clone https://github.com/basilalshukaili/autoshop.git
cd autoshop
```

---

## Step 4 — Install dependencies and build

```bat
npm install
npm run install:all
npm run build:client
```

This takes 1–2 minutes.

---

## Step 5 — Get the Machine ID

Run this inside the `autoshop` folder:
```bat
cd server
node --input-type=module -e "import { getMachineId } from './license.js'; console.log(getMachineId());"
cd ..
```

Copy the 64-character code that appears and **send it to Basil (+968 94639405)**.

---

## Step 6 — Place the license file

Wait for Basil to send a `license.key` file.

Place it here:
```
C:\Users\<username>\Desktop\autoshop\license.key
```

---

## Step 7 — Install PM2 (process manager)

```bat
npm install -g pm2
```

---

## Step 8 — Start the server

```bat
pm2 start ecosystem.config.cjs
pm2 save
```

---

## Step 9 — Auto-start on Windows login

Open **PowerShell** (search for it in Start menu) and paste this entire block:

```powershell
$vbs = "Set WshShell = CreateObject(`"WScript.Shell`")`nWshShell.Run `"cmd.exe /c cd /d `"`"`"C:\Users\$env:USERNAME\Desktop\autoshop`"`"`" && pm2 resurrect`", 0, False"
$vbs | Set-Content "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\autoshop-server.vbs"
```

The server will now start silently every time Windows starts.

---

## Step 10 — Open the app

Open **Chrome** and go to:
```
http://localhost:3000
```

Bookmark it or create a desktop shortcut.

---

## Updating the app

When a new version is available, open Command Prompt in the autoshop folder and run:
```bat
git pull
npm run install:all
npm run build:client
pm2 restart autoshop
```

---

## Useful commands

| Command | What it does |
|---|---|
| `pm2 list` | Check if server is running |
| `pm2 logs autoshop` | View live server logs |
| `pm2 restart autoshop` | Restart the server |
| `pm2 stop autoshop` | Stop the server |

---

## Troubleshooting

**App doesn't open in browser**
→ Open Command Prompt and run `pm2 list` — status should say `online`
→ If not, run `pm2 start ecosystem.config.cjs`

**License error on startup**
→ Make sure `license.key` is in the `autoshop` folder (not inside a subfolder)
→ Contact Basil if the machine was changed or reinstalled

**WhatsApp disconnected**
→ Open the app → Settings → reconnect WhatsApp by scanning the QR code
