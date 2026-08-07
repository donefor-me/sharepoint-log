# Kế hoạch Quy hoạch lại Kiến trúc Backend (Modular DDD)

## Mục tiêu (Goal Description)
Refactor cấu trúc thư mục và kiến trúc module của hệ thống Backend NestJS dựa theo định hướng trong tài liệu `refactor.md`. Mục tiêu chính là:
1. Tách biệt rõ ràng các tầng **Core** (hạ tầng bootstrap), **Common** (tiện ích stateless) và **Modules** (nghiệp vụ).
2. Gom nhóm các module có liên quan chặt chẽ với nhau (như Sharepoint, Audit Log Sync, Dashboard) thành một Bounded Context chung là `sharepoint`.
3. Giải quyết tình trạng phân tán logic (như Tasks nằm rời khỏi Module) và Exceptions của nghiệp vụ bị đặt nhầm vào tầng Common.
4. Tối ưu hóa cấu hình path alias trong `tsconfig.json` để source code gọn gàng, hạn chế đường dẫn tương đối dài.

---

## Phương án giải quyết các vấn đề kỹ thuật (Technical Decisions)

Sau khi đọc codebase, tôi đã xác định được tình trạng hiện tại và đưa ra phương án xử lý như sau:

1. **Về cấu trúc Bounded Context "SharePoint"**: 
   - Sẽ **Gom lồng 3 module vào trong folder `src/modules/sharepoint/`** (`integration`, `audit-log-sync`, `dashboard`). Việc này thể hiện đúng tính chất Domain-Driven Design (DDD).

2. **Về Path Alias (`tsconfig.json`)**: 
   - Hiện tại `tsconfig.json` đã có sẵn `@common`, `@modules`, `@utils`, `@config`.
   - **Phương án**: Sẽ cấu hình lại thành:
     - `@core/*`: `["src/core/*"]`
     - `@common/*`: `["src/common/*"]`
     - `@modules/*`: `["src/modules/*"]`
     - Xóa bỏ `@utils` và `@config` do chúng sẽ được gộp vào `common` và `core`.

3. **Về cấu hình TypeORM Entities**:
   - Hiện tại file `src/database/database.module.ts` và `typeorm.config.ts` đang import tường minh (explicit array) từng entity class thay vì dùng chuỗi glob.
   - **Phương án**: Sau khi di chuyển (move) các file entity, sẽ cập nhật lại đường dẫn import (sử dụng alias `@modules/...`) thủ công trong cả 2 file này. Không chuyển qua dùng chuỗi glob để giữ độ an toàn và tường minh theo chuẩn NestJS hiện tại.

4. **Về ESLint Boundary Rule**:
   - Dự án đang sử dụng ESLint Flat Config (`eslint.config.mjs`) nhưng chưa cài đặt `eslint-plugin-boundaries`.
   - **Phương án**: Bỏ qua việc cài đặt và cấu hình rule boundary trong đợt refactor này để tránh phức tạp hóa và rủi ro conflict config (vì hệ sinh thái ESLint v9 Flat config vẫn còn nhiều plugin chưa tương thích tốt). Việc enforcing module boundary tạm thời sẽ dựa vào convention và code review.

---

## Các thay đổi đề xuất (Proposed Changes)

Quá trình refactor sẽ thực hiện theo 5 Phase.

### Phase 1: Cập nhật TSConfig Alias & Hợp nhất thư mục tiện ích (Utils)
Thêm alias `@core/*` và dọn dẹp các thư mục thừa thãi.
#### [MODIFY] `tsconfig.json` (Cập nhật `paths`)
#### [NEW] `src/common/utils/array.util.ts`
#### [NEW] `src/common/utils/date.util.ts`
#### [NEW] `src/common/utils/http-retry.util.ts`
#### [DELETE] `src/utils/`

---

### Phase 2: Dọn dẹp `common/` (Domain-specific Exceptions & Guards)
Common không được chứa logic nghiệp vụ đặc thù.
#### [MODIFY] `src/common/exceptions/encryption.exception.ts` -> Chuyển sang `src/modules/encryption/exceptions/`
#### [MODIFY] `src/common/exceptions/sharepoint-api.exception.ts` -> Chuyển sang `src/modules/sharepoint/exceptions/` (được tạo ở Phase 4)
#### [MODIFY] `src/common/guards/auth.guard.ts` -> Chuyển sang `src/modules/auth/guards/`

---

### Phase 3: Gom logic Tasks về đúng Domain
Tasks không nên bị xé lẻ ở ngoài root mà cần nằm cạnh logic của nó.
#### [MODIFY] `src/tasks/audit-log-sync.task.ts` -> Chuyển sang `src/modules/audit-log-sync/tasks/audit-log-sync.task.ts`
#### [DELETE] `src/tasks/`

---

### Phase 4: Thiết lập Bounded Context "SharePoint"
Đưa các module liên quan vào chung.
#### [MODIFY] `src/modules/sharepoint/` (chứa core auth integration) -> Đổi thành `src/modules/sharepoint/integration/`
#### [MODIFY] `src/modules/audit-log-sync/` -> Đổi thành `src/modules/sharepoint/audit-log-sync/`
#### [MODIFY] `src/modules/sharepoint-dashboard/` -> Đổi thành `src/modules/sharepoint/dashboard/`
#### [MODIFY] `src/config/sharepoint.config.ts` -> Đổi thành `src/modules/sharepoint/config/sharepoint.config.ts`

---

### Phase 5: Tách `core/` khỏi `common/` và Root
Đưa hạ tầng singleton vào `core/`.
#### [MODIFY] `src/config/` (trừ sharepoint.config) -> Chuyển thành `src/core/config/`
#### [MODIFY] `src/database/` -> Chuyển thành `src/core/database/`
#### [MODIFY] `src/common/logger/` -> Chuyển thành `src/core/logger/`
#### [MODIFY] `src/common/http-client/` -> Chuyển thành `src/core/http-client/`

---

## Kế hoạch Kiểm chứng (Verification Plan)

### Automated Tests
Cần chạy script sau để kiểm tra code compile thành công, pass toàn bộ test case (đặc biệt là E2E test cho logic Sync phức tạp).
```bash
# Sau mỗi Phase
npm run build
npm run lint

# Sau khi xong toàn bộ
npm run test:e2e
```

### Manual Verification
1. Mở ứng dụng bằng `npm run start:dev` để kiểm tra DI (Dependency Injection) khởi tạo chính xác.
2. Kiểm tra DB Migration thông qua script `npm run db:migration:generate` xem có tạo file rỗng không (để khẳng định TypeORM vẫn trỏ đúng tới entity).
3. Sử dụng IDE (VS Code) kiểm tra tính hợp lệ của các path aliases `@core`, `@common`, `@modules`.
