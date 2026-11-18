# Copilot & PR Guidelines (`engbbq-open-world`)

Follow all rules defined in [`AGENTS.md`](../AGENTS.md):

- Never access `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` outside `src/security/SaveVault.ts`.
- Never write save state via `localStorage.setItem` / `sessionStorage.setItem` anywhere in `src/`.
- Keep `extractable: false` on all Web Crypto `CryptoKey` instances and preserve Encrypt-then-MAC (`HMAC-SHA-256` + `AES-256-GCM`), canonical inner `SHA-256` digest, and monotonic `seq_anchor` anti-rollback checks.
- Any new persisted field must be reflected in `PlayerGameSaveV3`, `WorldScene.getSaveSnapshot()`, and strictly validated in `validateSavePayload()`.
- Run `npm run verify:security` and `npm run build` before finalizing any change.
