# Đánh giá & Đề xuất Refactor Kiến trúc Backend NestJS

## 1. Đánh giá cấu trúc hiện tại

### Điểm tốt

- Package theo **feature module** (`modules/auth`, `modules/users`...) — đúng tinh thần NestJS, không package theo layer toàn cục.
- Tách `config`, `database`, `common` ra khỏi `modules` — có ý thức phân lớp.
- Mỗi module có `dto/`, `entities/`, `repositories/`, `constants/` riêng — encapsulation tốt ở cấp module.
- Naming file nhất quán: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.entity.ts`, `*.dto.ts`.
- Có `index.ts` barrel export theo module.
- Migrations tách riêng khỏi entity — hợp lý vì TypeORM migration là artifact của DB, không phải của domain.

### Code smell / vấn đề

| Vấn đề                                                                                                   | Chi tiết                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`tasks/` tách rời khỏi `modules/`**                                                                    | `audit-log-sync.task.ts` phụ thuộc chặt vào domain `audit-log-sync` nhưng lại nằm ở tầng root ngang hàng với `modules`. Vi phạm tính cohesion — logic của 1 module bị xé ra 2 nơi.                                                                                                             |
| **`common/exceptions` lẫn lộn cấp độ trừu tượng**                                                        | `app.exception.ts`, `domain.exception.ts`, `infrastructure.exception.ts` là exception _generic_ — đúng chỗ. Nhưng `encryption.exception.ts` và `sharepoint-api.exception.ts` là exception **domain-specific**, đặt trong `common` phá vỡ nguyên tắc "common không được biết về domain cụ thể". |
| **Không phân biệt `core` vs `common`**                                                                   | `config`, `database`, `common`, `http-client` (nằm trong common) đều là hạ tầng bootstrap 1 lần (singleton, global) — nên gom vào `core`. `common` nên chỉ chứa thứ _tái sử dụng, stateless_ (decorator, filter, pipe, util). Hiện tại 2 khái niệm bị trộn thành 1.                            |
| **`sharepoint`, `sharepoint-dashboard`, `audit-log-sync` là cùng 1 bounded context nhưng bị tách phẳng** | Cả 3 module đều xoay quanh domain "SharePoint" (auth token, sync audit log, dashboard đọc audit log) nhưng nằm ngang hàng với `auth`, `users` — mất tính phân cấp domain, khó nhận biết quan hệ phụ thuộc giữa chúng.                                                                          |
| **`sharepoint.config.ts` nằm ở `config/` gốc**                                                           | Đây là config đặc thù cho tích hợp SharePoint, không phải config toàn app (như `env.validation.ts`) — nên thuộc về domain `sharepoint`.                                                                                                                                                        |
| **Nội bộ module không đồng nhất layer**                                                                  | `audit-log-sync` có `sync-lock.service.ts` nằm rời ở root module (không rõ thuộc services/), trong khi `encryption` chỉ có 1 service phẳng, `users` có entity nhưng không có dto. Không sao nếu module nhỏ, nhưng thiếu convention rõ ràng khi module phình to.                                |
| **`common/guards/auth.guard.ts`**                                                                        | Nếu guard này gắn với JWT/session của `auth` module thì nó là domain logic, không phải shared generic guard — nên chuyển vào `modules/auth/guards/`. Chỉ giữ trong `common` nếu guard hoàn toàn generic (vd: `RolesGuard`, `ThrottleGuard`).                                                   |
| **`utils/` ở root, tách khỏi `common/`**                                                                 | Không sai, nhưng tạo thêm 1 "loại thư mục dùng chung" nữa cạnh `common` — nên gộp lại để chỉ có 1 nơi duy nhất chứa shared code.                                                                                                                                                               |
| **Thiếu `common/dto`**                                                                                   | Không thấy DTO dùng chung (pagination, response envelope) — khả năng cao đang bị duplicate ở từng module (`get-audit-logs.dto.ts` chẳng hạn có thể tái dùng pattern phân trang).                                                                                                               |

---

## 2. Cấu trúc thư mục đề xuất (Modular DDD)

```
src/
├── main.ts
├── app.module.ts
│
├── core/                                # Hạ tầng bootstrap, singleton, load 1 lần khi start app
│   ├── config/
│   │   ├── config.module.ts
│   │   └── env.validation.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   └── migrations/
│   │       └── ...
│   ├── logger/
│   │   ├── logger.module.ts
│   │   ├── logger.service.ts
│   │   └── logger.interceptor.ts
│   └── http-client/
│       ├── http-client.module.ts
│       └── http-client.service.ts
│
├── common/                              # Thuần shared-kernel: stateless, không biết domain
│   ├── decorators/
│   │   └── response-message.decorator.ts
│   ├── dto/
│   │   └── pagination-query.dto.ts
│   ├── exceptions/
│   │   ├── app.exception.ts
│   │   ├── domain.exception.ts
│   │   └── infrastructure.exception.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   └── roles.guard.ts               # chỉ guard thực sự generic
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   ├── interfaces/
│   │   └── api-response.interface.ts
│   ├── utils/
│   │   ├── array.util.ts
│   │   ├── date.util.ts
│   │   └── http-retry.util.ts
│   └── index.ts
│
└── modules/
    ├── auth/
    │   ├── guards/
    │   │   └── auth.guard.ts            # ← chuyển từ common vì gắn domain auth
    │   ├── dto/
    │   │   └── login.dto.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.module.ts
    │   └── index.ts
    │
    ├── users/
    │   ├── entities/
    │   │   └── user.entity.ts
    │   ├── users.service.ts
    │   ├── users.module.ts
    │   └── index.ts
    │
    ├── encryption/
    │   ├── constants/
    │   │   └── encryption.constant.ts
    │   ├── exceptions/
    │   │   └── encryption.exception.ts  # ← chuyển từ common
    │   ├── encryption.service.ts
    │   ├── encryption.module.ts
    │   └── index.ts
    │
    └── sharepoint/                      # ← Bounded context "SharePoint" gom 3 module cũ
        ├── config/
        │   └── sharepoint.config.ts     # ← chuyển từ config/ gốc
        ├── exceptions/
        │   └── sharepoint-api.exception.ts  # ← chuyển từ common
        │
        ├── integration/                 # ← module "sharepoint" cũ (auth/token với SP API)
        │   ├── constants/sharepoint.constant.ts
        │   ├── dto/
        │   │   ├── sharepoint-auth-response.dto.ts
        │   │   └── sharepoint-management.dto.ts
        │   ├── entities/sharepoint-token-cache.entity.ts
        │   ├── repositories/sharepoint-token-cache.repository.ts
        │   ├── sharepoint-integration.controller.ts
        │   ├── sharepoint-integration.service.ts
        │   ├── sharepoint-integration.module.ts
        │   └── index.ts
        │
        ├── audit-log-sync/              # ← giữ nguyên nội dung, thêm tasks/
        │   ├── constants/
        │   │   ├── dlq-status.constant.ts
        │   │   ├── sync.constant.ts
        │   │   └── workload.constant.ts
        │   ├── dto/
        │   │   └── time-window.dto.ts
        │   ├── entities/
        │   │   ├── audit-log.entity.ts
        │   │   ├── audit-log-dlq.entity.ts
        │   │   └── audit-log-sync-state.entity.ts
        │   ├── repositories/audit-log.repository.ts
        │   ├── services/
        │   │   ├── audit-log-sync.service.ts
        │   │   └── sync-lock.service.ts
        │   ├── tasks/
        │   │   └── audit-log-sync.task.ts   # ← chuyển từ tasks/ gốc
        │   ├── audit-log-sync.module.ts
        │   └── index.ts
        │
        └── dashboard/                   # ← module "sharepoint-dashboard" cũ
            ├── dto/
            │   └── get-audit-logs.dto.ts
            ├── sharepoint-dashboard.controller.ts
            ├── sharepoint-dashboard.service.ts
            ├── sharepoint-dashboard.module.ts
            └── index.ts
```

### Lý do các thay đổi lớn

- **`core/` mới tách khỏi `common/`**: `core` = hạ tầng khởi tạo 1 lần, có vòng đời gắn với `AppModule` (DB, config, logger, HTTP client dùng chung). `common` = thư viện tiện ích được import lặp lại nhiều nơi nhưng không có state/side-effect khởi tạo. Việc tách này giúp rule ESLint boundary sau này dễ enforce: _modules không được import lẫn nhau trực tiếp, chỉ được import `core` và `common`_.
- **Gom `sharepoint`, `sharepoint-dashboard`, `audit-log-sync` vào `modules/sharepoint/`**: đây là 1 bounded context — cùng chia sẻ config, exception, và có quan hệ nghiệp vụ (integration cung cấp token → audit-log-sync đồng bộ dữ liệu → dashboard đọc lại dữ liệu đó). Gom theo domain giúp người mới đọc code hiểu ngay ranh giới nghiệp vụ, thay vì phải suy luận từ 3 module rời rạc.
- **`tasks/audit-log-sync.task.ts` → `modules/sharepoint/audit-log-sync/tasks/`**: cron job này _là_ logic của module đó, không phải hạ tầng scheduling chung. `ScheduleModule.forRoot()` vẫn đăng ký global trong `AppModule`, nhưng class chứa `@Cron()` nên sống cùng domain nó phục vụ.
- **Exception domain-specific rời khỏi `common/exceptions`**: giữ nguyên tắc common không phụ thuộc ngược vào domain. `encryption.exception.ts`, `sharepoint-api.exception.ts` chuyển về module tương ứng, chỉ extend từ `common/exceptions/domain.exception.ts` hoặc `infrastructure.exception.ts`.
- **`auth.guard.ts` rời `common/guards`** nếu nó gắn với chiến lược xác thực cụ thể (JWT/session của module `auth`) — `common/guards` chỉ nên chứa guard hoàn toàn tổng quát như `RolesGuard`.

> **Lưu ý triển khai**: nếu team thấy việc lồng `sharepoint/integration`, `sharepoint/audit-log-sync`, `sharepoint/dashboard` quá sâu, có thể giữ 3 module này ở cấp phẳng trong `modules/` nhưng đổi tên rõ ràng: `sharepoint-integration`, `sharepoint-audit-sync`, `sharepoint-dashboard`. Cách này ít rủi ro hơn khi refactor (không phải sửa nhiều import path) nhưng mất đi tính "domain grouping" trực quan.

---

## 3. Naming Convention

| Đối tượng                         | Quy tắc                                                                                      | Ví dụ                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Folder**                        | kebab-case, danh từ số nhiều cho nhóm cùng loại; tên module = danh từ nghiệp vụ              | `audit-log-sync/`, `entities/`, `repositories/`                                                        |
| **File**                          | kebab-case + `.` + suffix theo loại                                                          | `create-user.dto.ts`, `auth.guard.ts`, `dlq-status.constant.ts`                                        |
| **Class**                         | PascalCase, hậu tố trùng loại file (trừ Entity)                                              | `AuthService`, `UsersController`, `HttpExceptionFilter`                                                |
| **Entity (class)**                | PascalCase, danh từ số ít trùng tên bảng logic, **không** thêm hậu tố `Entity` vào tên class | file: `audit-log.entity.ts` → class: `AuditLog`; DB table: `@Entity('audit_logs')` snake_case số nhiều |
| **DTO**                           | PascalCase + hậu tố `Dto`, đặt tên theo hành động + resource                                 | `LoginDto`, `CreateUserDto`, `GetAuditLogsQueryDto`                                                    |
| **Interface**                     | PascalCase, danh từ mô tả, **không** dùng tiền tố `I` (chuẩn TS hiện đại)                    | `ApiResponse<T>`, `SharepointTokenPayload`                                                             |
| **Type alias**                    | PascalCase, hậu tố `Type` chỉ khi cần phân biệt với interface cùng tên                       | `SyncStatusType`                                                                                       |
| **Enum**                          | Tên PascalCase, giá trị UPPER_SNAKE_CASE (hoặc PascalCase nếu map thẳng sang DB)             | `enum DlqStatus { PENDING = 'PENDING', RESOLVED = 'RESOLVED' }`                                        |
| **Constant**                      | Biến export riêng lẻ: UPPER_SNAKE_CASE. Object gom nhóm: camelCase + `as const`              | `export const MAX_RETRY_COUNT = 3;`<br>`export const SYNC_CONSTANTS = { ... } as const;`               |
| **Module (NestJS)**               | PascalCase + hậu tố `Module`, file kebab-case + `.module.ts`                                 | `AuditLogSyncModule`                                                                                   |
| **Repository**                    | PascalCase + hậu tố `Repository`                                                             | `AuditLogRepository`                                                                                   |
| **Guard/Interceptor/Filter/Pipe** | PascalCase + hậu tố đúng loại                                                                | `AuthGuard`, `TransformInterceptor`, `HttpExceptionFilter`                                             |

---

## 4. Kế hoạch Refactor (từng bước, không breaking)

1. **Chuẩn bị an toàn**: đảm bảo có test (unit/e2e) bao phủ các endpoint chính (`sharepoint`, `audit-log-sync`, `auth`). Nếu chưa có, viết tối thiểu smoke test cho từng controller trước khi động vào cấu trúc. Tạo branch riêng cho refactor.

2. **Thêm path alias** trong `tsconfig.json` (`@core/*`, `@common/*`, `@modules/*`) để giảm số lượng import cần sửa tay khi di chuyển file.

3. **Bước ít rủi ro nhất trước — gộp `utils/` vào `common/utils/`**: move nguyên trạng, không đổi logic, chạy build + test để xác nhận không gãy.

4. **Tách exception domain-specific**: chuyển `encryption.exception.ts`, `sharepoint-api.exception.ts` từ `common/exceptions` sang module tương ứng. Sửa các nơi `throw`/`catch` import lại đường dẫn mới. Build + test.

5. **Chuyển `tasks/audit-log-sync.task.ts`** vào `modules/sharepoint/audit-log-sync/tasks/`, cập nhật provider trong `audit-log-sync.module.ts`, xóa `TasksModule` gốc (giữ `ScheduleModule.forRoot()` ở `AppModule`). Build + chạy thử cron thủ công (trigger sớm hoặc gọi method trực tiếp) để xác nhận job vẫn chạy.

6. **Gộp domain `sharepoint`** — làm từng module con một, mỗi lần 1 commit/PR riêng để dễ rollback:
   - Di chuyển `modules/sharepoint` → `modules/sharepoint/integration`, build + test lại các endpoint SharePoint API.
   - Di chuyển `modules/sharepoint-dashboard` → `modules/sharepoint/dashboard`, kiểm tra lại dashboard.
   - Di chuyển `sharepoint.config.ts` từ `config/` gốc vào `modules/sharepoint/config`, cập nhật `ConfigModule` load path.
   - Sau khi cả 3 ổn định, review lại import giữa các sub-module (integration ↔ audit-log-sync ↔ dashboard) để đảm bảo không có circular dependency (dùng `madge --circular`).

7. **Tách `core/` khỏi `common/`**: chuyển `config/`, `database/`, `logger/`, `http-client/` vào `core/`. Đây là thay đổi có blast-radius lớn nhất (đụng `AppModule` và hầu hết mọi module đều import logger/database) — làm **sau cùng**, khi các bước trên đã ổn định, và cập nhật import bằng find-replace hàng loạt + build toàn bộ.

8. **Kiểm tra lại TypeORM entity glob pattern / migration data-source config** — nếu đang dùng glob kiểu `src/modules/**/*.entity.ts`, việc gộp thư mục sharepoint không ảnh hưởng; nếu khai báo entity tường minh theo mảng thì phải cập nhật path.

9. **Thêm ESLint boundary rule** (ví dụ `eslint-plugin-boundaries` hoặc rule tự viết) để chặn: `common` không được import từ `modules`; các `modules/*` không được import chéo lẫn nhau ngoại trừ qua `index.ts` public API — nhằm khóa kiến trúc mới, tránh tái diễn tình trạng cũ.

10. **Cập nhật README/CONTRIBUTING** mô tả convention `core` vs `common` vs `modules`, review với team trước khi merge vào `main`.
