# VitalPulse 部署架构文档

> 版本: v2.0.0
> 日期: 2026-05-10
> 适用产品: VitalPulse 健康管理系统
> 技术栈: Next.js 15 + PostgreSQL（生产）/ SQLite（本地开发）+ Prisma + DeepSeek API

---

## 1. 部署概述

VitalPulse 支持**两种运行模式**：

| 模式 | 数据库 | 适用场景 |
|------|--------|----------|
| **本地开发** | SQLite（`file:./dev.db`） | 个人开发调试，零配置 |
| **生产部署** | PostgreSQL（Vercel Postgres / Supabase / Neon） | 多用户共享，7x24 在线 |

---

## 2. 本地开发（SQLite，零配置）

### 2.1 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.17.0 | 20 LTS |
| npm | 9+ | 10+ |

无需安装任何数据库服务。

### 2.2 启动步骤

```bash
cd my-app
./scripts/setup.sh
npm run dev
```

访问 `http://localhost:3000`。

---

## 3. 生产部署（Vercel + PostgreSQL）

### 3.1 架构

```text
┌──────────┐       HTTPS         ┌──────────────┐      ┌──────────────────┐
│  Browser  │  ←───────────────→  │    Vercel    │  ←→  │  PostgreSQL      │
│  (用户端)  │                     │  (Serverless) │      │  (Supabase/Neon) │
└──────────┘                     └──────┬───────┘      └──────────────────┘
                                        │
                                        │ HTTPS（仅拍照识别）
                                        ↓
                              ┌──────────────────┐
                              │   DeepSeek API   │
                              └──────────────────┘
```

### 3.2 第一步：准备 PostgreSQL

选择任一免费 PostgreSQL 服务：

| 服务 | 免费额度 | 注册地址 |
|------|---------|----------|
| Supabase | 500MB 存储 | [supabase.com](https://supabase.com) |
| Neon | 0.5GB 存储 | [neon.tech](https://neon.tech) |
| Vercel Postgres | 256MB 存储 | Vercel 控制台内建 |

创建项目后，复制 PostgreSQL 连接串（格式：`postgresql://user:pass@host:port/db`）。

### 3.3 第二步：部署到 Vercel

**方式一：一键部署**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**方式二：CLI 部署**

```bash
npm i -g vercel
cd my-app
vercel
```

按提示关联项目，首次部署会生成一个 `*.vercel.app` 域名。

### 3.4 第三步：设置环境变量

在 Vercel 控制台 → Settings → Environment Variables 中添加：

| 变量 | 值 | 说明 |
|------|-----|------|
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | PostgreSQL 连接串 |
| `JWT_SECRET` | 随机 64 位 hex 字符串 | 用于签发 JWT |
| `JWT_REFRESH_SECRET` | 随机 64 位 hex 字符串 | 不同于 JWT_SECRET |
| `DEEPSEEK_API_KEY` | `sk-...` | DeepSeek API 密钥（可选） |

生成安全随机密钥：`openssl rand -hex 32`

### 3.5 第四步：切换 Prisma Provider 并初始化数据库

切换到 PostgreSQL provider：

```bash
# 编辑 prisma/schema.prisma，将 provider = "sqlite" 改为 provider = "postgresql"
# 然后推送 schema 到 PostgreSQL：
npx prisma db push
```

部署后访问 `https://<your-project>.vercel.app`。

### 3.6 后续更新部署

```bash
cd my-app
vercel --prod
```

---

## 4. 两种模式的 Prisma Provider 切换

当前项目提供两套 schema 分支策略：

| 分支/文件 | Provider | 用途 |
|-----------|----------|------|
| `prisma/schema.prisma` | `sqlite` | 本地开发 |
| 部署时手动切换 | `postgresql` | 生产部署 |

> 后续可考虑使用环境变量动态切换或维护两套 schema 文件。

---

## 5. 常用命令

```bash
# 本地开发
npm run dev

# 生成 Prisma Client
npm run prisma:generate

# 同步数据库结构（SQLite / PostgreSQL 通用）
npm run db:push

# 查看数据库
npx prisma studio

# 生产构建
npm run build
npm run start

# 部署到 Vercel
vercel --prod
```

---

## 6. 常见问题

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| Vercel 部署后 500 错误 | Provider 仍是 `sqlite` | 改为 `postgresql` 并重新部署 |
| DATABASE_URL 无法连接 | PostgreSQL 连接串格式不对 | 检查格式：`postgresql://user:pass@host:port/db?sslmode=require` |
| 部署后表不存在 | 未执行 `db push` | 本地执行 `npx prisma db push` 指向 PostgreSQL |
| 本地开发报错 | `.env.local` 中 DATABASE_URL 不对 | 确保本地使用 `file:./dev.db` |

---

## 7. 安全边界

- JWT Secret 存放在 Vercel 环境变量中，不暴露给前端
- DeepSeek API Key 仅服务端读取
- 用户健康数据存储在 PostgreSQL，通过 Prisma 参数化查询防止 SQL 注入
- 生产环境开启 HTTPS（Vercel 默认提供）

---

*文档版本：v2.0.0*
*更新日期：2026-05-10*
*关联文档：`env-config.md`、`data-schema.md`、`function.md`、`interface.md`*
