# VitalPulse 部署架构文档

> 版本: v2.0.0
> 日期: 2026-05-10
> 适用产品: VitalPulse 健康管理系统
> 技术栈: Next.js 15 + PostgreSQL + Prisma + 千问/Qwen 多模态模型

---

## 1. 部署概述

VitalPulse 支持本地开发和生产部署两种运行模式，但数据库统一使用 PostgreSQL：

| 模式 | 数据库 | 适用场景 |
|------|--------|----------|
| **本地开发** | PostgreSQL（本机 / Supabase / Neon / Vercel Postgres） | 个人开发调试或给朋友在电脑上运行 |
| **生产部署** | PostgreSQL（Vercel Postgres / Supabase / Neon） | 多用户共享，7x24 在线 |

---

## 2. 本地开发（PostgreSQL）

### 2.1 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 18.17.0 | 20 LTS |
| npm | 9+ | 10+ |

需要准备一个 PostgreSQL 连接串。可以使用本机 PostgreSQL，也可以使用 Supabase、Neon 或 Vercel Postgres 的免费实例。

### 2.2 启动步骤

```bash
cd my-app
npm install
npx prisma db push
npm run dev
```

访问 `http://localhost:3000`。在另一台电脑运行时，先创建 `my-app/.env.local` 并配置 `DATABASE_URL`、`JWT_SECRET`、`JWT_REFRESH_SECRET`。如启用 AI 拍照识别，再配置 `QWEN_API_KEY`。

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
                              │ 千问/Qwen API    │
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
| `QWEN_API_KEY` | `sk-...` | 千问/Qwen API 密钥（启用 AI 拍照识别时需要） |
| `QWEN_API_ENDPOINT` | 兼容 OpenAI 的千问接口地址 | 可选 |
| `QWEN_MODEL` | `qwen-vl-plus` / `qwen-vl-max` | 可选 |

生成安全随机密钥：`openssl rand -hex 32`

### 3.5 第四步：初始化数据库

当前项目的 Prisma provider 统一为 PostgreSQL，不再做 SQLite / PostgreSQL 切换：

```bash
npx prisma db push
```

部署后访问 `https://<your-project>.vercel.app`。

### 3.6 后续更新部署

```bash
cd my-app
vercel --prod
```

---

## 4. Prisma Provider

当前项目只维护 PostgreSQL provider：

| 文件 | Provider | 用途 |
|------|----------|------|
| `prisma/schema.prisma` | `postgresql` | 本地开发与生产部署 |

不要重新引入 SQLite provider，除非产品方向明确要求离线单机模式。

---

## 5. 常用命令

```bash
# 本地开发
npm run dev

# 生成 Prisma Client
npm run prisma:generate

# 同步 PostgreSQL 数据库结构
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
| DATABASE_URL 无法连接 | PostgreSQL 连接串格式不对 | 检查格式：`postgresql://user:pass@host:port/db?sslmode=require` |
| 部署后表不存在 | 未执行 `db push` | 本地执行 `npx prisma db push` 指向 PostgreSQL |
| 本地开发报错 | `.env.local` 中 DATABASE_URL 不对 | 确保本地也使用 PostgreSQL 连接串 |
| 国内朋友无法访问 `*.vercel.app` | Vercel 在中国大陆访问不稳定 | 给朋友本地 PostgreSQL 运行步骤，或后续考虑国内云镜像/备案域名 |

---

## 7. 安全边界

- JWT Secret 存放在 Vercel 环境变量中，不暴露给前端
- Qwen API Key 仅服务端读取
- 用户健康数据存储在 PostgreSQL，通过 Prisma 参数化查询防止 SQL 注入
- 生产环境开启 HTTPS（Vercel 默认提供）

---

*文档版本：v2.0.0*
*更新日期：2026-05-10*
*关联文档：`env-config.md`、`data-schema.md`、`function.md`、`interface.md`*
