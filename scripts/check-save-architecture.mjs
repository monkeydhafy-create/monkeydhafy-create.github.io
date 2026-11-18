import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const SAVE_VAULT_REL = `src${sep}security${sep}SaveVault.ts`.replaceAll("\\", "/");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(ts|tsx|js|mjs|mts)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
let checkedFiles = 0;

for (const file of walk(SRC_DIR)) {
  checkedFiles += 1;
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const code = readFileSync(file, "utf8");

  // Never allow writing save state to plaintext Web Storage anywhere in src/
  if (/(?:localStorage|sessionStorage)\s*\.\s*setItem\b/.test(code)) {
    violations.push(`${rel}: forbidden plaintext setItem on localStorage/sessionStorage (see AGENTS.md)`);
  }

  if (rel !== SAVE_VAULT_REL) {
    if (/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(code)) {
      violations.push(`${rel}: direct browser storage API usage outside ${SAVE_VAULT_REL}`);
    }
    if (/document\s*\.\s*cookie\b/.test(code)) {
      violations.push(`${rel}: direct document.cookie access is forbidden for game state`);
    }
    if (code.includes("openworld_delta_inv_v2")) {
      violations.push(`${rel}: legacy plaintext storage key referenced outside ${SAVE_VAULT_REL}`);
    }
  } else {
    if (/generateKey\([^)]*,\s*true\b/.test(code) || /extractable\s*:\s*true/.test(code)) {
      violations.push(`${rel}: CryptoKey extractable MUST remain false`);
    }
    if (!code.includes("AES-GCM") || !code.includes("HMAC") || !code.includes("SHA-256")) {
      violations.push(`${rel}: SaveVault must keep AES-GCM, HMAC, and SHA-256 integrity checks`);
    }
    if (!code.includes("validateSavePayload")) {
      violations.push(`${rel}: validateSavePayload invariant gate missing`);
    }
  }
}

if (violations.length > 0) {
  console.error("❌ SaveVault Security Architecture Check Failed:");
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
}

console.log(`✅ SaveVault security guard passed (${checkedFiles} source files verified).`);
