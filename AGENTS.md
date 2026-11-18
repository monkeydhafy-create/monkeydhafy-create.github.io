# Repository Engineering & Security Rules (`engbbq-open-world`)

Mọi chỉnh sửa, tính năng mới hoặc bản vá trong repository này **BẮT BUỘC** phải tuân thủ nghiêm ngặt các quy tắc dưới đây. Cả con người và AI coding agents phải kiểm tra tuân thủ trước khi hoàn tất thay đổi.

---

## 1. Hệ thống Lưu trữ & Mã hóa Dữ liệu Người chơi (`SaveVault`) — BẮT BUỘC

Nguồn chân lý duy nhất cho toàn bộ dữ liệu lưu của người chơi là [`src/security/SaveVault.ts`](src/security/SaveVault.ts).

### Các điều TUYỆT ĐỐI CẤM (Hard Prohibitions)
1. **KHÔNG** gọi `localStorage`, `sessionStorage`, `indexedDB`, hoặc `document.cookie` ở bất kỳ file nào trong `src/` ngoài `src/security/SaveVault.ts`.
2. **KHÔNG** gọi `localStorage.setItem` hoặc `sessionStorage.setItem` ở bất kỳ file nào (kể cả trong `SaveVault.ts` — chỉ được phép đọc và xóa key cũ `openworld_delta_inv_v2` một lần duy nhất khi migrate).
3. **KHÔNG** lưu trạng thái người chơi (vàng, vật phẩm, vị trí, rương, cấu hình) dưới dạng JSON thuần, Base64 thuần, hoặc gắn biến debug lên `window.*`.
4. **KHÔNG** đổi `extractable: false` thành `extractable: true` khi tạo/lưu `CryptoKey` cho `AES-GCM` hoặc `HMAC` trong `SaveVault.ts`.
5. **KHÔNG** gỡ bỏ bất kỳ lớp bảo vệ nào trong quy trình đọc/ghi của `SaveVault`:
   - Mã hóa `AES-256-GCM` với IV ngẫu nhiên 96-bit mới trên mỗi lần ghi và `AAD` gắn theo `origin + schema + seq + savedAt`.
   - Ký xác thực `HMAC-SHA-256` theo thứ tự **Encrypt-then-MAC** (`verify` HMAC trước khi `decrypt`).
   - Checksum nội bộ `SHA-256` trên canonical JSON (`canonicalJson`) trước mã hóa và đối chiếu lại sau giải mã.
   - Chốt chống quay lui (`seq_anchor`) đơn điệu tăng dần ghi đồng bộ trong cùng transaction `IndexedDB` (`IDBTransaction`).
   - Chặn hạ cấp thuật toán từ `"webcrypto"` xuống `"lan-fallback"` trong môi trường Secure Context (`https://` hoặc `localhost`).

### Xử lý khi phát hiện can thiệp (Tamper Policy)
- Nếu HMAC sai, AES-GCM tag sai, `seq` bị rollback, AAD lệch origin, hoặc `validateSavePayload` phát hiện vi phạm:
  - **TUYỆT ĐỐI KHÔNG** cố vớt/nhập dữ liệu nghi vấn vào game.
  - Bắt buộc xóa sạch dữ liệu sai hỏng, khởi tạo trạng thái sạch hợp lệ mới ở `seq` kế tiếp và thông báo cảnh báo cho người dùng.

---

## 2. Quy tắc Mở rộng Schema & Ràng buộc Nghiệp vụ (`validateSavePayload`)

Khi thêm bất kỳ dữ liệu lưu trữ mới nào (tiền tệ, chỉ số nhân vật, nhiệm vụ, vật phẩm mới, cài đặt):
1. Cập nhật đầy đủ type `PlayerGameSaveV3` (hoặc nâng `schemaVersion` kèm hàm migrate rõ ràng) trong `src/security/SaveVault.ts`.
2. Cập nhật `createDefaultGameSave()` và `WorldScene.getSaveSnapshot()` để dữ liệu mới được thu thập đồng bộ vào đúng 1 bản snapshot duy nhất.
3. **Bắt buộc** bổ sung kiểm tra bất biến (invariants) trong `validateSavePayload()` với `strict = true`:
   - Kiểm tra kiểu dữ liệu, giới hạn min/max (`Number.isInteger`, ngưỡng trần hợp lý), enum hợp lệ.
   - Mọi `itemId` và `backpackId` phải tồn tại trong catalog (`ITEM_BY_ID`, `BACKPACK_BY_ID`).
   - Mọi vật phẩm trên lưới phải kiểm tra không vượt biên và không chồng chéo (`canPlaceOnGrid`).
   - Mọi container loot phải kiểm tra `CONTAINER_REFRESH_RULES` (không chấp nhận `refreshAt` quá hạn mức tối đa hoặc âm).
   - Chỉ số sinh tồn (`survival.hp`, `survival.hunger` trong `[0..100]`, `survival.stamina` trong `[0..100 + staminaBuff.boostPct]`, `survival.staminaBuff` với `boostPct <= 80` và hạn mức `expiresAt <= now + 660_000`, `survival.bodyTempC` trong `[33.5..41.5]`), trang bị (`equipment` chỉ chứa `GarmentDef` hợp lệ và đúng `slot`), kiểu tóc (`hairId` phải nằm trong `ownedHairIds`), giới tính (`profile.gender` là `"male" | "female"`), Kho Nhà (`inventory.homeItems` trên lưới `8×6`) và trạng thái Cảnh sát (`policeState.detainedUntil <= now + 65_000`, `ignoreUntilByOfficer[id] <= now + 610_000`, `pendingArrestOfficerId`) bắt buộc phải qua kiểm tra trong `validateSavePayload()`.
4. `LootSystem.ts` (`InventoryManager`) phải luôn giữ tách biệt khỏi tầng lưu trữ vật lý — chỉ phát tín hiệu `onPersist`, không tự đọc/ghi storage.

---

## 3. Giới hạn Kiến trúc Client-Side vs Server-Authoritative

- Hiện tại dự án deploy tĩnh lên GitHub Pages (`.github/workflows/deploy.yml`). `SaveVault` dùng Web Crypto (`extractable: false`) + IndexedDB giúp ngăn chặn chỉnh sửa trực tiếp qua `localStorage`, ngăn bit-flip, ngăn rollback snapshot và phát hiện dữ liệu phi logic.
- **Quy tắc nâng cấp tương lai**: Nếu sau này bổ sung tính năng cạnh tranh online (bảng xếp hạng, giao dịch giữa người chơi, PvP, nạp/mua bán tiền thật), **BẮT BUỘC** phải kết nối backend qua `VaultRemoteSyncAdapter` để máy chủ giữ khóa bí mật và xác thực toàn bộ biến động tài sản (server-authoritative); không bao giờ tin cậy kết quả từ client đơn thuần cho tính năng online.

---

## 4. Quy tắc Gameplay & UI Cốt lõi

- Không cho phép vứt vật phẩm ra ngoài lưới (chỉ kéo thả giữa Balo ↔ Nơi tìm kiếm / Thùng rác).
- Lần đầu mở nơi tìm kiếm phải giấu vật phẩm (`revealed: false`), rải vị trí ngẫu nhiên trên lưới `6×6`, và quét tuần tự từ phải qua trái theo thời gian `getItemSearchDurationMs`.
- Thời gian tự động xóa đồ cũ & làm mới container: Thùng rác `30 phút`, Rương `45 phút`, Tòa nhà `1–2 tiếng`.
- Cơ chế sinh tồn (`SurvivalSystem`): luôn gắn chặt giữa đói, mệt mỏi, di chuyển/dừng nghỉ, nhiệt độ thời tiết thực (`nắng/nóng`, `lạnh/gió/mưa`), chỉ số trang bị và hồi sinh đưa về trước `Bệnh Viện Thành Phố` (`hospitalRespawn`) khi ngất.

---

## 5. Cổng Kiểm tra Bắt buộc Trước Khi Kết thúc Mọi Thay đổi

Mọi chỉnh sửa đều phải chạy và vượt qua **0 cảnh báo, 0 lỗi**:
```bash
npm run verify:security
npm run build
```
Lệnh `npm run build` tự động chạy `scripts/check-save-architecture.mjs` + `oxlint` + `tsc` + `vite build`. Không được bỏ qua hoặc vô hiệu hóa các bước kiểm tra này.
