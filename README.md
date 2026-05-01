# VitalPulse / Stitch Body Health Insight Tracker

本仓库承载一个本地优先的健康管理应用原型。当前可运行形态是一个基于 Next.js 15 的全栈 Web 应用，应用代码位于 `my-app/`，产品文档与架构说明位于仓库根目录。

项目目标是把“注册登录 -> 生成个性化计划 -> 记录饮食 -> 记录训练 -> 查看健康评分”做成一个可本地运行的最小闭环。当前版本已经具备这条主链路，但仍有部分 PRD 中提到的能力尚未落地，README 以下内容以当前代码现状为准。

## 当前状态

已实现：

- 手机号注册 / 登录
- 首次注册后的强制个性化计划弹窗
- 仪表盘：BMI、BMR、TDEE、营养进度、健康评分、7 日趋势
- 饮食模块：手动录入主食 / 肉类 / 蔬菜 / 油脂
- 训练模块：从预置动作库快速记录训练
- SQLite 本地持久化
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
- SQLite
- Tailwind CSS
- bcryptjs

## 仓库结构

```text
.
├── my-app/                    # 实际可运行应用
│   ├── src/app/               # 页面与 API Routes
│   ├── src/components/        # 业务组件
│   ├── src/lib/               # 客户端 / 服务端逻辑
│   ├── prisma/                # Prisma schema 与 SQLite 数据库
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

### 1. 环境要求

- Node.js 18.17+，推荐 Node.js 20 LTS
- npm 9+，推荐 npm 10+

### 2. 安装依赖

```bash
cd my-app
npm install
```

### 3. 配置环境变量

复制示例文件：

```bash
cp .env.example .env.local
```

最少需要确认以下配置：

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-32-bytes-or-longer-random-secret"
JWT_REFRESH_SECRET="replace-with-different-32-bytes-or-longer-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api"
```

说明：

- 默认 SQLite 数据库文件位于 `my-app/prisma/dev.db`
- `DEEPSEEK_*` 变量可以先保留示例值；当前代码主链路不依赖 AI 识别功能

### 4. 初始化 Prisma

```bash
npm run prisma:generate
npm run db:push
```

### 5. 启动开发环境

```bash
npm run dev
```

启动后访问：

- 应用首页：`http://localhost:3000`
- 健康检查：`http://localhost:3000/api/health`

### 6. 生产构建

```bash
npm run build
npm run start
```

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

- 应用默认以本地 Web 服务形式运行，端口为 `3000`
- 数据默认存储在本地 SQLite 文件，不依赖外部数据库服务
- 当前仓库中的设计文档包含更完整的远期规划，但代码仍以本地优先、单机可运行版本为主
- 如果后续要做桌面安装包，需要把数据库路径迁移到系统用户数据目录，而不是继续放在源码目录

## 文档导航

- [prd.md](./prd.md): 产品范围、MVP 定义、路线图
- [function.md](./function.md): 模块级功能说明
- [frontend-architecture.md](./frontend-architecture.md): 前端结构与页面设计
- [data-schema.md](./data-schema.md): 数据模型与表结构说明
- [interface.md](./interface.md): 接口契约草案
- [env-config.md](./env-config.md): 环境变量详细解释
- [deployment.md](./deployment.md): 本地部署与后续桌面化说明

## 已知差异与风险

- 仓库文档中提到的图形验证码、AI 拍照识别、完整设置页与桌面打包仍未全部实现
- 目前以手动录入饮食和训练为主，更适合原型验证、内测或个人本地使用
- 自动化测试文件尚未建立，当前质量主要依赖 `lint`、`build` 与人工联调

## 建议的下一步

- 补齐验证码与 AI 识别，使实现与 PRD 更一致
- 增加基础接口 / 组件测试
- 收口设置页内容
- 规划 Electron 或 Tauri 桌面壳，把源码运行形态升级为可分发安装包
