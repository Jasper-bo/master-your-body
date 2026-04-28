# VitalPulse 健康管理系统 RESTful API 接口文档

> 版本: v1.0.0
> 基础路径: `/api`
> 认证方式: JWT Bearer Token
> 部署模式: 纯本地部署（仅 DeepSeek API 外调）

---

## 目录

1. [通用约定](#1-通用约定)
2. [认证模块 (Auth)](#2-认证模块-auth)
3. [用户模块 (User)](#3-用户模块-user)
4. [仪表盘模块 (Dashboard)](#4-仪表盘模块-dashboard)
5. [营养模块 (Nutrition)](#5-营养模块-nutrition)
6. [训练模块 (Training)](#6-训练模块-training)
7. [健康打卡模块 (CheckIn)](#7-健康打卡模块-checkin)
8. [设置模块 (Settings)](#8-设置模块-settings)
9. [DeepSeek AI 拍照识别集成](#9-deepseek-ai-拍照识别集成)
10. [附录 A: 数据字典](#附录-a-数据字典)
11. [附录 B: HTTP 状态码与业务错误码汇总表](#附录-b-http-状态码与业务错误码汇总表)

---

## 1. 通用约定

### 1.1 基础 URL

```
http://localhost:3000/api
```

### 1.2 请求头

| Header | 必填 | 说明 |
|--------|------|------|
| `Content-Type` | 视接口而定 | JSON 接口固定值 `application/json`；文件上传接口为 `multipart/form-data` |
| `Authorization` | 视接口而定 | `Bearer <accessToken>` |

### 1.3 通用响应结构

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 1.4 错误响应结构

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "认证令牌无效或已过期",
    "details": null
  },
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 1.5 通用错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `BAD_REQUEST` | 400 | 请求参数错误 |
| `UNAUTHORIZED` | 401 | 未认证或令牌失效（未登录访问受保护接口时返回，前端需强制跳转 `/login`） |
| `FORBIDDEN` | 403 | 无权限访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突（如重复创建） |
| `UNPROCESSABLE_ENTITY` | 422 | 请求语义错误（如验证失败） |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用（如 DeepSeek API 不可用时） |

### 1.6 分页规范

列表接口统一支持以下查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码，从 1 开始 |
| `limit` | integer | 否 | 20 | 每页数量，最大 100 |

分页响应包含在 `data` 中的 `pagination` 字段：

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 2. 认证模块 (Auth)

### 2.1 获取图形验证码

- **URL**: `/auth/captcha`
- **Method**: `POST`
- **Description**: 生成 4 位数字图形验证码，每次打开登录/注册页自动获取，点击图片可手动刷新
- **Auth**: 否

**Request Body**: 无

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "captchaToken": "capt_abc123",
    "captchaImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `captchaToken` | string | 验证码唯一标识，后续注册/登录时需回传 |
| `captchaImage` | string | Base64 编码的 PNG 图片（4 位数字） |

**Error Codes**:

- `INTERNAL_SERVER_ERROR` (500) - 验证码生成失败

---

### 2.2 用户注册

- **URL**: `/auth/register`
- **Method**: `POST`
- **Description**: 新用户注册，注册成功后立即弹出个性化计划弹窗，需提交 6 项身体参数
- **Auth**: 否

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | string | 是 | 手机号，纯数字，长度 8-15 位，无具体号段校验 |
| `password` | string | 是 | 密码，至少 6 位，无复杂度要求 |
| `captchaToken` | string | 是 | 获取验证码时返回的 token |
| `captchaCode` | string | 是 | 用户输入的 4 位数字验证码 |
| `heightCm` | number | 是 | 身高，单位 cm |
| `weightKg` | number | 是 | 体重，单位 kg |
| `age` | integer | 是 | 年龄 |
| `gender` | string | 是 | 性别：`male` / `female` |
| `activityLevel` | string | 是 | 运动频率：`sedentary` / `lightly_active` / `moderately_active` / `very_active` |
| `goal` | string | 是 | 健身目标：`lose_weight` / `maintain` / `gain_muscle` |

**Request Example**:

```json
{
  "phone": "13800138000",
  "password": "123456",
  "captchaToken": "capt_abc123",
  "captchaCode": "7842",
  "heightCm": 175,
  "weightKg": 70,
  "age": 28,
  "gender": "male",
  "activityLevel": "moderately_active",
  "goal": "maintain"
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "phone": "13800138000",
      "createdAt": "2026-04-28T10:00:00Z",
      "profile": {
        "heightCm": 175,
        "weightKg": 70,
        "age": 28,
        "gender": "male",
        "activityLevel": "moderately_active",
        "goal": "maintain"
      },
      "stats": {
        "bmi": 22.9,
        "bmr": 1650,
        "tdee": 2500,
        "dailyCalorieTarget": 2500,
        "dailyProteinTarget": 150,
        "dailyCarbTarget": 300,
        "dailyFatTarget": 80
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
      "expiresIn": 86400
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `tokens.expiresIn` | integer | Access Token 有效期，单位秒（24 小时 = 86400 秒） |

**Error Codes**:

- `CONFLICT` (409) - 手机号已被注册
- `UNAUTHORIZED` (401) - 验证码错误或已过期
- `UNPROCESSABLE_ENTITY` (422) - 参数校验失败

---

### 2.3 用户登录

- **URL**: `/auth/login`
- **Method**: `POST`
- **Description**: 用户登录，获取 JWT Token
- **Auth**: 否

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | string | 是 | 注册手机号 |
| `password` | string | 是 | 登录密码 |
| `captchaToken` | string | 是 | 获取验证码时返回的 token |
| `captchaCode` | string | 是 | 用户输入的 4 位数字验证码 |

**Request Example**:

```json
{
  "phone": "13800138000",
  "password": "123456",
  "captchaToken": "capt_abc123",
  "captchaCode": "7842"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "phone": "13800138000",
      "createdAt": "2026-01-15T08:30:00Z",
      "profile": {
        "heightCm": 175,
        "weightKg": 70,
        "age": 28,
        "gender": "male",
        "activityLevel": "moderately_active",
        "goal": "maintain"
      },
      "stats": {
        "bmi": 22.9,
        "bmr": 1650,
        "tdee": 2500,
        "dailyCalorieTarget": 2500,
        "dailyProteinTarget": 150,
        "dailyCarbTarget": 300,
        "dailyFatTarget": 80
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
      "expiresIn": 86400
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNAUTHORIZED` (401) - 手机号或密码错误，或验证码错误/过期
- `UNPROCESSABLE_ENTITY` (422) - 参数校验失败

---

### 2.4 刷新令牌

- **URL**: `/auth/refresh`
- **Method**: `POST`
- **Description**: 使用 Refresh Token 获取新的 Access Token。Refresh Token 有效期 7 天
- **Auth**: 否（需传入 Refresh Token）

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `refreshToken` | string | 是 | 登录时获取的 Refresh Token |

**Request Example**:

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expiresIn": 86400
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNAUTHORIZED` (401) - Refresh Token 无效或已过期

---

### 2.5 登出

- **URL**: `/auth/logout`
- **Method**: `POST`
- **Description**: 用户登出，使当前 Access Token 失效
- **Auth**: 是

**Request Body**: 无

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 3. 用户模块 (User)

### 3.1 获取当前用户信息

- **URL**: `/users/me`
- **Method**: `GET`
- **Description**: 获取当前登录用户的个人信息（含 profile 和 stats）
- **Auth**: 是

**Request Params**: 无

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "phone": "13800138000",
    "profile": {
      "heightCm": 175,
      "weightKg": 70,
      "age": 28,
      "gender": "male",
      "activityLevel": "moderately_active",
      "goal": "maintain"
    },
    "stats": {
      "bmi": 22.9,
      "bmr": 1650,
      "tdee": 2500,
      "dailyCalorieTarget": 2500,
      "dailyProteinTarget": 150,
      "dailyCarbTarget": 300,
      "dailyFatTarget": 80
    },
    "createdAt": "2026-01-15T08:30:00Z",
    "updatedAt": "2026-04-28T06:00:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 3.2 更新用户信息

- **URL**: `/users/me`
- **Method**: `PATCH`
- **Description**: 更新当前用户的个人信息（支持部分更新）
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `heightCm` | number | 否 | 身高，单位 cm |
| `weightKg` | number | 否 | 体重，单位 kg |
| `age` | integer | 否 | 年龄 |
| `gender` | string | 否 | 性别：`male` / `female` |
| `activityLevel` | string | 否 | 运动频率：`sedentary` / `lightly_active` / `moderately_active` / `very_active` |
| `goal` | string | 否 | 健身目标：`lose_weight` / `maintain` / `gain_muscle` |

**Request Example**:

```json
{
  "weightKg": 69,
  "activityLevel": "very_active"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "phone": "13800138000",
    "profile": {
      "heightCm": 175,
      "weightKg": 69,
      "age": 28,
      "gender": "male",
      "activityLevel": "very_active",
      "goal": "maintain"
    },
    "stats": {
      "bmi": 22.5,
      "bmr": 1630,
      "tdee": 2800,
      "dailyCalorieTarget": 2800,
      "dailyProteinTarget": 170,
      "dailyCarbTarget": 330,
      "dailyFatTarget": 90
    },
    "updatedAt": "2026-04-28T10:05:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:05:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNPROCESSABLE_ENTITY` (422) - 参数校验失败

---

### 3.3 更新个性化计划参数

- **URL**: `/users/me/plan`
- **Method**: `PUT`
- **Description**: 更新用户的个性化健康计划参数（注册弹窗提交）
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `heightCm` | number | 是 | 身高，单位 cm |
| `weightKg` | number | 是 | 体重，单位 kg |
| `age` | integer | 是 | 年龄 |
| `gender` | string | 是 | 性别：`male` / `female` |
| `activityLevel` | string | 是 | 运动频率：`sedentary` / `lightly_active` / `moderately_active` / `very_active` |
| `goal` | string | 是 | 健身目标：`lose_weight` / `maintain` / `gain_muscle` |

**Request Example**:

```json
{
  "heightCm": 178,
  "weightKg": 72,
  "age": 28,
  "gender": "male",
  "activityLevel": "moderately_active",
  "goal": "gain_muscle"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "profile": {
      "heightCm": 178,
      "weightKg": 72,
      "age": 28,
      "gender": "male",
      "activityLevel": "moderately_active",
      "goal": "gain_muscle"
    },
    "recalculatedStats": {
      "bmi": 22.7,
      "bmr": 1680,
      "tdee": 2750,
      "dailyCalorieTarget": 2750,
      "dailyProteinTarget": 165,
      "dailyCarbTarget": 310,
      "dailyFatTarget": 88
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNPROCESSABLE_ENTITY` (422) - 参数校验失败

---

## 4. 仪表盘模块 (Dashboard)

### 4.1 获取仪表盘聚合数据

- **URL**: `/dashboard`
- **Method**: `GET`
- **Description**: 获取仪表盘首页聚合数据（日期问候语、营养卡片、身体指标、健康评分、趋势图）
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `date` | string | 否 | 今天 | 查询日期，格式 `YYYY-MM-DD` |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "date": "2026-04-28",
    "greeting": "下午好",
    "nutrition": {
      "calories": {
        "current": 1850,
        "target": 2500
      },
      "protein": {
        "current": 95,
        "target": 150,
        "unit": "g"
      },
      "carbs": {
        "current": 210,
        "target": 300,
        "unit": "g"
      },
      "fat": {
        "current": 55,
        "target": 80,
        "unit": "g"
      }
    },
    "bodyMetrics": {
      "bmi": 22.5,
      "bmr": 1630,
      "tdee": 2500
    },
    "healthScore": {
      "totalScore": 78,
      "grade": "B",
      "checklist": [
        {
          "id": "hydration",
          "name": "水分补充",
          "completed": true,
          "target": "2000ml",
          "current": "2100ml"
        },
        {
          "id": "sleep",
          "name": "睡眠质量",
          "completed": true,
          "target": "7.5h",
          "current": "8h"
        },
        {
          "id": "exercise",
          "name": "运动锻炼",
          "completed": false,
          "target": "1次",
          "current": "0次"
        }
      ]
    },
    "nutritionTrend": {
      "period": "7d",
      "labels": ["04-22", "04-23", "04-24", "04-25", "04-26", "04-27", "04-28"],
      "datasets": [
        {
          "label": "碳水",
          "data": [280, 310, 295, 320, 290, 305, 210],
          "unit": "g"
        },
        {
          "label": "蛋白质",
          "data": [140, 135, 150, 145, 130, 155, 95],
          "unit": "g"
        },
        {
          "label": "脂肪",
          "data": [70, 75, 68, 80, 72, 78, 55],
          "unit": "g"
        }
      ]
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T14:30:00Z",
    "requestId": "req_dash001"
  }
}
```

**说明**:

- 健康评分总分 = 营养(25) + 运动(25) + 睡眠(25) + 水分(25) = 100 分
- 等级规则：`A` >= 90，`B` >= 75，`C` >= 60，`D` < 60（无 S 级）

---

## 5. 营养模块 (Nutrition)

### 5.1 获取今日营养摄入概览

- **URL**: `/nutrition/today`
- **Method**: `GET`
- **Description**: 获取用户今日营养摄入总览
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `date` | string | 否 | 今天 | 查询日期，格式 `YYYY-MM-DD` |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "date": "2026-04-28",
    "summary": {
      "calories": {
        "current": 1850,
        "target": 2500,
        "unit": "kcal"
      },
      "protein": {
        "current": 95,
        "target": 150,
        "unit": "g"
      },
      "carbs": {
        "current": 210,
        "target": 300,
        "unit": "g"
      },
      "fat": {
        "current": 55,
        "target": 80,
        "unit": "g"
      }
    },
    "progressPercentage": 74,
    "meals": [
      {
        "id": "meal_001",
        "type": "breakfast",
        "name": "早餐",
        "items": [
          {
            "id": "food_001",
            "name": "燕麦",
            "category": "staple",
            "amount": 80,
            "unit": "g",
            "calories": 280,
            "protein": 10,
            "carbs": 50,
            "fat": 5
          }
        ],
        "totalCalories": 280
      },
      {
        "id": "meal_002",
        "type": "lunch",
        "name": "午餐",
        "items": [
          {
            "id": "food_002",
            "name": "鸡胸肉",
            "category": "meat",
            "amount": 150,
            "unit": "g",
            "calories": 248,
            "protein": 46,
            "carbs": 0,
            "fat": 5
          },
          {
            "id": "food_003",
            "name": "西兰花",
            "category": "vegetable",
            "amount": 200,
            "unit": "g",
            "calories": 68,
            "protein": 6,
            "carbs": 12,
            "fat": 1
          }
        ],
        "totalCalories": 316
      }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T12:00:00Z",
    "requestId": "req_nut001"
  }
}
```

---

### 5.2 AI 拍照识别食物

- **URL**: `/nutrition/ai-recognize`
- **Method**: `POST`
- **Description**: 上传食物照片，调用 DeepSeek API 识别食物并返回营养信息（蛋白质/碳水/脂肪）。热量由前端根据三大营养素计算，不保存图片
- **Auth**: 是
- **Content-Type**: `multipart/form-data`

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image` | file | 是 | 食物照片，支持 JPG / PNG / WEBP，最大 10MB |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "recognitionId": "rec_abc123",
    "results": [
      {
        "foodId": "food_db_001",
        "name": "糙米饭",
        "confidence": 0.92,
        "estimatedAmount": 200,
        "unit": "g",
        "nutritionPer100g": {
          "protein": 2.6,
          "carbs": 23,
          "fat": 0.9
        },
        "estimatedTotal": {
          "protein": 5.2,
          "carbs": 46,
          "fat": 1.8
        }
      },
      {
        "foodId": "food_db_005",
        "name": "西兰花",
        "confidence": 0.88,
        "estimatedAmount": 150,
        "unit": "g",
        "nutritionPer100g": {
          "protein": 2.8,
          "carbs": 7,
          "fat": 0.4
        },
        "estimatedTotal": {
          "protein": 4.2,
          "carbs": 10.5,
          "fat": 0.6
        }
      }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**说明**:

- 返回数据中不包含 `calories` 字段，热量由前端根据 `protein * 4 + carbs * 4 + fat * 9` 计算
- 用户可对识别结果进行修改，确认后走标准餐食保存流程（调用 `POST /api/nutrition/meals`）
- 后端不保存用户上传的图片文件

**Error Codes**:

- `UNPROCESSABLE_ENTITY` (422) - 图片格式不支持或大小超限
- `SERVICE_UNAVAILABLE` (503) - DeepSeek API 调用失败或超时

---

### 5.3 获取食物分类列表

- **URL**: `/nutrition/food-categories`
- **Method**: `GET`
- **Description**: 获取系统预定义的食物分类及常见食物列表
- **Auth**: 是

**Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "staple",
      "name": "主食类",
      "icon": "grain",
      "foods": [
        { "id": "staple_001", "name": "糙米饭", "unit": "g", "nutritionPer100g": { "calories": 111, "protein": 2.6, "carbs": 23, "fat": 0.9 } },
        { "id": "staple_002", "name": "全麦面包", "unit": "g", "nutritionPer100g": { "calories": 247, "protein": 13, "carbs": 41, "fat": 3.4 } },
        { "id": "staple_003", "name": "红薯", "unit": "g", "nutritionPer100g": { "calories": 86, "protein": 1.6, "carbs": 20, "fat": 0.1 } },
        { "id": "staple_004", "name": "燕麦", "unit": "g", "nutritionPer100g": { "calories": 389, "protein": 16.9, "carbs": 66, "fat": 6.9 } },
        { "id": "staple_005", "name": "意面", "unit": "g", "nutritionPer100g": { "calories": 131, "protein": 5, "carbs": 25, "fat": 1.1 } }
      ]
    },
    {
      "id": "meat",
      "name": "肉类",
      "icon": "meat",
      "foods": [
        { "id": "meat_001", "name": "鸡胸肉", "unit": "g", "nutritionPer100g": { "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6 } },
        { "id": "meat_002", "name": "三文鱼", "unit": "g", "nutritionPer100g": { "calories": 208, "protein": 20, "carbs": 0, "fat": 13 } },
        { "id": "meat_003", "name": "瘦牛肉", "unit": "g", "nutritionPer100g": { "calories": 250, "protein": 26, "carbs": 0, "fat": 15 } },
        { "id": "meat_004", "name": "虾仁", "unit": "g", "nutritionPer100g": { "calories": 106, "protein": 24, "carbs": 0, "fat": 0.5 } },
        { "id": "meat_005", "name": "豆腐", "unit": "g", "nutritionPer100g": { "calories": 76, "protein": 8, "carbs": 1.9, "fat": 4.8 } }
      ]
    },
    {
      "id": "vegetable",
      "name": "蔬菜类",
      "icon": "vegetable",
      "foods": [
        { "id": "veg_001", "name": "西兰花", "unit": "g", "nutritionPer100g": { "calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4 } },
        { "id": "veg_002", "name": "菠菜", "unit": "g", "nutritionPer100g": { "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4 } },
        { "id": "veg_003", "name": "生菜", "unit": "g", "nutritionPer100g": { "calories": 15, "protein": 1.4, "carbs": 2.9, "fat": 0.2 } },
        { "id": "veg_004", "name": "西红柿", "unit": "g", "nutritionPer100g": { "calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2 } },
        { "id": "veg_005", "name": "胡萝卜", "unit": "g", "nutritionPer100g": { "calories": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2 } }
      ]
    }
  ],
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 5.4 获取油脂选项

- **URL**: `/nutrition/oil-options`
- **Method**: `GET`
- **Description**: 获取油脂用量预设选项
- **Auth**: 是

**Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    { "id": "oil_none", "label": "无油", "amount": 0, "unit": "g", "calories": 0 },
    { "id": "oil_light", "label": "少油", "amount": 5, "unit": "g", "calories": 45 },
    { "id": "oil_medium", "label": "中等", "amount": 10, "unit": "g", "calories": 90 },
    { "id": "oil_heavy", "label": "多油", "amount": 20, "unit": "g", "calories": 180 }
  ],
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 5.5 记录餐食

- **URL**: `/nutrition/meals`
- **Method**: `POST`
- **Description**: 记录一餐食物摄入（支持手动录入和 AI 识别结果确认）
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mealType` | string | 是 | 餐次：`breakfast` / `lunch` / `dinner` / `snack` |
| `date` | string | 否 | 日期，默认今天，格式 `YYYY-MM-DD` |
| `items` | array | 是 | 食物条目列表 |
| `items[].foodId` | string | 是 | 食物 ID（系统预定义） |
| `items[].name` | string | 是 | 食物名称 |
| `items[].category` | string | 是 | 分类：`staple` / `meat` / `vegetable` / `oil` |
| `items[].amount` | number | 是 | 摄入量 |
| `items[].unit` | string | 是 | 单位，如 `g` |
| `items[].calories` | number | 是 | 该条目总热量 |
| `items[].protein` | number | 是 | 该条目蛋白质（g） |
| `items[].carbs` | number | 是 | 该条目碳水（g） |
| `items[].fat` | number | 是 | 该条目脂肪（g） |
| `oilOption` | object | 否 | 油脂选项 |
| `oilOption.optionId` | string | 否 | 油脂选项 ID |
| `oilOption.amount` | number | 否 | 油脂克数 |

**Request Example**:

```json
{
  "mealType": "lunch",
  "date": "2026-04-28",
  "items": [
    {
      "foodId": "staple_001",
      "name": "糙米饭",
      "category": "staple",
      "amount": 200,
      "unit": "g",
      "calories": 222,
      "protein": 5.2,
      "carbs": 46,
      "fat": 1.8
    },
    {
      "foodId": "meat_001",
      "name": "鸡胸肉",
      "category": "meat",
      "amount": 150,
      "unit": "g",
      "calories": 248,
      "protein": 46,
      "carbs": 0,
      "fat": 5
    }
  ],
  "oilOption": {
    "optionId": "oil_light",
    "amount": 5
  }
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "mealId": "meal_003",
    "mealType": "lunch",
    "date": "2026-04-28",
    "items": [
      {
        "id": "mi_001",
        "foodId": "staple_001",
        "name": "糙米饭",
        "amount": 200,
        "unit": "g",
        "calories": 222,
        "protein": 5.2,
        "carbs": 46,
        "fat": 1.8
      },
      {
        "id": "mi_002",
        "foodId": "meat_001",
        "name": "鸡胸肉",
        "amount": 150,
        "unit": "g",
        "calories": 248,
        "protein": 46,
        "carbs": 0,
        "fat": 5
      },
      {
        "id": "mi_003",
        "name": "油脂",
        "category": "oil",
        "amount": 5,
        "unit": "g",
        "calories": 45,
        "protein": 0,
        "carbs": 0,
        "fat": 5
      }
    ],
    "totalCalories": 515,
    "totalProtein": 51.2,
    "totalCarbs": 46,
    "totalFat": 11.8,
    "createdAt": "2026-04-28T12:30:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T12:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNPROCESSABLE_ENTITY` (422) - 参数校验失败或食物数据不合法
- `NOT_FOUND` (404) - 引用的 foodId 不存在

---

### 5.6 删除餐食记录

- **URL**: `/nutrition/meals/:id`
- **Method**: `DELETE`
- **Description**: 删除指定餐食记录
- **Auth**: 是

**Request Params**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 餐食记录 ID |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "deletedId": "meal_003"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `NOT_FOUND` (404) - 餐食记录不存在
- `FORBIDDEN` (403) - 无权删除该记录

---

### 5.7 获取营养历史趋势

- **URL**: `/nutrition/trends`
- **Method**: `GET`
- **Description**: 获取指定时间段的营养摄入趋势数据
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `startDate` | string | 是 | - | 开始日期 `YYYY-MM-DD` |
| `endDate` | string | 是 | - | 结束日期 `YYYY-MM-DD` |
| `metric` | string | 否 | `all` | 指标：`calories` / `protein` / `carbs` / `fat` / `all` |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-04-22",
      "endDate": "2026-04-28"
    },
    "labels": ["04-22", "04-23", "04-24", "04-25", "04-26", "04-27", "04-28"],
    "datasets": {
      "calories": [2400, 2350, 2500, 2600, 2450, 2550, 1850],
      "protein": [140, 135, 150, 145, 130, 155, 95],
      "carbs": [280, 310, 295, 320, 290, 305, 210],
      "fat": [70, 75, 68, 80, 72, 78, 55]
    },
    "averages": {
      "calories": 2457,
      "protein": 136,
      "carbs": 296,
      "fat": 71
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNPROCESSABLE_ENTITY` (422) - 日期范围不合法或超过最大限制（最多 90 天）

---

## 6. 训练模块 (Training)

### 6.1 获取今日训练计划及清单

- **URL**: `/training/today`
- **Method**: `GET`
- **Description**: 获取用户今日训练计划及当前清单进度。支持同一天多次训练
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `date` | string | 否 | 今天 | 查询日期 `YYYY-MM-DD` |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "date": "2026-04-28",
    "sessions": [
      {
        "sessionId": "sess_001",
        "sessionIndex": 1,
        "status": "completed",
        "completedAt": "2026-04-28T09:00:00Z",
        "summary": {
          "totalExercises": 4,
          "completedSets": 16,
          "totalVolumeKg": 8200,
          "durationMin": 45
        }
      },
      {
        "sessionId": "sess_002",
        "sessionIndex": 2,
        "status": "in_progress",
        "exercises": [
          {
            "id": "te_001",
            "exerciseId": "ex_001",
            "name": "卧推",
            "category": "chest",
            "targetMuscle": "胸部",
            "type": "strength",
            "sets": [
              { "setNumber": 1, "reps": 10, "weightKg": 60, "completed": true },
              { "setNumber": 2, "reps": 10, "weightKg": 60, "completed": true },
              { "setNumber": 3, "reps": 10, "weightKg": 60, "completed": false }
            ],
            "isCompleted": false
          },
          {
            "id": "te_002",
            "exerciseId": "ex_010",
            "name": "跑步机",
            "category": "cardio",
            "targetMuscle": "心肺耐力",
            "type": "cardio",
            "sets": [
              { "setNumber": 1, "durationMin": 30, "incline": 2, "resistance": 0, "completed": false }
            ],
            "isCompleted": false
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_train001"
  }
}
```

**说明**:

- 同一天可存在多个训练 session（支持多次训练）
- 每个动作按名称保留独立记录，不合并组数
- 力量训练字段：`reps` + `weightKg`
- 有氧训练字段：`durationMin` + `incline` / `resistance`

---

### 6.2 获取昨日训练回顾

- **URL**: `/training/yesterday`
- **Method**: `GET`
- **Description**: 获取昨日训练完成回顾
- **Auth**: 是

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "date": "2026-04-27",
    "hasWorkout": true,
    "sessions": [
      {
        "sessionId": "sess_003",
        "sessionIndex": 1,
        "summary": {
          "totalExercises": 5,
          "totalSets": 18,
          "totalVolumeKg": 12500,
          "durationMin": 55
        },
        "exercises": [
          {
            "name": "引体向上",
            "setsCompleted": 4,
            "repsPerSet": "8-10",
            "weightNote": "自重"
          },
          {
            "name": "高位下拉",
            "setsCompleted": 4,
            "repsPerSet": "12",
            "weightNote": "55kg"
          },
          {
            "name": "坐姿划船",
            "setsCompleted": 4,
            "repsPerSet": "12",
            "weightNote": "50kg"
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 6.3 获取本周训练统计

- **URL**: `/training/weekly-stats`
- **Method**: `GET`
- **Description**: 获取本周训练统计数据
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `weekStart` | string | 否 | 本周一 | 周开始日期 `YYYY-MM-DD` |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "weekStart": "2026-04-27",
    "weekEnd": "2026-05-03",
    "stats": {
      "workoutCount": 3,
      "totalDurationMin": 165,
      "totalSets": 42,
      "totalVolumeKg": 28600
    },
    "dailyBreakdown": [
      { "date": "2026-04-27", "hasWorkout": true, "sessionCount": 1, "durationMin": 55 },
      { "date": "2026-04-28", "hasWorkout": true, "sessionCount": 2, "durationMin": 105 },
      { "date": "2026-04-29", "hasWorkout": false, "sessionCount": 0, "durationMin": 0 }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 6.4 获取动作库

- **URL**: `/training/exercises`
- **Method**: `GET`
- **Description**: 获取训练动作库列表，支持按部位筛选
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `category` | string | 否 | - | 部位筛选：`chest` / `back` / `shoulders` / `legs` / `arms` / `core` / `cardio` / `all` |
| `search` | string | 否 | - | 动作名称关键词搜索 |
| `page` | integer | 否 | 1 | 页码 |
| `limit` | integer | 否 | 50 | 每页数量 |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ex_001",
        "name": "卧推",
        "category": "chest",
        "targetMuscle": "胸部",
        "type": "strength",
        "equipment": "杠铃 / 哑铃",
        "difficulty": "intermediate",
        "defaultSets": 4,
        "defaultReps": 10,
        "tags": ["复合动作", "胸大肌"]
      },
      {
        "id": "ex_002",
        "name": "上斜卧推",
        "category": "chest",
        "targetMuscle": "上胸部",
        "type": "strength",
        "equipment": "杠铃 / 哑铃",
        "difficulty": "intermediate",
        "defaultSets": 4,
        "defaultReps": 10,
        "tags": ["复合动作", "上胸"]
      },
      {
        "id": "ex_010",
        "name": "跑步机",
        "category": "cardio",
        "targetMuscle": "心肺耐力",
        "type": "cardio",
        "equipment": "跑步机",
        "difficulty": "beginner",
        "defaultDurationMin": 30,
        "tags": ["有氧", "燃脂"]
      }
    ],
    "categories": [
      { "id": "chest", "name": "胸部", "icon": "chest", "count": 3 },
      { "id": "back", "name": "背部", "icon": "back", "count": 3 },
      { "id": "shoulders", "name": "肩部", "icon": "shoulders", "count": 2 },
      { "id": "legs", "name": "腿部", "icon": "legs", "count": 3 },
      { "id": "cardio", "name": "有氧", "icon": "cardio", "count": 3 }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 14,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 6.5 添加动作到今日清单

- **URL**: `/training/today/exercises`
- **Method**: `POST`
- **Description**: 从动作库添加一个动作到今日训练清单（前端暂存，最后统一提交）
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `exerciseId` | string | 是 | 动作库中的动作 ID |
| `sets` | array | 否 | 预设组数配置 |
| `sets[].setNumber` | integer | 是 | 组号 |
| `sets[].targetReps` | integer | 否 | 目标次数（力量训练） |
| `sets[].targetWeightKg` | number | 否 | 目标重量（力量训练） |
| `sets[].targetDurationMin` | number | 否 | 目标时长（有氧训练） |
| `sets[].targetIncline` | number | 否 | 目标坡度（跑步机） |
| `sets[].targetResistance` | number | 否 | 目标阻力（椭圆机/单车） |

**Request Example**:

```json
{
  "exerciseId": "ex_001",
  "sets": [
    { "setNumber": 1, "targetReps": 10, "targetWeightKg": 60 },
    { "setNumber": 2, "targetReps": 10, "targetWeightKg": 60 },
    { "setNumber": 3, "targetReps": 10, "targetWeightKg": 60 },
    { "setNumber": 4, "targetReps": 10, "targetWeightKg": 60 }
  ]
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "trainingExerciseId": "te_003",
    "exerciseId": "ex_001",
    "name": "卧推",
    "category": "chest",
    "type": "strength",
    "sets": [
      { "setNumber": 1, "targetReps": 10, "targetWeightKg": 60, "completed": false },
      { "setNumber": 2, "targetReps": 10, "targetWeightKg": 60, "completed": false },
      { "setNumber": 3, "targetReps": 10, "targetWeightKg": 60, "completed": false },
      { "setNumber": 4, "targetReps": 10, "targetWeightKg": 60, "completed": false }
    ],
    "addedAt": "2026-04-28T10:00:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `NOT_FOUND` (404) - 动作不存在

---

### 6.6 从今日清单移除动作

- **URL**: `/training/today/exercises/:id`
- **Method**: `DELETE`
- **Description**: 从今日训练清单中移除指定动作
- **Auth**: 是

**Request Params**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 训练动作实例 ID (`trainingExerciseId`) |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "removedId": "te_003"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `NOT_FOUND` (404) - 训练动作实例不存在

---

### 6.7 记录某组完成数据

- **URL**: `/training/today/exercises/:id/sets/:setNumber`
- **Method**: `PATCH`
- **Description**: 记录某组训练的实际完成数据
- **Auth**: 是

**Request Params**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 训练动作实例 ID |
| `setNumber` | integer | 是 | 组号 |

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reps` | integer | 否 | 实际完成次数（力量训练） |
| `weightKg` | number | 否 | 实际使用重量（力量训练） |
| `durationMin` | number | 否 | 实际时长分钟（有氧训练） |
| `incline` | number | 否 | 实际坡度（跑步机） |
| `resistance` | number | 否 | 实际阻力（椭圆机/单车） |
| `completed` | boolean | 是 | 是否完成该组 |

**Request Example**:

```json
{
  "reps": 10,
  "weightKg": 62.5,
  "completed": true
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "trainingExerciseId": "te_001",
    "setNumber": 3,
    "reps": 10,
    "weightKg": 62.5,
    "completed": true,
    "completedAt": "2026-04-28T10:30:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `NOT_FOUND` (404) - 训练动作或组不存在
- `UNPROCESSABLE_ENTITY` (422) - 数据校验失败

---

### 6.8 完成今日训练

- **URL**: `/training/today/complete`
- **Method**: `POST`
- **Description**: 标记当前训练 session 为完成状态，生成训练总结。完成后自动触发运动打卡
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `actualDurationMin` | number | 否 | 实际训练时长（分钟） |
| `notes` | string | 否 | 训练备注 |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "sessionId": "sess_002",
    "date": "2026-04-28",
    "status": "completed",
    "summary": {
      "totalExercises": 6,
      "completedExercises": 6,
      "totalSets": 20,
      "completedSets": 20,
      "totalVolumeKg": 15200,
      "actualDurationMin": 62
    },
    "completedAt": "2026-04-28T11:05:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T11:05:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 6.9 快速记录训练（FAB）

- **URL**: `/training/quick-log`
- **Method**: `POST`
- **Description**: 快速记录一次训练（FAB 快捷入口，无需预先创建计划）。支持同一天多次训练
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 否 | 日期，默认今天 |
| `exercises` | array | 是 | 训练动作列表 |
| `exercises[].exerciseId` | string | 是 | 动作 ID |
| `exercises[].name` | string | 是 | 动作名称 |
| `exercises[].category` | string | 是 | 部位分类 |
| `exercises[].type` | string | 是 | 类型：`strength` / `cardio` |
| `exercises[].sets` | array | 是 | 完成组数 |
| `exercises[].sets[].reps` | integer | 否 | 次数（力量） |
| `exercises[].sets[].weightKg` | number | 否 | 重量（力量） |
| `exercises[].sets[].durationMin` | number | 否 | 时长（有氧） |
| `exercises[].sets[].incline` | number | 否 | 坡度（有氧） |
| `exercises[].sets[].resistance` | number | 否 | 阻力（有氧） |
| `durationMin` | number | 否 | 总时长 |
| `notes` | string | 否 | 备注 |

**Request Example**:

```json
{
  "date": "2026-04-28",
  "exercises": [
    {
      "exerciseId": "ex_001",
      "name": "卧推",
      "category": "chest",
      "type": "strength",
      "sets": [
        { "reps": 10, "weightKg": 60 },
        { "reps": 10, "weightKg": 60 },
        { "reps": 8, "weightKg": 65 }
      ]
    }
  ],
  "durationMin": 45,
  "notes": "胸部训练日，状态不错"
}
```

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "sessionId": "sess_004",
    "date": "2026-04-28",
    "type": "quick",
    "summary": {
      "totalExercises": 1,
      "totalSets": 3,
      "totalVolumeKg": 1820,
      "durationMin": 45
    },
    "createdAt": "2026-04-28T15:00:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 7. 健康打卡模块 (CheckIn)

### 7.1 获取今日打卡状态

- **URL**: `/checkin/today`
- **Method**: `GET`
- **Description**: 获取用户今日各项健康打卡的完成状态。共 3 项：水分、睡眠、运动
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `date` | string | 否 | 今天 | 查询日期 `YYYY-MM-DD` |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "date": "2026-04-28",
    "totalScore": 75,
    "grade": "B",
    "checklist": [
      {
        "id": "hydration",
        "name": "水分补充",
        "icon": "water",
        "completed": true,
        "target": "2000ml",
        "current": "2100ml",
        "unit": "ml",
        "score": 25
      },
      {
        "id": "sleep",
        "name": "睡眠质量",
        "icon": "moon",
        "completed": true,
        "target": "7.5h",
        "current": "8h",
        "unit": "h",
        "score": 25
      },
      {
        "id": "exercise",
        "name": "运动锻炼",
        "icon": "dumbbell",
        "completed": false,
        "target": "1次",
        "current": "0次",
        "unit": "次",
        "score": 25
      }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**说明**:

- 健康评分总分 = 营养(25) + 运动(25) + 睡眠(25) + 水分(25) = 100 分
- 等级规则：`A` >= 90，`B` >= 75，`C` >= 60，`D` < 60（无 S 级）
- 水分目标：2000ml；睡眠目标：7.5h；运动目标：完成 1 次训练

---

### 7.2 完成打卡项

- **URL**: `/checkin/:checkInId`
- **Method**: `POST`
- **Description**: 记录并完成某项健康打卡
- **Auth**: 是

**Request Params**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `checkInId` | string | 是 | 打卡项 ID：`hydration` / `sleep` / `exercise` |

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `value` | number | 视项而定 | 打卡数值：饮水量(ml) / 睡眠时长(h)。运动打卡由训练完成自动触发，无需手动调用 |
| `date` | string | 否 | 日期，默认今天 |
| `notes` | string | 否 | 备注 |

**Request Example (hydration)**:

```json
{
  "value": 2100,
  "date": "2026-04-28",
  "notes": "今天多喝水了"
}
```

**Request Example (sleep)**:

```json
{
  "value": 8,
  "date": "2026-04-28"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "checkInId": "hydration",
    "name": "水分补充",
    "completed": true,
    "current": "2100ml",
    "target": "2000ml",
    "score": 25,
    "checkedAt": "2026-04-28T14:00:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T14:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `NOT_FOUND` (404) - 打卡项 ID 不存在
- `UNPROCESSABLE_ENTITY` (422) - 打卡数值不合法

---

### 7.3 获取打卡历史

- **URL**: `/checkin/history`
- **Method**: `GET`
- **Description**: 获取健康打卡历史记录
- **Auth**: 是

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `checkInId` | string | 否 | - | 筛选特定打卡项 |
| `startDate` | string | 是 | - | 开始日期 `YYYY-MM-DD` |
| `endDate` | string | 是 | - | 结束日期 `YYYY-MM-DD` |
| `page` | integer | 否 | 1 | 页码 |
| `limit` | integer | 否 | 30 | 每页数量 |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "date": "2026-04-28",
        "totalScore": 75,
        "grade": "B",
        "details": [
          { "id": "hydration", "completed": true, "value": 2100 },
          { "id": "sleep", "completed": true, "value": 8 },
          { "id": "exercise", "completed": false, "value": 0 }
        ]
      },
      {
        "date": "2026-04-27",
        "totalScore": 92,
        "grade": "A",
        "details": [
          { "id": "hydration", "completed": true, "value": 2200 },
          { "id": "sleep", "completed": true, "value": 8 },
          { "id": "exercise", "completed": true, "value": 1 }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 30,
      "total": 60,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 8. 设置模块 (Settings)

### 8.1 获取应用信息

- **URL**: `/settings/app-info`
- **Method**: `GET`
- **Description**: 获取应用基本信息（图标、名称、版本号）
- **Auth**: 否（公开接口）

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "name": "VitalPulse",
    "displayName": "VitalPulse 健康管理系统",
    "version": "1.2.0",
    "buildNumber": "20260428.1",
    "iconUrl": "https://cdn.vitalpulse.app/icons/app-icon-512.png",
    "description": "您的全方位健康管理助手",
    "supportEmail": "support@vitalpulse.app",
    "website": "https://vitalpulse.app"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 8.2 获取开发者信息

- **URL**: `/settings/developers`
- **Method**: `GET`
- **Description**: 获取开发团队信息
- **Auth**: 否（公开接口）

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "teamName": "VitalPulse Team",
    "members": [
      {
        "id": "dev_001",
        "name": "张三",
        "role": "后端架构师",
        "bio": "专注于高可用后端系统设计与微服务架构"
      },
      {
        "id": "dev_002",
        "name": "李四",
        "role": "前端负责人",
        "bio": "热爱交互设计与性能优化"
      }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 8.3 获取更新日志

- **URL**: `/settings/changelog`
- **Method**: `GET`
- **Description**: 获取应用版本更新日志
- **Auth**: 否（公开接口）

**Request Query Params**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码 |
| `limit` | integer | 否 | 10 | 每页数量 |

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "version": "1.2.0",
        "buildNumber": "20260428.1",
        "releaseDate": "2026-04-28",
        "changes": [
          { "type": "feature", "description": "新增 AI 拍照识别食物功能" },
          { "type": "feature", "description": "训练动作库新增 20+ 动作" },
          { "type": "fix", "description": "修复营养趋势图数据展示异常" },
          { "type": "improvement", "description": "优化首页加载性能" }
        ]
      },
      {
        "version": "1.1.0",
        "buildNumber": "20260415.2",
        "releaseDate": "2026-04-15",
        "changes": [
          { "type": "feature", "description": "新增健康评分打卡系统" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 8.4 获取隐私政策

- **URL**: `/settings/privacy-policy`
- **Method**: `GET`
- **Description**: 获取隐私政策文本内容
- **Auth**: 否（公开接口）

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "title": "VitalPulse 隐私政策",
    "lastUpdated": "2026-04-01",
    "version": "2.0",
    "content": "## 1. 信息收集\n\n我们收集您在使用 VitalPulse 应用时提供的个人信息...",
    "sections": [
      { "heading": "信息收集", "anchor": "collection" },
      { "heading": "信息使用", "anchor": "usage" },
      { "heading": "信息共享", "anchor": "sharing" },
      { "heading": "数据安全", "anchor": "security" },
      { "heading": "用户权利", "anchor": "rights" }
    ]
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### 8.5 获取用户个性化设置

- **URL**: `/users/me/settings`
- **Method**: `GET`
- **Description**: 获取当前用户的应用个性化设置
- **Auth**: 是

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "language": "zh-CN"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**说明**:

- 当前系统设置项精简，无单位制切换、无深色模式、无提醒设置

---

### 8.6 更新用户个性化设置

- **URL**: `/users/me/settings`
- **Method**: `PATCH`
- **Description**: 更新当前用户的应用个性化设置（支持部分更新）
- **Auth**: 是

**Request Body**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `language` | string | 否 | 语言代码，如 `zh-CN` |

**Request Example**:

```json
{
  "language": "zh-CN"
}
```

**Response (200 OK)**:

```json
{
  "success": true,
  "data": {
    "language": "zh-CN",
    "updatedAt": "2026-04-28T10:10:00Z"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-04-28T10:10:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Codes**:

- `UNPROCESSABLE_ENTITY` (422) - 设置值不合法

---

## 9. DeepSeek AI 拍照识别集成

### 9.1 调用流程

```
前端拍照 → POST /api/nutrition/ai-recognize (multipart/form-data)
    ↓
后端接收图片 → 校验格式/大小
    ↓
后端调用 DeepSeek API（图片 base64 + prompt）
    ↓
解析 DeepSeek 响应 → 提取食物名 + 蛋白质 + 碳水 + 脂肪
    ↓
返回识别结果给前端（不含热量，热量由前端计算）
    ↓
用户可修改结果 → 确认后调用 POST /api/nutrition/meals 保存
```

### 9.2 后端请求 DeepSeek API 格式

**API Endpoint**: `https://api.deepseek.com/v1/chat/completions`

**Request Headers**:

```
Authorization: Bearer <DEEPSEEK_API_KEY>
Content-Type: application/json
```

**Request Body**:

```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "请识别图片中的食物，并按以下 JSON 格式返回每种食物的信息（不要返回任何其他文字，只返回 JSON）：[{\"name\":\"食物名称\",\"estimatedAmount\":估计重量克数,\"unit\":\"g\",\"proteinPer100g\":每100克蛋白质克数,\"carbsPer100g\":每100克碳水克数,\"fatPer100g\":每100克脂肪克数}]"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
          }
        }
      ]
    }
  ],
  "temperature": 0.3,
  "max_tokens": 1024
}
```

**图片处理**:

- 后端接收用户上传的 `multipart/form-data` 图片文件
- 将图片转换为 base64 编码字符串
- 限制图片最大尺寸：最短边不超过 1024px，以控制 token 消耗
- 支持的图片格式：JPEG、PNG、WEBP

### 9.3 Prompt 模板

```text
你是一位专业的营养师。请识别这张食物照片，并返回图片中每种食物的以下信息（按 JSON 数组格式）：
- name: 食物中文名称
- estimatedAmount: 估计份量（克）
- unit: "g"
- proteinPer100g: 每100克蛋白质含量（克）
- carbsPer100g: 每100克碳水化合物含量（克）
- fatPer100g: 每100克脂肪含量（克）

注意：
1. 不要返回热量（卡路里），热量由系统前端根据三大营养素计算
2. 如果图片中有多种食物，分别列出
3. 如果无法识别，返回空数组 []
4. 只返回 JSON，不要任何解释文字
```

### 9.4 响应解析

**DeepSeek 成功响应示例**:

```json
{
  "choices": [
    {
      "message": {
        "content": "[{\"name\":\"糙米饭\",\"estimatedAmount\":200,\"unit\":\"g\",\"proteinPer100g\":2.6,\"carbsPer100g\":23,\"fatPer100g\":0.9},{\"name\":\"西兰花\",\"estimatedAmount\":150,\"unit\":\"g\",\"proteinPer100g\":2.8,\"carbsPer100g\":7,\"fatPer100g\":0.4}]"
      }
    }
  ]
}
```

**后端解析逻辑**:

1. 从 `choices[0].message.content` 提取 JSON 字符串
2. 解析 JSON 数组
3. 将 `proteinPer100g` / `carbsPer100g` / `fatPer100g` 乘以 `estimatedAmount / 100`，得到 `estimatedTotal`
4. 为每种食物匹配或生成 `foodId`
5. 组装为接口响应格式返回给前端

### 9.5 错误降级策略

| 场景 | 行为 |
|------|------|
| DeepSeek API 超时（>15s） | 返回 `SERVICE_UNAVAILABLE` (503)，提示用户稍后重试 |
| DeepSeek API 返回非 JSON | 尝试正则提取 JSON，失败则返回空结果列表 |
| 图片格式不支持 | 返回 `UNPROCESSABLE_ENTITY` (422) |
| 图片超过 10MB | 返回 `UNPROCESSABLE_ENTITY` (422) |
| API Key 失效/额度不足 | 返回 `SERVICE_UNAVAILABLE` (503)，记录服务端日志 |

---

## 附录 A: 数据字典

### A.1 运动频率 (Activity Level)

| 值 | 说明 |
|----|------|
| `sedentary` | 久坐不动 |
| `lightly_active` | 轻度活动（每周 1-2 次运动） |
| `moderately_active` | 中度活动（每周 3-4 次运动） |
| `very_active` | 高度活动（每周 5-6 次运动） |

### A.2 健身目标 (Goal)

| 值 | 说明 |
|----|------|
| `lose_weight` | 减脂减重 |
| `maintain` | 维持现状 |
| `gain_muscle` | 增肌增重 |

### A.3 性别 (Gender)

| 值 | 说明 |
|----|------|
| `male` | 男 |
| `female` | 女 |
| `other` | 其他 |

### A.4 训练部位 (Exercise Category)

| 值 | 说明 |
|----|------|
| `chest` | 胸部 |
| `back` | 背部 |
| `shoulders` | 肩部 |
| `legs` | 腿部 |
| `arms` | 手臂 |
| `core` | 核心 |
| `cardio` | 有氧 |
| `full_body` | 全身 |

### A.5 训练类型 (Exercise Type)

| 值 | 说明 |
|----|------|
| `strength` | 力量训练（记录重量、组数、次数） |
| `cardio` | 有氧训练（记录时长、坡度、阻力） |

### A.6 餐次类型 (Meal Type)

| 值 | 说明 |
|----|------|
| `breakfast` | 早餐 |
| `lunch` | 午餐 |
| `dinner` | 晚餐 |
| `snack` | 加餐 |

### A.7 食物分类 (Food Category)

| 值 | 说明 |
|----|------|
| `staple` | 主食类 |
| `meat` | 肉类 |
| `vegetable` | 蔬菜类 |
| `oil` | 油脂类 |

### A.8 健康打卡项 (CheckIn ID)

| 值 | 说明 | 目标值 | 单位 |
|----|------|--------|------|
| `hydration` | 水分补充 | 2000 | ml |
| `sleep` | 睡眠质量 | 7.5 | h |
| `exercise` | 运动锻炼 | 1 | 次（训练完成自动打卡） |

### A.9 健康评分等级

| 等级 | 分数范围 | 说明 |
|------|----------|------|
| `A` | >= 90 | 优秀 |
| `B` | >= 75 | 良好 |
| `C` | >= 60 | 及格 |
| `D` | < 60 | 需改善 |

---

## 附录 B: HTTP 状态码与业务错误码汇总表

### B.1 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | GET / PATCH / DELETE 成功 |
| 201 | Created | POST 创建资源成功 |
| 400 | Bad Request | 请求格式错误或缺少必要参数 |
| 401 | Unauthorized | 未提供认证信息或认证失败（前端强制跳转 `/login`） |
| 403 | Forbidden | 已认证但无权访问该资源 |
| 404 | Not Found | 请求的资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 422 | Unprocessable Entity | 请求语义错误（验证失败） |
| 429 | Too Many Requests | 请求过于频繁（验证码/登录） |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 依赖服务不可用（如 DeepSeek API） |

### B.2 业务错误码

| 错误码 | 说明 | 对应 HTTP 状态码 |
|--------|------|------------------|
| `BAD_REQUEST` | 通用请求错误 | 400 |
| `UNAUTHORIZED` | 认证失败（未登录或 Token 过期） | 401 |
| `FORBIDDEN` | 权限不足 | 403 |
| `NOT_FOUND` | 资源未找到 | 404 |
| `CONFLICT` | 资源冲突 | 409 |
| `UNPROCESSABLE_ENTITY` | 参数校验失败或请求无法处理 | 422 |
| `INTERNAL_SERVER_ERROR` | 内部服务器错误 | 500 |
| `SERVICE_UNAVAILABLE` | AI 服务或依赖服务不可用 | 503 |

---

## 附录 C: 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0.0 | 2026-04-28 | 初始版本，基于项目确认清单重构，覆盖认证、用户、仪表盘、营养、训练、打卡、设置七大模块 |
