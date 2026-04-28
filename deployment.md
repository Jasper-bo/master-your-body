# VitalPulse 部署架构文档

> 版本: v1.0.0
> 日期: 2026-04-28
> 适用产品: VitalPulse 健康管理系统
> 技术栈: Next.js 15 + PostgreSQL 15 + Prisma + DeepSeek API

---

## 1. 部署概述

VitalPulse 采用**纯本地部署**模式，所有服务运行在同一台物理机或虚拟机内，不依赖外部云数据库或托管服务。

- **应用服务**: Next.js 全栈应用（App Router + API Routes），监听端口 `3000`
- **数据库**: PostgreSQL，监听端口 `5432`
- **外部依赖**: 仅 DeepSeek API（食物拍照识别），通过 HTTPS 出站调用
- **数据安全**: 所有用户健康数据、饮食记录、训练记录均存储于本地 PostgreSQL，不上传第三方

---

## 2. 系统要求

### 2.1 操作系统

| 系统 | 版本要求 | 备注 |
|------|----------|------|
| Linux | Ubuntu 22.04 LTS / Debian 12 / CentOS Stream 9 | 推荐生产环境 |
| macOS | macOS 13 (Ventura) 及以上 | 适合开发或单机使用 |
| Windows | Windows 10/11 + WSL2 (Ubuntu 22.04) | 必须通过 WSL2 运行 |

### 2.2 运行时版本

| 组件 | 最低版本 | 推荐版本 | 验证命令 |
|------|----------|----------|----------|
| Node.js | 18.17.0 | 20 LTS | `node -v` |
| npm / pnpm / yarn | npm 9+ / pnpm 8+ | pnpm 9 | `pnpm -v` |
| PostgreSQL | 15.0 | 15.x | `psql --version` |

### 2.3 最低硬件规格

| 场景 | CPU | 内存 | 磁盘 | 网络 |
|------|-----|------|------|------|
| 个人单机使用 | 2 核 | 4 GB | 20 GB SSD | 可访问 DeepSeek API |
| 家庭/小团队共享 | 4 核 | 8 GB | 50 GB SSD | 同上 |

> **注意**: AI 拍照识别由 DeepSeek 云端处理，本地仅做图片中转，无需 GPU。

---

## 3. 服务架构

```
┌─────────────┐      HTTP (port 3000)       ┌─────────────────────┐
│   Browser   │  ←────────────────────────→  │   Next.js App       │
│  (用户端)    │                              │   (localhost:3000)  │
└─────────────┘                              └──────────┬──────────┘
                                                        │
                              PostgreSQL TCP (port 5432)│
                                                        ↓
                                              ┌─────────────────────┐
                                              │   PostgreSQL 15     │
                                              │   (localhost:5432)  │
                                              └─────────────────────┘
                                                        ↑
                                                        │ Prisma ORM
                                                        │
┌───────────────────────────────────────────────────────┘
│
│  HTTPS (出站)
│
↓
┌─────────────────────┐
│   DeepSeek API      │
│  (api.deepseek.com) │
└─────────────────────┘
```

### 3.1 端口占用清单

| 服务 | 端口 | 协议 | 监听地址 | 说明 |
|------|------|------|----------|------|
| Next.js | 3000 | TCP | `0.0.0.0` 或 `127.0.0.1` | 可通过环境变量 `PORT` 修改 |
| PostgreSQL | 5432 | TCP | `127.0.0.1` | 建议仅监听本地，不暴露公网 |

---

## 4. 部署步骤

### 4.1 安装 PostgreSQL

**Ubuntu / Debian:**

```bash
# 更新源并安装 PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# 设置开机自启并启动
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 验证状态
sudo systemctl status postgresql
```

**macOS (使用 Homebrew):**

```bash
brew install postgresql@15
brew services start postgresql@15

# 验证
psql --version
```

**WSL2 (Ubuntu):**

与 Ubuntu 步骤相同。安装完成后，确保 Windows 防火墙不拦截 WSL 内部端口。

### 4.2 创建数据库与用户

```bash
# 切换到 postgres 系统用户
sudo -iu postgres

# 进入 psql 命令行
psql
```

在 `psql` 内执行:

```sql
-- 创建应用专用数据库用户（建议不使用 postgres 超级用户）
CREATE USER vitalpulse WITH PASSWORD 'your_secure_password_here' LOGIN CREATEDB;

-- 创建应用数据库
CREATE DATABASE vitalpulse_db OWNER vitalpulse ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';

-- 启用 UUID 扩展（Prisma 需要）
\c vitalpulse_db
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 验证
\du
\l

-- 退出
\q
```

> **安全提示**: 将 `your_secure_password_here` 替换为强密码，并妥善记录。

### 4.3 获取项目代码并安装依赖

```bash
# 进入项目目录（根据实际情况调整）
cd /opt/vitalpulse
# 或 cd /Users/junbohe/Downloads/stitch_body_health_insight_tracker

# 安装 Node.js 依赖（推荐使用 pnpm）
pnpm install

# 安装 Prisma CLI（如未包含在依赖中）
pnpm add -D prisma
```

### 4.4 配置环境变量

在项目根目录创建 `.env` 文件:

```bash
cp .env.example .env
```

编辑 `.env`，填入以下必需变量:

```env
# ============================================
# 数据库连接
# ============================================
DATABASE_URL="postgresql://vitalpulse:your_secure_password_here@localhost:5432/vitalpulse_db?schema=public"

# ============================================
# JWT 认证（必须设置，否则无法登录）
# ============================================
JWT_SECRET="your_random_jwt_secret_min_32_chars_long"
JWT_REFRESH_SECRET="your_random_refresh_secret_min_32_chars_long"

# ============================================
# DeepSeek AI API（食物拍照识别）
# ============================================
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL="deepseek-chat"

# ============================================
# 应用基础配置
# ============================================
NEXTAUTH_URL="http://localhost:3000"
PORT=3000
NODE_ENV="production"

# ============================================
# 可选: 日志级别
# ============================================
LOG_LEVEL="info"
```

> **生成随机 JWT Secret:**
>
> ```bash
> openssl rand -base64 32
> ```

### 4.5 执行 Prisma 迁移

```bash
# 生成 Prisma Client
pnpm prisma generate

# 执行数据库迁移（创建所有表结构）
pnpm prisma migrate deploy
```

> 首次部署应使用 `migrate deploy`；开发环境使用 `migrate dev`。

### 4.6 插入种子数据

项目提供内置 seed 脚本，用于初始化系统基础数据:

```bash
# 执行 Prisma Seed
pnpm prisma db seed
```

**Seed 数据内容包括:**

| 数据表 | 内容 | 数量 |
|--------|------|------|
| `system_info` | 应用版本、开发者信息、隐私政策 | 1 条 |
| `food_categories` | 主食类、肉类、蔬菜类、油脂用量 | 4 条 |
| `food_items` | 糙米饭、鸡胸肉、西兰花等 | 15 条 |
| `exercise_categories` | 胸部、背部、肩部、腿部、有氧 | 5 条 |
| `exercises` | 卧推、深蹲、跑步机等 | 14 条 |

如果项目未配置 `prisma.seed` 字段，可手动运行:

```bash
npx tsx prisma/seed.ts
# 或
node prisma/seed.js
```

### 4.7 创建数据库触发器（如未包含在迁移中）

根据 `data-schema.md`，`user_profiles` 表需要触发器来自动重新计算营养目标:

```bash
# 进入 psql
sudo -iu postgres psql -d vitalpulse_db
```

执行以下 SQL（如 Prisma 迁移未包含）:

```sql
-- 创建触发器函数: 用户档案变更时自动重新计算每日营养目标
CREATE OR REPLACE FUNCTION recalculate_user_targets()
RETURNS TRIGGER AS $$
BEGIN
    -- 仅当关键字段变更时重新计算
    IF (OLD.height_cm IS DISTINCT FROM NEW.height_cm) OR
       (OLD.weight_kg IS DISTINCT FROM NEW.weight_kg) OR
       (OLD.age IS DISTINCT FROM NEW.age) OR
       (OLD.gender IS DISTINCT FROM NEW.gender) OR
       (OLD.activity_level IS DISTINCT FROM NEW.activity_level) OR
       (OLD.fitness_goal IS DISTINCT FROM NEW.fitness_goal) THEN

        -- BMI
        NEW.daily_calorie_target := CASE
            WHEN NEW.fitness_goal = 'lose_weight' THEN
                (10 * NEW.weight_kg + 6.25 * NEW.height_cm - 5 * NEW.age +
                 CASE WHEN NEW.gender = 'male' THEN 5 ELSE -161 END) *
                CASE NEW.activity_level
                    WHEN 'sedentary' THEN 1.2
                    WHEN 'lightly_active' THEN 1.375
                    WHEN 'moderately_active' THEN 1.55
                    WHEN 'very_active' THEN 1.725
                END - 500
            WHEN NEW.fitness_goal = 'gain_muscle' THEN
                (10 * NEW.weight_kg + 6.25 * NEW.height_cm - 5 * NEW.age +
                 CASE WHEN NEW.gender = 'male' THEN 5 ELSE -161 END) *
                CASE NEW.activity_level
                    WHEN 'sedentary' THEN 1.2
                    WHEN 'lightly_active' THEN 1.375
                    WHEN 'moderately_active' THEN 1.55
                    WHEN 'very_active' THEN 1.725
                END + 300
            ELSE
                (10 * NEW.weight_kg + 6.25 * NEW.height_cm - 5 * NEW.age +
                 CASE WHEN NEW.gender = 'male' THEN 5 ELSE -161 END) *
                CASE NEW.activity_level
                    WHEN 'sedentary' THEN 1.2
                    WHEN 'lightly_active' THEN 1.375
                    WHEN 'moderately_active' THEN 1.55
                    WHEN 'very_active' THEN 1.725
                END
        END::integer;

        -- 蛋白质目标
        NEW.daily_protein_target_g := CASE
            WHEN NEW.fitness_goal = 'maintain' THEN ROUND(NEW.weight_kg * 1.6)::integer
            ELSE ROUND(NEW.weight_kg * 2.0)::integer
        END;

        -- 脂肪目标
        NEW.daily_fat_target_g := ROUND(NEW.weight_kg * 0.9)::integer;

        -- 碳水目标 = (热量 - 蛋白质热量 - 脂肪热量) / 4
        NEW.daily_carbs_target_g := GREATEST(50,
            (NEW.daily_calorie_target - NEW.daily_protein_target_g * 4 - NEW.daily_fat_target_g * 9) / 4
        )::integer;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 绑定触发器
DROP TRIGGER IF EXISTS trg_update_profile_targets ON user_profiles;
CREATE TRIGGER trg_update_profile_targets
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_user_targets();
```

### 4.8 构建 Next.js 生产包

```bash
# 清理旧构建（如有）
rm -rf .next

# 构建生产版本
pnpm build
```

构建成功后，`.next` 目录将包含所有静态资源和服务端代码。

### 4.9 启动生产服务器

```bash
# 方式一: 直接启动（前台运行，适合首次验证）
pnpm start

# 方式二: 使用进程管理器后台运行（推荐生产环境）
# 安装 PM2
pnpm add -g pm2

# 启动
pm2 start pnpm --name "vitalpulse" -- start

# 保存 PM2 配置以便开机自启
pm2 save
pm2 startup
```

启动后，在浏览器访问:

```
http://localhost:3000
```

---

## 5. 数据库初始化流程（详细）

### 5.1 完整初始化命令序列

```bash
#!/bin/bash
# save as: scripts/init-db.sh

set -e

echo "[1/6] 检查 PostgreSQL 状态..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "错误: PostgreSQL 未启动"
    exit 1
fi

echo "[2/6] 生成 Prisma Client..."
pnpm prisma generate

echo "[3/6] 部署数据库迁移..."
pnpm prisma migrate deploy

echo "[4/6] 插入种子数据..."
pnpm prisma db seed

echo "[5/6] 验证核心表..."
psql "$DATABASE_URL" -c "
    SELECT 'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'food_items', COUNT(*) FROM food_items
    UNION ALL
    SELECT 'exercises', COUNT(*) FROM exercises
    UNION ALL
    SELECT 'system_info', COUNT(*) FROM system_info;
"

echo "[6/6] 数据库初始化完成"
```

赋予执行权限并运行:

```bash
chmod +x scripts/init-db.sh
./scripts/init-db.sh
```

### 5.2 迁移执行顺序

Prisma 迁移按文件名时间戳顺序执行，首次部署的表创建顺序通常为:

1. `users` — 用户基础表
2. `user_profiles` — 用户档案与营养目标
3. `food_categories` / `exercise_categories` — 分类表
4. `food_items` / `exercises` — 系统预设库
5. `daily_nutrition` / `health_checklist` / `health_scores` — 每日聚合表
6. `meal_records` / `meal_foods` — 饮食明细
7. `workout_records` / `workout_exercises` — 训练明细
8. `food_photos` / `app_settings` / `system_info` / `captchas` / `refresh_tokens` — 辅助表

### 5.3 种子数据手动验证

```bash
# 验证食物库
psql "$DATABASE_URL" -c "SELECT name, category_id, calories_per_100g FROM food_items WHERE is_system = true;"

# 验证动作库
psql "$DATABASE_URL" -c "SELECT name, category_id, is_cardio FROM exercises WHERE is_system = true;"

# 验证系统信息
psql "$DATABASE_URL" -c "SELECT app_name, app_version, is_current FROM system_info WHERE is_current = true;"
```

---

## 6. 启动顺序

每次服务器重启后，按以下顺序启动服务:

### 6.1 标准启动流程

```bash
# 步骤 1: 启动 PostgreSQL
sudo systemctl start postgresql        # Linux
brew services start postgresql@15      # macOS

# 步骤 2: 等待数据库就绪（约 2-3 秒）
until pg_isready -h localhost -p 5432; do
    echo "等待 PostgreSQL 就绪..."
    sleep 1
done

# 步骤 3: 验证数据库连接
psql "postgresql://vitalpulse:your_password@localhost:5432/vitalpulse_db" -c "SELECT 1;"

# 步骤 4: 运行迁移（确保表结构最新）
cd /opt/vitalpulse
pnpm prisma migrate deploy

# 步骤 5: 生成 Prisma Client（如 schema 有变更）
pnpm prisma generate

# 步骤 6: 启动 Next.js 应用
pnpm start
```

### 6.2 使用 systemd 服务自动启动（Linux）

创建 `/etc/systemd/system/vitalpulse.service`:

```ini
[Unit]
Description=VitalPulse Health Management App
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/vitalpulse
ExecStart=/usr/local/bin/pnpm start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

# 安全加固
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/vitalpulse/.next /opt/vitalpulse/tmp

[Install]
WantedBy=multi-user.target
```

启用并启动:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vitalpulse
sudo systemctl start vitalpulse
sudo systemctl status vitalpulse
```

### 6.3 健康检查端点验证

启动后，验证以下端点确保服务正常:

```bash
# 1. 应用根路径
curl -s http://localhost:3000 | head -n 5

# 2. 公开 API: 应用信息
curl -s http://localhost:3000/api/settings/app-info | jq

# 3. 公开 API: 图形验证码（认证模块前置）
curl -s -X POST http://localhost:3000/api/auth/captcha | jq

# 4. 数据库连接验证（通过 Prisma）
curl -s http://localhost:3000/api/health || echo "如未实现 /api/health，可跳过"
```

---

## 7. 日常运维

### 7.1 PostgreSQL 备份与恢复

**手动备份:**

```bash
# 全量备份（推荐每日执行）
BACKUP_DIR="/opt/backups/vitalpulse"
mkdir -p "$BACKUP_DIR"

dump_file="$BACKUP_DIR/vitalpulse_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h localhost -U vitalpulse -d vitalpulse_db -Fc > "$dump_file"

echo "备份完成: $dump_file"
```

**自动备份（crontab）:**

```bash
# 编辑 crontab
crontab -e

# 添加以下行: 每天凌晨 3 点自动备份
0 3 * * * /opt/vitalpulse/scripts/backup-db.sh >> /var/log/vitalpulse/backup.log 2>&1

# 保留最近 14 天备份
0 4 * * * find /opt/backups/vitalpulse -name "vitalpulse_*.sql" -mtime +14 -delete
```

**恢复备份:**

```bash
# 停止应用
sudo systemctl stop vitalpulse

# 重建空数据库
sudo -iu postgres psql -c "DROP DATABASE IF EXISTS vitalpulse_db;"
sudo -iu postgres psql -c "CREATE DATABASE vitalpulse_db OWNER vitalpulse;"

# 恢复数据
pg_restore -h localhost -U vitalpulse -d vitalpulse_db --no-owner --no-privileges vitalpulse_20260428_030000.sql

# 重启应用
sudo systemctl start vitalpulse
```

### 7.2 查看日志

**Next.js 应用日志:**

```bash
# PM2 日志
pm2 logs vitalpulse

# systemd 日志
sudo journalctl -u vitalpulse -f -n 200

# 直接查看输出（如前台运行）
cat /opt/vitalpulse/logs/app.log
```

**PostgreSQL 日志:**

```bash
# Ubuntu / Debian
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# macOS (Homebrew)
tail -f /usr/local/var/log/postgresql@15.log
```

**日志轮转建议:**

```bash
# 安装 logrotate（如未安装）
sudo apt install -y logrotate

# 创建配置 /etc/logrotate.d/vitalpulse
sudo tee /etc/logrotate.d/vitalpulse << 'EOF'
/opt/vitalpulse/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        pm2 reload vitalpulse > /dev/null 2>&1 || true
    endscript
}
EOF
```

### 7.3 重启服务

```bash
# 仅重启应用（不影响数据库）
pm2 restart vitalpulse
# 或
sudo systemctl restart vitalpulse

# 完整重启（应用 + 数据库）
sudo systemctl restart postgresql
sleep 3
sudo systemctl restart vitalpulse

# 验证重启后状态
curl -s http://localhost:3000/api/settings/app-info | jq '.data.version'
```

### 7.4 更新部署流程

```bash
# 1. 进入项目目录
cd /opt/vitalpulse

# 2. 拉取最新代码（假设使用 git）
git pull origin main

# 3. 安装新依赖
pnpm install

# 4. 执行数据库迁移（如有 schema 变更）
pnpm prisma migrate deploy

# 5. 重新生成 Prisma Client
pnpm prisma generate

# 6. 重新构建
pnpm build

# 7. 重启服务
pm2 restart vitalpulse
# 或
sudo systemctl restart vitalpulse

# 8. 验证
sleep 3
curl -s http://localhost:3000/api/settings/app-info | jq
```

> **回滚策略**: 更新前务必执行数据库备份；如构建失败，不要重启服务，先修复代码。

---

## 8. 故障排查

### 8.1 数据库连接问题

**现象**: 应用启动报错 `Can't reach database server` 或 `connection refused`

**排查步骤:**

```bash
# 1. 检查 PostgreSQL 进程是否运行
sudo systemctl status postgresql
ps aux | grep postgres

# 2. 检查端口监听
ss -tlnp | grep 5432
# macOS: lsof -i :5432

# 3. 使用 psql 直接连接测试
psql "postgresql://vitalpulse:your_password@localhost:5432/vitalpulse_db" -c "SELECT version();"

# 4. 检查 .env 中的 DATABASE_URL 是否正确
grep DATABASE_URL /opt/vitalpulse/.env

# 5. 检查 PostgreSQL 监听配置
sudo cat /etc/postgresql/15/main/postgresql.conf | grep listen_addresses
# 确保包含: listen_addresses = 'localhost,127.0.0.1'

# 6. 检查 pg_hba.conf 本地认证规则
sudo cat /etc/postgresql/15/main/pg_hba.conf | grep -E "^(host|local)"
# 确保有: host vitalpulse_db vitalpulse 127.0.0.1/32 scram-sha-256
```

**常见修复:**

```bash
# PostgreSQL 未启动
sudo systemctl start postgresql

# 密码错误: 重置数据库用户密码
sudo -iu postgres psql -c "ALTER USER vitalpulse WITH PASSWORD 'new_password';"
# 然后同步更新 .env 中的 DATABASE_URL
```

### 8.2 JWT Secret 未设置

**现象**: 登录/注册接口返回 `500 Internal Server Error`，服务端日志显示 `JWT secret not provided` 或类似错误

**排查:**

```bash
# 检查 .env 文件是否存在且包含 JWT 配置
ls -la /opt/vitalpulse/.env
grep -E "JWT_SECRET|JWT_REFRESH_SECRET" /opt/vitalpulse/.env

# 检查环境变量是否被加载
node -e "console.log(process.env.JWT_SECRET ? '已设置' : '未设置')"
```

**修复:**

```bash
# 生成新的 JWT Secret
cd /opt/vitalpulse
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env

# 重启应用
pm2 restart vitalpulse
```

### 8.3 DeepSeek API 不可用

**现象**: AI 拍照识别返回 `503 Service Unavailable`，或超时无响应

**排查:**

```bash
# 1. 检查本地网络是否能访问 DeepSeek API
curl -I https://api.deepseek.com/v1/chat/completions

# 2. 检查 API Key 是否配置正确
grep DEEPSEEK_API_KEY /opt/vitalpulse/.env

# 3. 测试带认证的请求（验证 Key 有效性）
curl -s https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" | jq

# 4. 查看应用日志中的 DeepSeek 调用错误
pm2 logs vitalpulse --lines 50 | grep -i deepseek
```

**降级处理:**

如 DeepSeek API 长期不可用:

1. AI 拍照识别功能自动降级为手动录入（前端已有降级逻辑）
2. 检查账户余额与 API Key 有效期
3. 如需切换备用模型，修改 `.env` 中的 `DEEPSEEK_API_URL` 和 `DEEPSEEK_MODEL`

### 8.4 端口冲突

**现象**: 启动时报错 `EADDRINUSE: address already in use :::3000`

**排查:**

```bash
# 查找占用 3000 端口的进程
sudo lsof -i :3000
# 或
sudo ss -tlnp | grep 3000
```

**修复:**

```bash
# 方式一: 终止占用进程
kill -9 <PID>

# 方式二: 修改 Next.js 监听端口
export PORT=3001
pnpm start
# 同步修改 .env 中的 PORT=3001

# 方式三: 如果是旧应用进程残留
pm2 delete vitalpulse
pm2 start pnpm --name "vitalpulse" -- start
```

### 8.5 Prisma 迁移失败

**现象**: `prisma migrate deploy` 报错，提示迁移锁定或 schema 漂移

**排查与修复:**

```bash
# 查看迁移状态
pnpm prisma migrate status

# 如提示有未应用的迁移，先备份数据库，然后:
pnpm prisma migrate resolve --applied <迁移文件名>

# 如发生 schema 漂移（drift detected）
# 1. 备份数据库
# 2. 重置迁移基准（仅开发环境！生产环境严禁直接 reset）
# 生产环境正确做法: 创建修复迁移
pnpm prisma migrate dev --create-only --name fix_drift
# 然后手动编辑生成的 SQL，确保无损修复
```

### 8.6 种子数据重复或缺失

**现象**: 食物列表为空，或系统设置页面无版本信息

**修复:**

```bash
# 重新执行 seed（通常 seed 脚本会使用 UPSERT，不会重复插入）
pnpm prisma db seed

# 手动验证并补录
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM food_items;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM exercises;"
```

### 8.7 磁盘空间不足

**现象**: PostgreSQL 写入失败，或图片上传时报错

**排查:**

```bash
# 查看磁盘空间
df -h

# 查看 PostgreSQL 数据目录大小
du -sh /var/lib/postgresql/15/main/

# 查看应用日志大小
du -sh /opt/vitalpulse/logs/
```

**清理策略:**

```bash
# 清理 90 天前的过期训练/饮食记录（符合 data-schema.md 的保留策略）
psql "$DATABASE_URL" -c "
    DELETE FROM meal_records WHERE record_date < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM workout_records WHERE workout_date < CURRENT_DATE - INTERVAL '90 days';
    DELETE FROM captchas WHERE expires_at < NOW();
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
"

# 手动 VACUUM（回收磁盘空间）
sudo -iu postgres psql -d vitalpulse_db -c "VACUUM FULL;"
```

---

## 附录 A: 快速参考命令卡

```bash
# 一键启动（日常）
sudo systemctl start postgresql && cd /opt/vitalpulse && pnpm start

# 一键状态检查
curl -s http://localhost:3000/api/settings/app-info | jq
curl -s http://localhost:3000/api/auth/captcha | jq '.data.captchaToken'

# 数据库连接测试
pg_isready -h localhost -p 5432

# Prisma 常用
pnpm prisma studio          # 可视化数据库管理（开发调试用）
pnpm prisma migrate status  # 查看迁移状态
pnpm prisma db pull         # 从数据库反向生成 schema（如手动改表后）
pnpm prisma generate        # 重新生成 Client
```

## 附录 B: 文件清单

部署完成后，项目根目录应包含:

```
vitalpulse/
├── .env                    # 环境变量（不提交到 git）
├── .next/                  # Next.js 构建输出
├── node_modules/           # 依赖包
├── package.json            # 项目配置
├── pnpm-lock.yaml          # 锁定文件
├── prisma/
│   ├── schema.prisma       # 数据库模型定义
│   ├── migrations/         # 迁移文件目录
│   └── seed.ts             # 种子数据脚本
├── scripts/
│   ├── init-db.sh          # 数据库初始化脚本
│   └── backup-db.sh        # 备份脚本
└── src/                    # 应用源代码
    ├── app/                # Next.js App Router
    └── lib/                # 工具函数
```

---

*文档结束*
