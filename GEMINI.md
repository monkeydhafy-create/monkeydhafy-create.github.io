# Gemini / Antigravity Workspace Rules (`engbbq-open-world`)

Tuân thủ **100%** các quy tắc trong [`AGENTS.md`](./AGENTS.md), đặc biệt:

1. **Mọi dữ liệu lưu của người chơi bắt buộc đi qua [`src/security/SaveVault.ts`](./src/security/SaveVault.ts)** (`IndexedDB` + non-extractable `AES-256-GCM` + `HMAC-SHA-256` + `SHA-256` digest + anti-rollback `seq_anchor` + `validateSavePayload`).
2. **Nghiêm cấm** sử dụng `localStorage`, `sessionStorage`, `document.cookie` hoặc đọc/ghi `indexedDB` trực tiếp ngoài `SaveVault.ts`.
3. Mọi trường dữ liệu lưu trữ mới **bắt buộc** phải bổ sung validation ràng buộc chặt chẽ trong `validateSavePayload()` (`strict = true`) và cập nhật `WorldScene.getSaveSnapshot()`.
4. Luôn chạy `npm run verify:security` và `npm run build` (`check-save-architecture.mjs && oxlint && tsc && vite build`) đạt 0 lỗi, 0 cảnh báo sau mỗi lần chỉnh sửa.
