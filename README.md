# VitalPulse / Stitch Body Health Insight Tracker

本仓库承载一个基于 Next.js 15 的全栈健康管理应用，应用代码位于 `my-app/`，产品文档与架构说明位于仓库根目录。本地开发和生产部署都以 PostgreSQL 作为数据库，生产目标为 Vercel + PostgreSQL。

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
- PostgreSQL 持久化
- JWT 鉴权与基础健康检查接口

尚未完全落地：

- 健康打卡输入：饮水量、睡眠时长
- 饮食 / 训练历史管理
- AI 拍照识别食物（千问/Qwen 多模态模型）
- 自动化测试体系
- 设置页当前只需要展示版本号和发布者 `贺俊博`

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript 5
- Prisma ORM
- PostgreSQL
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

### 本地开发（PostgreSQL）

#### 1. 环境要求

- Node.js 18.17+，推荐 Node.js 20 LTS
- 一个可访问的 PostgreSQL 数据库连接串，例如本机 PostgreSQL、Supabase、Neon 或 Vercel Postgres

#### 2. 配置并启动

```bash
cd my-app
npm install
npx prisma db push
npm run dev
```

访问 `http://localhost:3000` 即可使用。另一台电脑运行时，需要在 `my-app/.env.local` 中配置自己的 `DATABASE_URL`、`JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

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
| `QWEN_API_KEY` | 千问 API Key（启用 AI 拍照识别时需要） |

#### 3. 初始化数据库

```bash
npx prisma db push
```

> 当前项目统一使用 PostgreSQL，不再维护 SQLite / PostgreSQL provider 切换。详见 [deployment.md](./deployment.md)。

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

- **本地开发**：数据存储在 `.env.local` 指向的 PostgreSQL 数据库，端口 `3000`
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

- 历史方向中的图形验证码、DeepSeek、SQLite 和桌面打包已退出当前路线，应以当前 README 与 `docs/` 记忆文件为准
- AI 拍照识别尚未实现，后续供应商方向为千问/Qwen 多模态模型
- 自动化测试文件尚未建立，当前质量主要依赖 `lint`、`build` 与人工联调
- 设置页范围保持极简：版本号和发布者 `贺俊博`

## 建议的下一步

- 补齐 Vercel + PostgreSQL 生产部署链路
- 补齐健康打卡输入与饮食 / 训练历史管理
- 用千问/Qwen 多模态模型补齐 AI 拍照识别
- 增加基础接口 / 组件测试
- 将设置页收口为版本号与发布者信息
