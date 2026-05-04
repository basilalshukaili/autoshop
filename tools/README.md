# ⚠️ DEVELOPER TOOLS — REMOVE BEFORE CLIENT DEPLOYMENT

This folder contains the license key generator including the private signing key.

**DELETE this entire `tools/` folder before handing the project to a client.**

## Generate a license key

Run this from the `tools/` folder:

```bat
node generate-license.js <machine_id> "Client Name"
```

This creates a `license-....key` file. Rename it to `license.key` and send to the client.

## Get a machine's ID

Run this on the target PC from inside the `autoshop/server/` folder:

```bat
node --input-type=module -e "import { getMachineId } from './license.js'; console.log(getMachineId());"
```
