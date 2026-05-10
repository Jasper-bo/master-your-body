# Stitch Body Health Insight Tracker — 数据结构文档

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 产品名称 | Stitch Body Health Insight Tracker |
| 技术栈 | Next.js 全栈（App Router + API Routes）、PostgreSQL、Prisma ORM |
| 编码规范 | 表名/字段名 snake_case，全小写 |
| 时区处理 | 所有时间戳由 Prisma `DateTime` 写入，UTC 存储，应用层按 `Asia/Shanghai` 展示 |
| ID 策略 | 主键使用 Prisma `String @default(uuid())` |

> 数据库实现说明：本地开发和生产环境统一使用 PostgreSQL。Prisma schema 是数据库结构源头，避免维护 SQLite / PostgreSQL 两套 provider。日期和时间统一用 Prisma `DateTime` 映射。

---

## 2. 实体关系总览（ER 图文字描述）

```
users ||--o| user_profiles : "拥有档案"
users ||--o{ daily_nutrition : "每日汇总"
users ||--o{ meal_records : "记录餐食"
users ||--o{ health_checklist : "每日打卡"
users ||--o{ health_scores : "健康评分"
users ||--o{ workout_records : "执行训练"
users ||--o{ app_settings : "个性化设置"
users ||--o{ food_photos : "拍照识别日志"

meal_records ||--o{ meal_foods : "包含食物"
meal_foods }o--|| food_items : "引用食物"
food_items }o--|| food_categories : "属于分类"

workout_records ||--o{ workout_exercises : "执行动作"
workout_exercises }o--|| exercises : "引用动作"
exercises }o--|| exercise_categories : "属于部位"
```

---

## 3. 数据表详细定义

### 3.1 users（用户表）

存储系统用户的基础认证信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 用户唯一标识 |
| phone | varchar(15) | NOT NULL, UNIQUE | 手机号，纯数字，长度 8-15 位 |
| password_hash | varchar(255) | NOT NULL | bcrypt 哈希密码，cost factor >= 10 |
| is_active | boolean | NOT NULL, DEFAULT true | 账号是否激活 |
| last_login_at | timestamptz | NULLABLE | 最后登录时间 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 注册时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**索引：**
- `idx_users_phone` (phone) — 登录查询

---

### 3.2 user_profiles（用户档案 / 身体数据表）

存储用户的身体指标、运动偏好及自动计算的营养目标。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 档案 ID |
| user_id | uuid | NOT NULL, UNIQUE, REFERENCES users(id) ON DELETE CASCADE | 关联用户 |
| nickname | varchar(50) | NULLABLE | 昵称 |
| gender | varchar(10) | NOT NULL, CHECK (gender IN ('male','female','other')) | 性别：男/女/其他 |
| age | integer | NOT NULL, CHECK (age BETWEEN 10 AND 100) | 年龄（岁） |
| height_cm | decimal(5,2) | NOT NULL, CHECK (height_cm > 50 AND height_cm < 300) | 身高（厘米） |
| weight_kg | decimal(5,2) | NOT NULL, CHECK (weight_kg > 20 AND weight_kg < 500) | 体重（公斤） |
| activity_level | varchar(20) | NOT NULL, CHECK (activity_level IN ('sedentary','lightly_active','moderately_active','very_active')) | 运动频率 |
| fitness_goal | varchar(20) | NOT NULL, CHECK (fitness_goal IN ('lose_weight','maintain','gain_muscle')) | 健身目标 |
| daily_calorie_target | integer | NOT NULL, CHECK (daily_calorie_target > 500) | 每日热量目标（kcal） |
| daily_protein_target_g | integer | NOT NULL, CHECK (daily_protein_target_g > 0) | 每日蛋白质目标（g） |
| daily_carbs_target_g | integer | NOT NULL, CHECK (daily_carbs_target_g > 0) | 每日碳水目标（g） |
| daily_fat_target_g | integer | NOT NULL, CHECK (daily_fat_target_g > 0) | 每日脂肪目标（g） |
| water_target_ml | integer | NOT NULL, DEFAULT 2000 | 每日饮水目标（ml） |
| sleep_target_hours | decimal(3,1) | NOT NULL, DEFAULT 7.5 | 每日睡眠目标（小时） |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**索引：**
- `idx_profiles_user_id` (user_id) — 一对一快速关联

**触发器：**
- `trg_update_profile_targets`：当 height_cm、weight_kg、age、activity_level、fitness_goal、gender 变更时，自动重新计算 `daily_calorie_target` 及三大营养素目标。

---

### 3.3 daily_nutrition（每日营养汇总表）

按天聚合用户的营养摄入，用于仪表盘快速展示，避免实时聚合大量 meal_records。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| record_date | date | NOT NULL | 记录日期 |
| total_calories | integer | NOT NULL, DEFAULT 0 | 总热量（kcal） |
| total_protein_g | decimal(6,2) | NOT NULL, DEFAULT 0 | 总蛋白质（g） |
| total_carbs_g | decimal(6,2) | NOT NULL, DEFAULT 0 | 总碳水（g） |
| total_fat_g | decimal(6,2) | NOT NULL, DEFAULT 0 | 总脂肪（g） |
| calories_target | integer | NOT NULL | 当日热量目标 |
| protein_target_g | integer | NOT NULL | 当日蛋白质目标 |
| carbs_target_g | integer | NOT NULL | 当日碳水目标 |
| fat_target_g | integer | NOT NULL | 当日脂肪目标 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**约束：**
- `UNIQUE (user_id, record_date)` — 每个用户每天仅一条汇总记录

**索引：**
- `idx_daily_nutrition_user_date` (user_id, record_date DESC) — 仪表盘最近 7 天查询

---

### 3.4 food_categories（食物分类表）

系统预设的食物分类，支持前端 4 大分类录入。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 分类 ID |
| name | varchar(50) | NOT NULL, UNIQUE | 分类名称 |
| sort_order | integer | NOT NULL, DEFAULT 0 | 前端展示排序 |
| icon | varchar(50) | NULLABLE | 图标标识符 |
| is_system | boolean | NOT NULL, DEFAULT true | 是否系统预设 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**索引：**
- `idx_food_categories_sort` (sort_order)

**种子数据：**

| name | sort_order |
|------|------------|
| 主食类 | 1 |
| 肉类 | 2 |
| 蔬菜类 | 3 |
| 油脂用量 | 4 |

---

### 3.5 food_items（食物库表）

系统预设的食物及其基础营养成分（以每 100g 计）。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 食物 ID |
| name | varchar(100) | NOT NULL | 食物名称 |
| category_id | uuid | NOT NULL, REFERENCES food_categories(id) ON DELETE RESTRICT | 所属分类 |
| calories_per_100g | integer | NOT NULL, CHECK (calories_per_100g >= 0) | 每 100g 热量（kcal） |
| protein_per_100g | decimal(6,2) | NOT NULL, DEFAULT 0 | 每 100g 蛋白质（g） |
| carbs_per_100g | decimal(6,2) | NOT NULL, DEFAULT 0 | 每 100g 碳水（g） |
| fat_per_100g | decimal(6,2) | NOT NULL, DEFAULT 0 | 每 100g 脂肪（g） |
| unit | varchar(20) | NOT NULL, DEFAULT 'g' | 默认计量单位 |
| is_system | boolean | NOT NULL, DEFAULT true | 是否系统预设 |
| is_active | boolean | NOT NULL, DEFAULT true | 是否可用 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**索引：**
- `idx_food_items_category` (category_id)
- `idx_food_items_name` (name) — 支持前端搜索
- `idx_food_items_system_active` (is_system, is_active)

**种子数据（15 种）：**

| name | category_id | calories_per_100g | protein_per_100g | carbs_per_100g | fat_per_100g |
|------|-------------|-------------------|------------------|----------------|--------------|
| 糙米饭 | [主食类] | 130 | 2.7 | 28.0 | 0.9 |
| 全麦面包 | [主食类] | 247 | 13.0 | 41.0 | 3.4 |
| 红薯 | [主食类] | 86 | 1.6 | 20.1 | 0.1 |
| 燕麦 | [主食类] | 389 | 16.9 | 66.3 | 6.9 |
| 意面 | [主食类] | 157 | 5.8 | 30.9 | 0.9 |
| 鸡胸肉 | [肉类] | 165 | 31.0 | 0.0 | 3.6 |
| 三文鱼 | [肉类] | 208 | 20.0 | 0.0 | 13.0 |
| 瘦牛肉 | [肉类] | 250 | 26.0 | 0.0 | 15.0 |
| 虾仁 | [肉类] | 85 | 20.0 | 0.0 | 0.5 |
| 豆腐 | [肉类] | 76 | 8.0 | 1.9 | 4.8 |
| 西兰花 | [蔬菜类] | 34 | 2.8 | 7.0 | 0.4 |
| 菠菜 | [蔬菜类] | 23 | 2.9 | 3.6 | 0.4 |
| 生菜 | [蔬菜类] | 15 | 1.4 | 2.9 | 0.2 |
| 西红柿 | [蔬菜类] | 18 | 0.9 | 3.9 | 0.2 |
| 胡萝卜 | [蔬菜类] | 41 | 0.9 | 9.6 | 0.2 |

---

### 3.6 meal_records（餐食记录表）

记录用户每一餐（早餐/午餐/晚餐/加餐）的汇总信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 餐食 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| record_date | date | NOT NULL | 记录日期 |
| meal_type | varchar(20) | NOT NULL, CHECK (meal_type IN ('breakfast','lunch','dinner','snack')) | 餐别 |
| total_calories | integer | NOT NULL, DEFAULT 0 | 本餐总热量 |
| total_protein_g | decimal(6,2) | NOT NULL, DEFAULT 0 | 本餐蛋白质 |
| total_carbs_g | decimal(6,2) | NOT NULL, DEFAULT 0 | 本餐碳水 |
| total_fat_g | decimal(6,2) | NOT NULL, DEFAULT 0 | 本餐脂肪 |
| note | varchar(255) | NULLABLE | 用户备注 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**索引：**
- `idx_meal_records_user_date` (user_id, record_date DESC) — 按日查询
- `idx_meal_records_user_date_type` (user_id, record_date, meal_type) — 按餐别查询

---

### 3.7 meal_foods（餐食-食物关联表）

记录每餐中包含的具体食物及克数，是计算营养的基础明细。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 关联 ID |
| meal_record_id | uuid | NOT NULL, REFERENCES meal_records(id) ON DELETE CASCADE | 所属餐食 |
| food_item_id | uuid | NOT NULL, REFERENCES food_items(id) ON DELETE RESTRICT | 食物 |
| quantity_g | decimal(6,2) | NOT NULL, CHECK (quantity_g > 0) | 摄入克数 |
| calculated_calories | integer | NOT NULL | 计算后热量 |
| calculated_protein_g | decimal(6,2) | NOT NULL | 计算后蛋白质 |
| calculated_carbs_g | decimal(6,2) | NOT NULL | 计算后碳水 |
| calculated_fat_g | decimal(6,2) | NOT NULL | 计算后脂肪 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**索引：**
- `idx_meal_foods_meal` (meal_record_id)
- `idx_meal_foods_food` (food_item_id)

---

### 3.8 food_photos（AI 拍照识别日志表）

仅记录 AI 识别请求日志，不保存原始图片，分析完即丢弃。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| recognized_food_name | varchar(100) | NULLABLE | AI 识别出的食物名 |
| protein_g | decimal(6,2) | NULLABLE | AI 识别蛋白质（g） |
| carbs_g | decimal(6,2) | NULLABLE | AI 识别碳水（g） |
| fat_g | decimal(6,2) | NULLABLE | AI 识别脂肪（g） |
| status | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK (status IN ('pending','success','failed')) | 识别状态 |
| error_message | text | NULLABLE | 失败原因 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| completed_at | timestamptz | NULLABLE | 识别完成时间 |

**索引：**
- `idx_food_photos_user` (user_id, created_at DESC) — 用户识别历史

---

### 3.9 health_checklist（健康打卡表）

每日 3 项健康打卡的完成状态。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| record_date | date | NOT NULL | 记录日期 |
| water_intake | boolean | NOT NULL, DEFAULT false | 水分补充是否达标（>= 2000ml） |
| sleep_quality | boolean | NOT NULL, DEFAULT false | 睡眠质量是否达标（>= 7.5h） |
| exercise_done | boolean | NOT NULL, DEFAULT false | 运动锻炼是否完成 |
| water_intake_ml | integer | NOT NULL, DEFAULT 0 | 实际饮水量（ml） |
| sleep_actual_hours | decimal(3,1) | NULLABLE | 实际睡眠时长（小时） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**约束：**
- `UNIQUE (user_id, record_date)`

**索引：**
- `idx_health_checklist_user_date` (user_id, record_date DESC)

---

### 3.10 health_scores（健康评分历史表）

每日综合健康评分及分项得分，支持趋势图表。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| record_date | date | NOT NULL | 记录日期 |
| total_score | integer | NOT NULL, CHECK (total_score BETWEEN 0 AND 100) | 总评分 0-100 |
| grade | varchar(2) | NOT NULL, CHECK (grade IN ('A','B','C','D')) | 等级：A>=90, B>=75, C>=60, D<60 |
| nutrition_score | integer | NOT NULL, CHECK (nutrition_score BETWEEN 0 AND 25) | 营养得分（25 分制） |
| exercise_score | integer | NOT NULL, CHECK (exercise_score BETWEEN 0 AND 25) | 运动得分（25 分制） |
| sleep_score | integer | NOT NULL, CHECK (sleep_score BETWEEN 0 AND 25) | 睡眠得分（25 分制） |
| hydration_score | integer | NOT NULL, CHECK (hydration_score BETWEEN 0 AND 25) | hydration 得分（25 分制） |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**约束：**
- `UNIQUE (user_id, record_date)`

**索引：**
- `idx_health_scores_user_date` (user_id, record_date DESC) — 7 日趋势查询

---

### 3.11 exercise_categories（动作分类 / 部位表）

训练动作的身体部位分类。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 分类 ID |
| name | varchar(50) | NOT NULL, UNIQUE | 部位名称 |
| sort_order | integer | NOT NULL, DEFAULT 0 | 展示排序 |
| icon | varchar(50) | NULLABLE | 图标标识符 |
| is_system | boolean | NOT NULL, DEFAULT true | 是否系统预设 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**索引：**
- `idx_exercise_categories_sort` (sort_order)

**种子数据：**

| name | sort_order |
|------|------------|
| 胸部 | 1 |
| 背部 | 2 |
| 肩部 | 3 |
| 腿部 | 4 |
| 有氧 | 5 |

---

### 3.12 exercises（动作库表）

系统预设的训练动作。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 动作 ID |
| name | varchar(100) | NOT NULL | 动作名称 |
| category_id | uuid | NOT NULL, REFERENCES exercise_categories(id) ON DELETE RESTRICT | 所属部位 |
| description | text | NULLABLE | 动作说明 |
| is_cardio | boolean | NOT NULL, DEFAULT false | 是否为有氧运动 |
| default_sets | integer | NULLABLE, CHECK (default_sets > 0) | 默认组数 |
| default_reps | integer | NULLABLE, CHECK (default_reps > 0) | 默认次数 |
| default_duration_min | integer | NULLABLE, CHECK (default_duration_min > 0) | 默认时长（分钟），有氧动作 |
| is_system | boolean | NOT NULL, DEFAULT true | 是否系统预设 |
| is_active | boolean | NOT NULL, DEFAULT true | 是否可用 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**索引：**
- `idx_exercises_category` (category_id)
- `idx_exercises_name` (name)
- `idx_exercises_cardio` (is_cardio)
- `idx_exercises_system_active` (is_system, is_active)

**种子数据（14 个）：**

| name | category_id | is_cardio | default_sets | default_reps | default_duration_min |
|------|-------------|-----------|--------------|--------------|----------------------|
| 卧推 | [胸部] | false | 4 | 10 | NULL |
| 上斜卧推 | [胸部] | false | 4 | 10 | NULL |
| 双杠臂屈伸 | [胸部] | false | 3 | 12 | NULL |
| 引体向上 | [背部] | false | 4 | 8 | NULL |
| 高位下拉 | [背部] | false | 4 | 12 | NULL |
| 坐姿划船 | [背部] | false | 4 | 12 | NULL |
| 侧平举 | [肩部] | false | 4 | 15 | NULL |
| 绳索侧平举 | [肩部] | false | 4 | 15 | NULL |
| 深蹲 | [腿部] | false | 4 | 10 | NULL |
| 保加利亚深蹲 | [腿部] | false | 3 | 10 | NULL |
| 哈克深蹲 | [腿部] | false | 4 | 10 | NULL |
| 跑步机 | [有氧] | true | NULL | NULL | 30 |
| 椭圆机 | [有氧] | true | NULL | NULL | 30 |
| 动感单车 | [有氧] | true | NULL | NULL | 30 |

---

### 3.13 workout_records（训练记录表）

用户每次实际执行的训练会话。支持同一天多次独立训练记录。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| workout_date | date | NOT NULL | 训练日期 |
| start_time | timestamptz | NULLABLE | 开始时间 |
| end_time | timestamptz | NULLABLE | 结束时间 |
| total_duration_min | integer | NOT NULL, DEFAULT 0 | 总时长（分钟） |
| total_exercises | integer | NOT NULL, DEFAULT 0 | 参与动作数 |
| total_sets_completed | integer | NOT NULL, DEFAULT 0 | 完成组数 |
| status | varchar(20) | NOT NULL, DEFAULT 'in_progress', CHECK (status IN ('in_progress','completed','cancelled')) | 训练状态 |
| notes | text | NULLABLE | 训练笔记 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**索引：**
- `idx_workout_records_user_date` (user_id, workout_date DESC) — 今日/昨日/本周统计
- `idx_workout_records_status` (user_id, status) — 已完成训练查询

---

### 3.14 workout_exercises（训练-动作关联 / 具体组数记录表）

记录一次训练中每个动作的具体执行详情。采用“每行代表一组”的细粒度设计。训练记录按动作名称保留独立记录展示，不合并组数。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| workout_record_id | uuid | NOT NULL, REFERENCES workout_records(id) ON DELETE CASCADE | 所属训练 |
| exercise_id | uuid | NOT NULL, REFERENCES exercises(id) ON DELETE RESTRICT | 动作 |
| exercise_order | integer | NOT NULL, DEFAULT 0 | 动作在训练中的顺序 |
| set_number | integer | NOT NULL, DEFAULT 1 | 第几组 |
| weight_kg | decimal(6,2) | NULLABLE, CHECK (weight_kg >= 0) | 负重（kg），力量训练 |
| reps | integer | NULLABLE, CHECK (reps > 0) | 次数，力量训练 |
| duration_min | decimal(5,1) | NULLABLE, CHECK (duration_min > 0) | 时长（分钟），有氧 |
| incline_percent | decimal(4,1) | NULLABLE | 坡度%，跑步机 |
| resistance_level | integer | NULLABLE | 阻力等级，椭圆机 |
| load_setting | varchar(20) | NULLABLE | 负荷设置，动感单车 |
| is_completed | boolean | NOT NULL, DEFAULT false | 该组是否完成 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**索引：**
- `idx_workout_exercises_workout` (workout_record_id, exercise_order, set_number)
- `idx_workout_exercises_exercise` (exercise_id)

---

### 3.15 app_settings（应用设置表）

用户级个性化设置，键值对存储。当前设置页只展示版本号和发布者 `贺俊博`，通常不需要写入用户级设置；该表保留给未来必要配置。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 用户 |
| setting_key | varchar(100) | NOT NULL | 设置键 |
| setting_value | text | NOT NULL | 设置值 |
| value_type | varchar(20) | NOT NULL, DEFAULT 'string', CHECK (value_type IN ('string','number','boolean','json')) | 值类型 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | 更新时间 |

**约束：**
- `UNIQUE (user_id, setting_key)`

**索引：**
- `idx_app_settings_user_key` (user_id, setting_key)

---

### 3.16 refresh_tokens（刷新令牌表）

存储 JWT Refresh Token，用于 Access Token 过期后无感刷新。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | 记录 ID |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | 关联用户 |
| token_hash | varchar(255) | NOT NULL, UNIQUE | Refresh Token 哈希值 |
| expires_at | timestamptz | NOT NULL | 过期时间（默认 7 天） |
| revoked | boolean | NOT NULL, DEFAULT false | 是否已撤销 |
| created_at | timestamptz | NOT NULL, DEFAULT now() | 创建时间 |

**索引：**
- `idx_refresh_tokens_user` (user_id, created_at DESC) — 查询用户有效令牌
- `idx_refresh_tokens_hash` (token_hash) — 验证时查询
- `idx_refresh_tokens_expires` (expires_at) — 定时清理过期令牌

---

## 4. 核心计算逻辑伪代码

### 4.1 BMI 计算

```
function calculateBMI(weight_kg, height_cm):
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ^ 2)
    return round(bmi, 1)

// 分级
function getBMICategory(bmi):
    if bmi < 18.5: return "偏瘦"
    if bmi < 24.0: return "正常"
    if bmi < 28.0: return "超重"
    return "肥胖"
```

### 4.2 BMR 计算（Mifflin-St Jeor 公式）

```
function calculateBMR(weight_kg, height_cm, age, gender):
    if gender == 'male':
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    return round(bmr)
```

### 4.3 TDEE 与营养目标计算

```
function calculateTDEE(bmr, activity_level):
    multipliers = {
        'sedentary': 1.2,          // 久坐不动
        'lightly_active': 1.375,   // 每周轻度运动 1-2 天
        'moderately_active': 1.55, // 每周中度运动 3-5 天
        'very_active': 1.725       // 每周剧烈运动 6-7 天
    }
    tdee = bmr * multipliers[activity_level]
    return round(tdee)

function calculateNutritionTargets(weight_kg, tdee, fitness_goal):
    // 热量目标
    if fitness_goal == 'lose_weight':
        calorie_target = tdee - 500
    else if fitness_goal == 'gain_muscle':
        calorie_target = tdee + 300
    else:
        calorie_target = tdee

    // 蛋白质：减脂/增肌取 2.0g/kg，维持取 1.6g/kg
    if fitness_goal == 'maintain':
        protein_g = round(weight_kg * 1.6)
    else:
        protein_g = round(weight_kg * 2.0)

    // 脂肪：0.9g/kg
    fat_g = round(weight_kg * 0.9)

    // 碳水 = 剩余热量 / 4
    protein_cal = protein_g * 4
    fat_cal = fat_g * 9
    carbs_cal = calorie_target - protein_cal - fat_cal
    carbs_g = round(carbs_cal / 4)

    // 保底校验
    if carbs_g < 50:
        carbs_g = 50
        calorie_target = protein_cal + fat_cal + carbs_g * 4

    return {
        calories: calorie_target,
        protein_g: protein_g,
        carbs_g: carbs_g,
        fat_g: fat_g
    }
```

### 4.4 餐食营养自动计算

```
function calculateMealFoodNutrition(food_item_id, quantity_g):
    food = SELECT * FROM food_items WHERE id = food_item_id
    ratio = quantity_g / 100

    return {
        calories: round(food.calories_per_100g * ratio),
        protein_g: round(food.protein_per_100g * ratio, 2),
        carbs_g: round(food.carbs_per_100g * ratio, 2),
        fat_g: round(food.fat_per_100g * ratio, 2)
    }

function recalculateMealTotals(meal_record_id):
    foods = SELECT * FROM meal_foods WHERE meal_record_id = ?

    totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    for f in foods:
        totals.calories += f.calculated_calories
        totals.protein_g += f.calculated_protein_g
        totals.carbs_g += f.calculated_carbs_g
        totals.fat_g += f.calculated_fat_g

    UPDATE meal_records SET
        total_calories = totals.calories,
        total_protein_g = round(totals.protein_g, 2),
        total_carbs_g = round(totals.carbs_g, 2),
        total_fat_g = round(totals.fat_g, 2)
    WHERE id = meal_record_id

    // 级联更新 daily_nutrition
    upsertDailyNutrition(meal_records.user_id, meal_records.record_date)
```

### 4.5 每日营养汇总更新

```
function upsertDailyNutrition(user_id, record_date):
    meals = SELECT * FROM meal_records WHERE user_id = ? AND record_date = ?
    profile = SELECT * FROM user_profiles WHERE user_id = ?

    totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    for m in meals:
        totals.calories += m.total_calories
        totals.protein_g += m.total_protein_g
        totals.carbs_g += m.total_carbs_g
        totals.fat_g += m.total_fat_g

    INSERT INTO daily_nutrition (user_id, record_date, total_calories, total_protein_g, total_carbs_g, total_fat_g, calories_target, protein_target_g, carbs_target_g, fat_target_g)
    VALUES (..., totals..., profile.daily_calorie_target, profile.daily_protein_target_g, profile.daily_carbs_target_g, profile.daily_fat_target_g)
    ON CONFLICT (user_id, record_date)
    DO UPDATE SET
        total_calories = EXCLUDED.total_calories,
        total_protein_g = EXCLUDED.total_protein_g,
        total_carbs_g = EXCLUDED.total_carbs_g,
        total_fat_g = EXCLUDED.total_fat_g,
        updated_at = now()
```

### 4.6 健康评分算法（100 分制，4 项各 25 分）

```
function calculateHealthScore(user_id, record_date):
    profile = SELECT * FROM user_profiles WHERE user_id = ?
    daily = SELECT * FROM daily_nutrition WHERE user_id = ? AND record_date = ?
    checklist = SELECT * FROM health_checklist WHERE user_id = ? AND record_date = ?
    workouts = SELECT * FROM workout_records WHERE user_id = ? AND workout_date = ? AND status = 'completed'

    // 1. 营养得分（25 分）
    // 基于当日实际摄入与目标的比例计算
    if daily is NULL:
        nutrition_score = 0
    else:
        calorie_ratio = daily.total_calories / daily.calories_target
        protein_ratio = daily.total_protein_g / daily.protein_target_g
        carb_ratio = daily.total_carbs_g / daily.carbs_target_g
        fat_ratio = daily.total_fat_g / daily.fat_target_g

        // 热量偏差在 90%-110% 为满分方向，超出按比例扣减
        calorie_score = max(0, 25 - abs(1 - calorie_ratio) * 250)
        macro_balance = (protein_ratio + carb_ratio + fat_ratio) / 3
        nutrition_score = round(min(25, calorie_score * 0.6 + macro_balance * 10 * 0.4))

    // 2. 运动得分（25 分）
    // 训练时长 >= 30 分钟满分，不足按比例
    total_workout_min = 0
    for w in workouts:
        total_workout_min += w.total_duration_min

    if total_workout_min >= 30:
        exercise_score = 25
    else if total_workout_min > 0:
        exercise_score = round(total_workout_min / 30 * 25)
    else:
        exercise_score = 0

    // 3. 睡眠得分（25 分）
    // 实际时长与目标 7.5h 的比例
    if checklist and checklist.sleep_actual_hours:
        sleep_ratio = checklist.sleep_actual_hours / profile.sleep_target_hours
        sleep_score = min(25, round(sleep_ratio * 25))
    else:
        sleep_score = 0

    // 4. hydration 得分（25 分）
    // 实际饮水与目标 2000ml 的比例
    if checklist and checklist.water_intake_ml:
        water_ratio = checklist.water_intake_ml / profile.water_target_ml
        hydration_score = min(25, round(water_ratio * 25))
    else:
        hydration_score = 0

    total_score = nutrition_score + exercise_score + sleep_score + hydration_score

    // 等级映射（无 S 级）
    if total_score >= 90:
        grade = 'A'
    else if total_score >= 75:
        grade = 'B'
    else if total_score >= 60:
        grade = 'C'
    else:
        grade = 'D'

    // 写入数据库
    INSERT INTO health_scores (user_id, record_date, total_score, grade, nutrition_score, exercise_score, sleep_score, hydration_score)
    VALUES (...)
    ON CONFLICT (user_id, record_date) DO UPDATE SET ...
```

### 4.7 训练完成率计算

```
function calculateWorkoutCompletion(workout_record_id):
    exercises = SELECT * FROM workout_exercises WHERE workout_record_id = ?

    total_sets = count(exercises)
    completed_sets = count(exercises WHERE is_completed = true)

    if total_sets == 0:
        return 0

    completion_rate = round(completed_sets / total_sets * 100)

    // 同步更新 workout_records
    UPDATE workout_records SET
        total_sets_completed = completed_sets,
        status = CASE WHEN completion_rate >= 80 THEN 'completed' ELSE 'in_progress' END
    WHERE id = workout_record_id

    return completion_rate
```

---

## 5. 数据库设计补充说明

### 5.1 扩展性预留

| 预留字段/表 | 用途 |
|-------------|------|
| `exercises.default_duration_min` | 有氧动作默认时长，支持未来有氧训练细化 |
| `workout_exercises.incline_percent` | 跑步机坡度，支持未来有氧参数分析 |
| `workout_exercises.resistance_level` | 椭圆机阻力，支持未来有氧参数分析 |
| `workout_exercises.load_setting` | 动感单车负荷，支持未来有氧参数分析 |
| `app_settings.value_type = 'json'` | 支持复杂配置对象存储 |
| `food_photos` 表 | 保留识别日志结构，未来可扩展为识别准确率统计 |

### 5.2 软删除策略

- 用户数据（`users`、`user_profiles`）：物理删除 + 级联，或归档到冷存储。
- 食物/动作库系统数据（`food_items`、`exercises`）：使用 `is_active` 软删除，避免历史记录断裂。
- 用户行为明细（`meal_records`、`workout_records`、`meal_foods`、`workout_exercises`）：保留 90 天后自动物理删除，减少数据膨胀。
- 令牌（`refresh_tokens`）：过期后物理删除，定时任务清理。当前产品方向不实现图形验证码，不需要 `captchas` 表。

### 5.3 性能优化建议

1. **聚合表机制**：`daily_nutrition` 和 `health_scores` 作为汇总表，避免仪表盘实时 JOIN 大量明细数据。通过应用层事件在 `meal_records`、`workout_records`、`health_checklist` 变更时自动更新。
2. **分区策略**：当 `meal_records`、`workout_records` 数据量超过千万级时，可按 `record_date` / `workout_date` 进行按月分区。
3. **定时清理**：配置应用层定时器，自动删除 90 天前的 `meal_records`、`workout_records` 及其关联明细。
4. **令牌 TTL**：`refresh_tokens` 设置较短过期时间（默认 7 天），并配合定时清理任务。
