# VitalPulse 环境变量配置清单

> 本文档定义 VitalPulse 健康管理系统运行所需的全部环境变量。
> 技术栈：Next.js 全栈（App Router + API Routes）、SQLite + Prisma ORM、DeepSeek API
> 部署方式：纯本地部署，仅 DeepSeek API 外调

---

## 1. 数据库配置

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `DATABASE_URL` | 是 | - | SQLite 数据库文件路径。Prisma 通过此字符串连接本地数据库文件，路径相对 `prisma/schema.prisma` 所在目录解析。 | `file:./dev.db` | 服务端机密 |

> **配置建议**：本地开发和桌面打包均使用 SQLite 文件，不需要数据库端口、用户名或密码。后续打包时应将数据库文件放到系统用户数据目录，避免应用升级覆盖数据。

---

## 2. JWT 认证配置

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `JWT_SECRET` | 是 | - | Access Token 签名密钥，用于签发和校验 JWT Access Token。长度建议 >= 256 bit (32 字节以上)。 | `VitalPulse_Access_2026_x7k9mP2qL5vR8wT3jF1hN4bC6` | 服务端机密 |
| `JWT_REFRESH_SECRET` | 是 | - | Refresh Token 签名密钥，用于签发和校验 JWT Refresh Token。必须与 `JWT_SECRET` 不同。 | `VitalPulse_Refresh_2026_y8n0oQ3rM6uS9xU4kG2iO5cD7` | 服务端机密 |
| `JWT_ACCESS_EXPIRY` | 否 | `24h` | Access Token 有效期。格式支持数字（秒）或字符串（如 `15m`, `24h`, `7d`）。 | `24h` / `86400` | 服务端机密 |
| `JWT_REFRESH_EXPIRY` | 否 | `7d` | Refresh Token 有效期。格式同上。 | `7d` / `604800` | 服务端机密 |
| `JWT_ISSUER` | 否 | `vitalpulse` | JWT 签发者（iss），用于标识 Token 来源。 | `vitalpulse-app` | 客户端可暴露 |
| `JWT_AUDIENCE` | 否 | `vitalpulse-client` | JWT 受众（aud），用于限制 Token 使用范围。 | `vitalpulse-web` | 客户端可暴露 |

> **安全提示**：`JWT_SECRET` 与 `JWT_REFRESH_SECRET` 必须使用密码学安全随机生成器生成（如 `openssl rand -base64 32`），且不可在任何代码仓库、日志或前端暴露。两密钥轮换时应确保旧密钥有短暂兼容期，避免在线用户被强制登出。

---

## 3. DeepSeek AI 配置

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `DEEPSEEK_API_KEY` | 是 | - | DeepSeek API 密钥，用于食物拍照识别功能。由 DeepSeek 开放平台提供。 | `sk-abc123def456ghi789jkl012mno345pqr678stu9vwx0yz` | 服务端机密 |
| `DEEPSEEK_API_ENDPOINT` | 否 | `https://api.deepseek.com/v1/chat/completions` | DeepSeek API 请求地址。若使用代理或私有化部署，可修改此端点。 | `https://api.deepseek.com/v1/chat/completions` | 服务端机密 |
| `DEEPSEEK_MODEL` | 否 | `deepseek-chat` | 调用 DeepSeek 时使用的模型名称。食物识别建议使用支持多模态的 Vision 模型（如 `deepseek-vision`）。 | `deepseek-chat` / `deepseek-vision` | 客户端可暴露 |
| `DEEPSEEK_TIMEOUT_MS` | 否 | `15000` | DeepSeek API 请求超时时间（毫秒）。超过此时长将触发降级策略，返回 503 错误。 | `15000` / `20000` | 服务端机密 |
| `DEEPSEEK_MAX_TOKENS` | 否 | `1024` | 单次请求返回的最大 Token 数。食物识别结果通常较短，1024 足够。 | `1024` | 客户端可暴露 |
| `DEEPSEEK_TEMPERATURE` | 否 | `0.3` | 模型采样温度。越低结果越稳定，适合结构化数据识别。建议保持 0.3 以下。 | `0.3` / `0.1` | 客户端可暴露 |
| `DEEPSEEK_MAX_IMAGE_SIZE_MB` | 否 | `10` | 允许上传的图片最大大小（MB）。超过此限制将直接返回 422。 | `10` | 客户端可暴露 |
| `DEEPSEEK_MAX_IMAGE_DIMENSION` | 否 | `1024` | 图片 base64 编码前，最短边压缩上限（像素）。用于控制 Token 消耗。 | `1024` | 客户端可暴露 |

> **安全提示**：`DEEPSEEK_API_KEY` 必须通过服务端中转调用，严禁在前端代码或浏览器网络请求中直接暴露。所有图片在上传到 DeepSeek 之前，后端应完成格式校验（MIME 类型、文件大小、内容可读性），且分析完成后立即丢弃，不保留原始图片文件。

---

## 4. 应用配置

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `NEXT_PUBLIC_APP_NAME` | 否 | `VitalPulse` | 应用名称，用于页面标题、导航栏品牌展示等前端显示。 | `VitalPulse` / `VitalPulse 健康管理系统` | 客户端可暴露 |
| `NEXT_PUBLIC_APP_VERSION` | 否 | `1.0.0` | 应用版本号，展示于系统设置页。 | `1.0.0` / `2.0.0` | 客户端可暴露 |
| `PORT` | 否 | `3000` | Next.js 服务端监听端口。 | `3000` / `8080` | 服务端机密 |
| `NODE_ENV` | 否 | `development` | 运行环境。可选值：`development`、`test`、`production`。 | `development` / `production` | 服务端机密 |
| `NEXT_PUBLIC_API_BASE_URL` | 否 | `http://localhost:3000/api` | 前端调用 API 的基础地址。本地开发使用 localhost，部署时替换为实际域名。 | `https://vitalpulse.local/api` | 客户端可暴露 |
| `NEXT_PUBLIC_APP_URL` | 否 | `http://localhost:3000` | 应用完整根 URL，用于生成绝对链接、回调地址等。 | `https://vitalpulse.local` | 客户端可暴露 |
| `TZ` | 否 | `Asia/Shanghai` | 应用时区设置。所有时间戳在应用层按此时区展示，数据库存储仍使用 UTC。 | `Asia/Shanghai` / `UTC` | 服务端机密 |

> **Next.js 环境变量前缀说明**：
> - 以 `NEXT_PUBLIC_` 开头的变量会被 Next.js 打包到客户端代码中，因此只能存放非敏感信息。
> - 无前缀的变量仅在服务端（API Routes、Server Components）可用，适合存放密钥、密码等敏感配置。

---

## 5. 安全配置

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `BCRYPT_ROUNDS` | 否 | `12` | bcrypt 密码哈希计算轮数（cost factor）。数值越高安全性越强，但计算耗时越长。PRD 要求 >= 12。 | `12` / `14` | 服务端机密 |
| `CAPTCHA_EXPIRY_MINUTES` | 否 | `5` | 图形验证码有效期（分钟）。过期后需重新获取。 | `5` / `10` | 服务端机密 |
| `CAPTCHA_LENGTH` | 否 | `4` | 图形验证码位数。当前系统使用 4 位纯数字。 | `4` / `6` | 客户端可暴露 |
| `LOGIN_MAX_FAILURES` | 否 | `5` | 连续登录失败次数上限。超过后将临时锁定账号。 | `5` / `3` | 服务端机密 |
| `LOGIN_LOCKOUT_MINUTES` | 否 | `15` | 账号临时锁定时间（分钟）。在锁定期间该账号无法登录。 | `15` / `30` | 服务端机密 |
| `PASSWORD_MIN_LENGTH` | 否 | `6` | 用户密码最小长度要求。注册和修改密码时校验。 | `6` / `8` | 客户端可暴露 |
| `CSP_NONCE_SECRET` | 否 | - | Content-Security-Policy nonce 生成密钥。若启用 nonce-based CSP，需配置此值。 | `csp_nonce_secret_2026_random_string` | 服务端机密 |
| `HSTS_MAX_AGE` | 否 | `31536000` | Strict-Transport-Security 头部 max-age（秒）。生产环境建议启用。 | `31536000` | 客户端可暴露 |
| `SESSION_COOKIE_NAME` | 否 | `vitalpulse_session` | 会话 Cookie 名称。 | `vitalpulse_session` | 客户端可暴露 |
| `SESSION_COOKIE_SECURE` | 否 | `false` | 是否仅在 HTTPS 下发送 Cookie。生产环境必须设为 `true`。 | `true` / `false` | 服务端机密 |
| `SESSION_COOKIE_SAMESITE` | 否 | `lax` | Cookie SameSite 属性。可选：`strict`、`lax`、`none`。 | `lax` / `strict` | 客户端可暴露 |

> **安全提示**：
> - 生产环境必须启用 HTTPS，并将 `SESSION_COOKIE_SECURE` 设为 `true`。
> - `BCRYPT_ROUNDS` 不建议低于 12，也不建议高于 14（会显著增加服务器 CPU 负载）。
> - 若部署在公网，建议配置 `CSP_NONCE_SECRET` 并启用严格的 Content-Security-Policy。

---

## 6. 可选 / 高级配置

### 6.1 速率限制

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `RATE_LIMIT_ENABLED` | 否 | `true` | 是否启用 API 速率限制。 | `true` / `false` | 服务端机密 |
| `RATE_LIMIT_WINDOW_MS` | 否 | `60000` | 速率限制统计窗口（毫秒）。默认 1 分钟。 | `60000` / `300000` | 服务端机密 |
| `RATE_LIMIT_MAX_REQUESTS` | 否 | `100` | 单个 IP 在每个窗口内允许的最大请求数。 | `100` / `60` | 服务端机密 |
| `RATE_LIMIT_AUTH_MAX_REQUESTS` | 否 | `10` | 认证相关接口（登录/注册/验证码）的严格速率限制。防止暴力破解。 | `10` / `5` | 服务端机密 |
| `RATE_LIMIT_AI_MAX_REQUESTS` | 否 | `20` | AI 识别接口的速率限制。防止滥用 DeepSeek API 导致额度耗尽。 | `20` / `10` | 服务端机密 |

### 6.2 日志配置

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `LOG_LEVEL` | 否 | `info` | 应用日志级别。可选：`trace`、`debug`、`info`、`warn`、`error`、`fatal`。 | `info` / `debug` | 服务端机密 |
| `LOG_FORMAT` | 否 | `json` | 日志输出格式。生产环境建议 `json`，开发环境可设为 `pretty`。 | `json` / `pretty` | 服务端机密 |
| `LOG_FILE_PATH` | 否 | - | 日志文件输出路径。若未设置，仅输出到 stdout。 | `/var/log/vitalpulse/app.log` | 服务端机密 |
| `LOG_MAX_SIZE_MB` | 否 | `100` | 单个日志文件最大大小（MB）。超过后自动轮转。 | `100` / `50` | 服务端机密 |
| `LOG_MAX_FILES` | 否 | `14` | 保留的历史日志文件数量。 | `14` / `30` | 服务端机密 |

### 6.3 数据清理与维护

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `DATA_RETENTION_DAYS` | 否 | `90` | 饮食记录和训练明细的保留天数。超过此期限的数据将自动物理删除。 | `90` / `180` | 服务端机密 |
| `CLEANUP_CRON_EXPRESSION` | 否 | `0 3 * * *` | 数据清理定时任务执行周期（cron 表达式）。默认每天凌晨 3 点执行。 | `0 3 * * *` | 服务端机密 |
| `CAPTCHA_CLEANUP_INTERVAL_MS` | 否 | `300000` | 过期验证码清理间隔（毫秒）。默认每 5 分钟清理一次。 | `300000` | 服务端机密 |
| `TOKEN_CLEANUP_INTERVAL_MS` | 否 | `3600000` | 过期 Refresh Token 清理间隔（毫秒）。默认每小时清理一次。 | `3600000` | 服务端机密 |

### 6.4 性能与缓存

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `API_REQUEST_TIMEOUT_MS` | 否 | `30000` | 通用 API 请求超时时间（毫秒）。 | `30000` / `60000` | 服务端机密 |
| `DASHBOARD_CACHE_TTL_SECONDS` | 否 | `60` | 仪表盘聚合数据的缓存有效期（秒）。高并发场景可适当增加。 | `60` / `300` | 服务端机密 |
| `HEALTH_SCORE_CACHE_TTL_SECONDS` | 否 | `30` | 健康评分计算结果的缓存有效期（秒）。 | `30` / `60` | 服务端机密 |
| `ENABLE_COMPRESSION` | 否 | `true` | 是否启用 HTTP 响应压缩（gzip/brotli）。 | `true` / `false` | 服务端机密 |

### 6.5 开发者与调试（仅开发环境）

| 变量名 | 是否必填 | 默认值 | 说明 | 示例值 | 安全等级 |
|--------|----------|--------|------|--------|----------|
| `DEBUG` | 否 | `false` | 是否启用调试模式。开启后会输出更详细的错误堆栈和请求日志。 | `true` / `false` | 服务端机密 |
| `MOCK_AI_RESPONSE` | 否 | `false` | 是否启用 AI 识别模拟模式。开启后 DeepSeek API 调用将返回预设的 mock 数据，用于离线开发测试。 | `true` / `false` | 服务端机密 |
| `PRISMA_LOG_QUERIES` | 否 | `false` | 是否打印 Prisma 执行的 SQL 查询。开发调试用。 | `true` / `false` | 服务端机密 |

---

## 附录 A：`.env.example` 模板文件

```bash
# ============================================
# VitalPulse 环境变量示例文件
# 复制此文件为 .env.local 后，填入实际值
# ============================================

# --------------------------------------------
# 1. 数据库配置（必填）
# --------------------------------------------
DATABASE_URL="file:./dev.db"

# --------------------------------------------
# 2. JWT 认证配置（必填）
# --------------------------------------------
JWT_SECRET="请替换为 32 字节以上的随机字符串"
JWT_REFRESH_SECRET="请替换为与 JWT_SECRET 不同的 32 字节以上随机字符串"
# JWT_ACCESS_EXPIRY=24h
# JWT_REFRESH_EXPIRY=7d
# JWT_ISSUER=vitalpulse
# JWT_AUDIENCE=vitalpulse-client

# --------------------------------------------
# 3. DeepSeek AI 配置（必填：API Key）
# --------------------------------------------
DEEPSEEK_API_KEY="sk-你的 DeepSeek API 密钥"
# DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
# DEEPSEEK_MODEL=deepseek-chat
# DEEPSEEK_TIMEOUT_MS=15000
# DEEPSEEK_MAX_TOKENS=1024
# DEEPSEEK_TEMPERATURE=0.3
# DEEPSEEK_MAX_IMAGE_SIZE_MB=10
# DEEPSEEK_MAX_IMAGE_DIMENSION=1024

# --------------------------------------------
# 4. 应用配置
# --------------------------------------------
# NEXT_PUBLIC_APP_NAME=VitalPulse
# NEXT_PUBLIC_APP_VERSION=1.0.0
# PORT=3000
# NODE_ENV=development
# NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# TZ=Asia/Shanghai

# --------------------------------------------
# 5. 安全配置
# --------------------------------------------
# BCRYPT_ROUNDS=12
# CAPTCHA_EXPIRY_MINUTES=5
# CAPTCHA_LENGTH=4
# LOGIN_MAX_FAILURES=5
# LOGIN_LOCKOUT_MINUTES=15
# PASSWORD_MIN_LENGTH=6
# CSP_NONCE_SECRET=""
# HSTS_MAX_AGE=31536000
# SESSION_COOKIE_NAME=vitalpulse_session
# SESSION_COOKIE_SECURE=false
# SESSION_COOKIE_SAMESITE=lax

# --------------------------------------------
# 6. 速率限制（可选）
# --------------------------------------------
# RATE_LIMIT_ENABLED=true
# RATE_LIMIT_WINDOW_MS=60000
# RATE_LIMIT_MAX_REQUESTS=100
# RATE_LIMIT_AUTH_MAX_REQUESTS=10
# RATE_LIMIT_AI_MAX_REQUESTS=20

# --------------------------------------------
# 7. 日志配置（可选）
# --------------------------------------------
# LOG_LEVEL=info
# LOG_FORMAT=pretty
# LOG_FILE_PATH=
# LOG_MAX_SIZE_MB=100
# LOG_MAX_FILES=14

# --------------------------------------------
# 8. 数据清理与维护（可选）
# --------------------------------------------
# DATA_RETENTION_DAYS=90
# CLEANUP_CRON_EXPRESSION=0 3 * * *
# CAPTCHA_CLEANUP_INTERVAL_MS=300000
# TOKEN_CLEANUP_INTERVAL_MS=3600000

# --------------------------------------------
# 9. 性能与缓存（可选）
# --------------------------------------------
# API_REQUEST_TIMEOUT_MS=30000
# DASHBOARD_CACHE_TTL_SECONDS=60
# HEALTH_SCORE_CACHE_TTL_SECONDS=30
# ENABLE_COMPRESSION=true

# --------------------------------------------
# 10. 开发者与调试（仅开发环境）
# --------------------------------------------
# DEBUG=false
# MOCK_AI_RESPONSE=false
# PRISMA_LOG_QUERIES=false
```

---

## 附录 B：`.env.local` 快速配置指南

### 第一步：创建环境文件

在项目根目录执行：

```bash
cp .env.example .env.local
```

### 第二步：生成安全密钥

使用以下命令生成高强度的 JWT 密钥：

```bash
# 生成 32 字节 Base64 编码的随机字符串
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

将生成的两个**不同**字符串分别填入 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

### 第三步：配置数据库

SQLite 不需要预先安装或创建数据库服务。将 `DATABASE_URL` 设置为本地文件路径即可：

```bash
DATABASE_URL="file:./dev.db"
```

首次运行 `prisma db push` 时会自动创建 `my-app/prisma/dev.db`。

### 第四步：申请 DeepSeek API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册账号并创建 API Key
3. 将 Key 填入 `DEEPSEEK_API_KEY`
4. 确保账户有充足的 API 调用额度（食物识别每次调用约消耗 500-1500 tokens）

### 第五步：Prisma 初始化

```bash
# 安装依赖
pnpm install

# 生成 Prisma Client
pnpm prisma generate

# 同步 SQLite 表结构
pnpm prisma db push

# 可选：导入种子数据（系统预设食物、动作库）
pnpm prisma db seed
```

### 第六步：启动开发服务器

```bash
# 开发模式
pnpm dev

# 或指定端口
PORT=8080 pnpm dev
```

服务启动后，访问 `http://localhost:3000`（或你指定的端口）即可使用。

### 第七步：生产环境额外检查

部署到生产环境前，请务必确认：

- [ ] `NODE_ENV=production` 已设置
- [ ] `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 已更换为全新随机值
- [ ] `SESSION_COOKIE_SECURE=true` 已启用（需 HTTPS）
- [ ] SQLite 数据库文件已放在稳定的用户数据目录，避免应用升级覆盖
- [ ] `DEEPSEEK_API_KEY` 已替换为生产环境专用 Key
- [ ] `DEBUG=false` 和 `MOCK_AI_RESPONSE=false` 已关闭
- [ ] `RATE_LIMIT_ENABLED=true` 已启用
- [ ] `LOG_FORMAT=json` 已设置，且日志已接入日志收集系统
- [ ] `.env.local` 已加入 `.gitignore`，防止意外提交到代码仓库
- [ ] 服务器防火墙已关闭非必要端口，仅暴露 80/443 及应用端口

---

## 附录 C：安全等级说明

| 安全等级 | 含义 | 使用场景 |
|----------|------|----------|
| **公开** | 不包含任何敏感信息，可自由展示 | 应用名称、版本号、时区、部分功能开关 |
| **客户端可暴露** | 虽无直接危害，但不建议刻意公开 | API 基础 URL、模型名称、Cookie 配置项、非敏感 UI 文本 |
| **服务端机密** | 包含密钥、密码、Token 等敏感信息，仅限服务端持有 | 数据库密码、JWT 密钥、API Key、bcrypt 轮数、Cookie 安全开关 |

> **原则**：凡标记为"服务端机密"的变量，严禁以 `NEXT_PUBLIC_` 前缀暴露给前端，严禁打印到日志，严禁在错误响应中返回。

---

*文档版本：v1.1.0*
*更新日期：2026-04-29*
*关联文档：`prd.md`、`function.md`、`interface.md`、`data-schema.md`*
