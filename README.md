# VitalPulse / Stitch Body Health Insight Tracker

本仓库承载一个基于 Next.js 15 的全栈健康管理应用，应用代码位于 `my-app/`，产品文档与架构说明位于仓库根目录。支持本地开发（SQLite）和生产部署（Vercel + PostgreSQL）两种运行模式。

项目目标是把”注册登录 -> 生成个性化计划 -> 记录饮食 -> 记录训练 -> 查看健康评分”做成一条完整闭环。当前版本已经具备这条主链路，但仍有部分 PRD 中提到的能力尚未落地，README 以下内容以当前代码现状为准。

## 项目展示页

如果需要让其他人快速了解项目，可以直接用浏览器打开仓库根目录下的
[`project-showcase.html`](./project-showcase.html)。

这个静态页面整理了项目的核心流程、实际界面截图、功能模块、接口与数据结构，
不需要启动 Next.js 服务即可查看。

## 当前状态

已实现：

- 手机号注册 / 登录
- 首次注册后的强制个性化计划弹窗
- 仪表盘：BMI、BMR、TDEE、营养进度、健康评分、7 日趋势
- 饮食模块：手动录入主食 / 肉类 / 蔬菜 / 油脂
- 训练模块：从预置动作库快速记录训练
- PostgreSQL 持久化（本地开发兼容 SQLite）
- JWT 鉴权与基础健康检查接口

尚未完全落地：

- 图形验证码
- AI 拍照识别食物（DeepSeek）
- Electron / Tauri 桌面打包
- 自动化测试体系

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript 5
- Prisma ORM
- PostgreSQL（生产）/ SQLite（本地开发）
- Tailwind CSS
- bcryptjs

## 仓库结构

```text
.
├── my-app/                    # 实际可运行应用
│   ├── src/app/               # 页面与 API Routes
│   ├── src/components/        # 业务组件
│   ├── src/lib/               # 客户端 / 服务端逻辑
│   ├── prisma/                # Prisma schema 与数据库迁移
│   └── package.json
├── prd.md                     # 产品需求文档
├── function.md                # 功能模块说明
├── frontend-architecture.md   # 前端架构说明
├── data-schema.md             # 数据结构说明
├── interface.md               # 接口设计说明
├── env-config.md              # 环境变量说明
└── deployment.md              # 部署说明
```

## 快速开始

### 本地开发（SQLite，零配置）

#### 1. 环境要求

- Node.js 18.17+，推荐 Node.js 20 LTS

#### 2. 一键启动

```bash
cd my-app
./scripts/setup.sh
npm run dev
```

访问 `http://localhost:3000` 即可使用。

### 生产部署（Vercel + PostgreSQL）

#### 1. 准备 PostgreSQL 数据库

在 [Supabase](https://supabase.com) 或 [Neon](https://neon.tech) 免费注册，创建项目，获取 PostgreSQL 连接串。

#### 2. 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

或手动操作：

```bash
npm i -g vercel
cd my-app
vercel
```

在 Vercel 控制台中设置环境变量：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `JWT_SECRET` | 随机 32 位字符串 |
| `JWT_REFRESH_SECRET` | 随机 32 位字符串 |

#### 3. 初始化数据库

```bash
npx prisma db push
```

> 本地开发仍然使用 SQLite（`provider = "sqlite"`），部署时自动切换 PostgreSQL。详见 [deployment.md](./deployment.md)。

## 常用命令

在 `my-app/` 目录下执行：

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run db:push
```

## 当前业务闭环

1. 用户注册账号
2. 首次填写身高、体重、年龄、性别、运动频率、目标
3. 系统计算 BMI、BMR、TDEE 与每日营养目标
4. 用户在饮食页手动记录餐食
5. 用户在训练页记录力量 / 有氧训练
6. 仪表盘聚合展示摄入、训练与健康评分

## 运行与数据说明

- **本地开发**：数据存储在 SQLite 文件（`my-app/prisma/dev.db`），端口 `3000`，无需外部服务
- **生产部署**：数据存储在 PostgreSQL，通过 Vercel 托管，用户数据集中管理
- 当前仓库中的设计文档包含更完整的远期规划

## 文档导航

- [prd.md](./prd.md): 产品范围、MVP 定义、路线图
- [function.md](./function.md): 模块级功能说明
- [frontend-architecture.md](./frontend-architecture.md): 前端结构与页面设计
- [data-schema.md](./data-schema.md): 数据模型与表结构说明
- [interface.md](./interface.md): 接口契约草案
- [env-config.md](./env-config.md): 环境变量详细解释
- [deployment.md](./deployment.md): 本地开发与 Vercel 生产部署说明

## 已知差异与风险

- 仓库文档中提到的图形验证码、AI 拍照识别、完整设置页仍未全部实现
- 自动化测试文件尚未建立，当前质量主要依赖 `lint`、`build` 与人工联调
- 本地开发使用 SQLite，生产部署使用 PostgreSQL，两者 Prisma schema provider 不同，需维护两套 schema 或部署前切换

## 建议的下一步

- 补齐 Vercel + PostgreSQL 生产部署链路
- 补齐验证码与 AI 识别，使实现与 PRD 更一致
- 增加基础接口 / 组件测试
- 收口设置页内容
