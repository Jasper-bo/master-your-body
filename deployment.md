# VitalPulse 部署架构文档

> 版本: v1.1.0
> 日期: 2026-04-29
> 适用产品: VitalPulse 健康管理系统
> 技术栈: Next.js 15 + SQLite + Prisma + DeepSeek API

---

## 1. 部署概述

VitalPulse 采用**纯本地部署**模式。除拍照识别需要调用 DeepSeek API 外，用户账号、身体档案、饮食记录、训练记录和健康评分均保存在本机 SQLite 数据库文件中。

当前源码运行形态：

| 组件 | 说明 |
|------|------|
| 应用服务 | Next.js 全栈应用（App Router + API Routes），默认监听 `3000` |
| 数据库 | SQLite 单文件数据库，默认路径 `my-app/prisma/dev.db` |
| ORM | Prisma Client，通过 `DATABASE_URL="file:./dev.db"` 连接 SQLite |
| 外部依赖 | DeepSeek API，仅用于食物拍照识别 |

后续桌面打包形态：

| 平台 | 推荐数据库位置 | 用户体验 |
|------|----------------|----------|
| Windows | `%APPDATA%/VitalPulse/vitalpulse.db` | 双击 `.exe` 启动，无需安装数据库 |
| macOS | `~/Library/Application Support/VitalPulse/vitalpulse.db` | 需要单独打包 macOS 版本，不可直接运行 Windows `.exe` |

> 当前第一阶段只切换后端数据库到 SQLite。桌面壳（Electron/Tauri）和安装包会在后续模块处理。

---

## 2. 系统要求

### 2.1 源码运行

| 组件 | 最低版本 | 推荐版本 | 验证命令 |
|------|----------|----------|----------|
| Node.js | 18.17.0 | 20 LTS | `node -v` |
| npm | 9+ | 10+ | `npm -v` |
| SQLite | 随 Prisma/运行环境使用 | 无需单独安装服务 | 无 |

### 2.2 硬件与网络

| 场景 | CPU | 内存 | 磁盘 | 网络 |
|------|-----|------|------|------|
| 个人单机使用 | 2 核 | 4 GB | 2 GB 可用空间 | 可访问 DeepSeek API |
| 少量用户分发 | 2 核 | 4 GB | 5 GB 可用空间 | 同上 |

> SQLite 不需要数据库端口，也不需要 PostgreSQL、WSL2 或额外数据库服务。

---

## 3. 服务架构

```text
┌─────────────┐      HTTP (port 3000)       ┌─────────────────────┐
│   Browser   │  ←────────────────────────→ │   Next.js App       │
│  (用户端)    │                             │   (localhost:3000)  │
└─────────────┘                             └──────────┬──────────┘
                                                       │
                                                       │ Prisma Client
                                                       ↓
                                             ┌─────────────────────┐
                                             │   SQLite database   │
                                             │   prisma/dev.db     │
                                             └─────────────────────┘

                            HTTPS (出站，仅拍照识别)
                                                       ↓
                                             ┌─────────────────────┐
                                             │   DeepSeek API      │
                                             │ api.deepseek.com    │
                                             └─────────────────────┘
```

端口清单：

| 服务 | 端口 | 协议 | 监听地址 | 说明 |
|------|------|------|----------|------|
| Next.js | 3000 | TCP | `127.0.0.1` | 可通过环境变量 `PORT` 修改 |

---

## 4. 源码运行步骤

### 4.1 安装依赖

```bash
cd my-app
npm install
```

### 4.2 配置环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

关键配置：

```env
DATABASE_URL="file:./dev.db"

JWT_SECRET="replace-with-32-bytes-or-longer-random-secret"
JWT_REFRESH_SECRET="replace-with-different-32-bytes-or-longer-random-secret"

DEEPSEEK_API_KEY="sk-your-deepseek-api-key"
DEEPSEEK_API_ENDPOINT="https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL="deepseek-chat"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
TZ="Asia/Shanghai"
```

`file:./dev.db` 以 `my-app/prisma/schema.prisma` 所在目录为基准，因此默认数据库文件会生成在 `my-app/prisma/dev.db`。

### 4.3 初始化 SQLite 数据库

```bash
npm run prisma:generate
npm run db:push
```

如脚本不存在，可使用等价命令：

```bash
npx prisma generate
npx prisma db push
```

### 4.4 启动开发服务

```bash
npm run dev -- --port 3000
```

访问 `http://localhost:3000` 即可使用。

---

## 5. 数据文件与备份

### 5.1 数据文件

| 文件 | 说明 |
|------|------|
| `my-app/prisma/dev.db` | 默认 SQLite 主数据库 |
| `my-app/prisma/dev.db-journal` / `dev.db-wal` | SQLite 运行时可能产生的事务辅助文件 |

### 5.2 备份

关闭应用后复制数据库文件即可完成备份：

```bash
cp my-app/prisma/dev.db backups/vitalpulse-$(date +%Y%m%d).db
```

恢复时关闭应用，将备份文件复制回 `my-app/prisma/dev.db`。

> 若后续进入桌面打包阶段，备份路径需要调整为用户数据目录，而不是项目源码目录。

---

## 6. 打包路线说明

SQLite 路线适合“人数很少、每个人本地使用”的分发方式：

| 问题 | 结论 |
|------|------|
| Windows 是否可双击打开 | 可以，但需要后续用 Electron/Tauri 将 Next.js 和本地服务打成桌面应用 |
| 用户是否需要安装数据库 | 不需要，SQLite 是本地文件 |
| macOS 是否可用 | 可以，但需要单独构建 macOS 安装包，不能直接运行 Windows `.exe` |
| 是否像小 App | 是，桌面壳启动后可表现为普通本地小应用 |

---

## 7. 运维与排查

### 7.1 常用命令

```bash
# 校验 Prisma schema 并生成客户端
npx prisma generate

# 将 schema 同步到 SQLite
npx prisma db push

# 打开 Prisma Studio 查看本地数据
npx prisma studio
```

### 7.2 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| `DATABASE_URL` 无法连接 | `.env` 或 `.env.local` 仍是旧连接串 | 改为 `DATABASE_URL="file:./dev.db"` 并重启服务 |
| 数据库表不存在 | 未执行 `db push` | 运行 `npx prisma db push` |
| 修改 schema 后类型不更新 | Prisma Client 未重新生成 | 运行 `npx prisma generate` 并重启 Next.js |
| 打包后数据丢失 | 数据库放在应用安装目录而非用户数据目录 | 桌面打包时改用用户数据目录 |

---

## 8. 安全边界

- SQLite 文件只存储在本地机器，不主动上传。
- DeepSeek API Key 只允许服务端读取，不得暴露给前端。
- 用户健康数据、饮食记录、训练记录默认不离开本机。
- 如果未来支持多设备同步，需要重新设计数据库、鉴权和隐私策略。

---

*文档版本：v1.1.0*
*更新日期：2026-04-29*
*关联文档：`env-config.md`、`data-schema.md`、`function.md`、`interface.md`*
