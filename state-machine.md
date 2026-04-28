# VitalPulse 前端状态机文档

> 版本：v1.0.0
> 日期：2026-04-28
> 适用范围：Next.js App Router 前端全站状态流转
> 关联文档：`prd.md`、`function.md`、`interface.md`、`data-schema.md`

---

## 1. 全局状态 (Global States)

### 1.1 认证状态机 (Auth State Machine)

```
┌─────────────┐     页面初始化读取 localStorage     ┌─────────────┐
│   unknown   │ ──────────────────────────────────→ │  loading    │
└─────────────┘                                       └──────┬──────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────┐
                    │                                         │         │
                    ▼                                         ▼         │
           ┌─────────────┐                          ┌─────────────┐     │
           │  logged_in  │ ←─────────────────────── │ logged_out  │     │
           └──────┬──────┘   调用 /auth/logout      └─────────────┘     │
                  │         清除 Token 并刷新页面                         │
                  │                                                      │
                  │         localStorage 无 accessToken                  │
                  │         或 /auth/refresh 返回 401                    │
                  └──────────────────────────────────────────────────────┘
```

#### 状态定义

| 状态 | 说明 | 来源 |
|------|------|------|
| `unknown` | 初始未知态，JS 尚未执行 | 页面 SSR 输出时 |
| `loading` | 正在从 localStorage 恢复 Token 或静默刷新中 | `useEffect` 初始化 |
| `logged_in` | 已持有有效 Access Token，可访问受保护路由 | 登录成功 / 刷新成功 |
| `logged_out` | 无有效 Token，或 Token 已过期且 Refresh 失败 | 登出 / 刷新失败 / 未登录 |

#### 状态转换表

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `unknown` | `loading` | 客户端 hydration 完成 | 读取 `localStorage.accessToken` | 仅在浏览器环境执行 |
| `loading` | `logged_in` | `localStorage` 存在有效 `accessToken` | 设置 Axios 全局 Authorization Header | Token 未过期（JWT exp > now） |
| `loading` | `logged_in` | `localStorage` 无 Token，但 Refresh Token 有效，调用 `/auth/refresh` 返回 200 | 写入新 Access Token + Refresh Token 到 `localStorage` | Refresh Token 未过期且未被撤销 |
| `loading` | `logged_out` | 无 Token 且 Refresh 失败或不存在 | 清除所有 Token 存储 | — |
| `logged_in` | `logged_out` | 用户点击「登出」| 调用 `POST /auth/logout`；清除 `localStorage` 所有 Token；`window.location.href = '/login'` | 网络可用时发送请求；离线也强制清除本地态 |
| `logged_in` | `logged_out` | Access Token 过期 + Refresh Token 过期/失效 | 拦截器捕获 401；清除 Token；跳转 `/login` | 任何 API 返回 401 且 `/auth/refresh` 也返回 401 |
| `logged_out` | `logged_in` | 登录页表单提交成功 | 写入 Token；跳转 `/dashboard` | 登录 API 返回 `success: true` |
| `logged_out` | `logged_in` | 注册页表单提交成功（含强制档案弹窗填写完毕）| 写入 Token；跳转 `/dashboard` | 注册 API 返回 `success: true` 且档案弹窗提交成功 |

### 1.2 JWT 自动刷新流程

```
API 请求返回 401 (UNAUTHORIZED)
        │
        ▼
┌─────────────────┐
│  检查 localStorage 中是否存在 refreshToken  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  存在      不存在
    │         │
    ▼         ▼
调用 POST /auth/refresh    直接跳转 /login
    │
    ▼
┌─────────────┐
│  响应 200   │ ──→ 更新 localStorage.accessToken
│  新 Token   │      重放原始请求
└──────┬──────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
200      401/403
│          │
│          ▼
│      清除 Token
│      跳转 /login
│
└──────→ 原始请求成功继续业务逻辑
```

#### 刷新状态转换

| From | To | Trigger | Side Effects |
|------|-----|---------|--------------|
| 正常请求中 | 静默刷新中 | Axios 响应拦截器捕获 401 | 挂起后续所有请求，进入队列；显示全局「登录状态恢复中」遮罩（可选，非阻塞） |
| 静默刷新中 | 正常请求中 | `/auth/refresh` 返回 200 | 更新 Token；顺序执行挂起请求队列 |
| 静默刷新中 | `logged_out` | `/auth/refresh` 返回 401/403 | 清空请求队列；Toast 提示「登录已过期，请重新登录」；跳转 `/login` |

### 1.3 路由守卫状态

```
用户访问受保护路由 (/dashboard /nutrition /training /settings)
        │
        ▼
┌────────────────────────────┐
│ 检查全局 authState === 'logged_in' │
└─────────────┬──────────────┘
              │
         ┌────┴────┐
         │         │
         ▼         ▼
       是         否
       │           │
       ▼           ▼
   正常渲染    检查 authState
                │
           ┌────┴────┐
           │         │
           ▼         ▼
        loading   logged_out
           │         │
           ▼         ▼
        显示骨架屏   强制跳转 /login
        等待状态确定   保留当前 URL 到 redirect 参数
```

#### 路由守卫转换

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| 任何受保护路由 | `/login` | `authState === 'logged_out'` | `router.push('/login?redirect=' + encodeURIComponent(currentPath))` | 仅在客户端导航时触发；SSR 时由 Middleware 处理（返回 302） |
| `/login` 或 `/register` | `/dashboard` | `authState === 'logged_in'` 且用户已访问登录页 | `router.replace('/dashboard')` | 登录态用户不允许停留在登录页（除登出后） |
| `/login` (带 redirect) | 原目标页 | 登录成功 | `router.replace(redirectUrl)` | redirect 参数必须为站内路径（防开放重定向） |

---

## 2. 登录页面状态机 (Login Page States)

页面路径：`/login`

### 2.1 状态总览

```
                    ┌─────────────┐
         ┌─────────→│   idle      │←────────────────┐
         │          │(表单待填写) │                  │
         │          └──────┬──────┘                  │
         │                 │                         │
         │    点击验证码图   │                         │
         │                 ▼                         │
         │    ┌─────────────────┐   加载成功         │
         │    │ captcha-loading │────────────────→   │
         │    │ (获取验证码中)   │                    │
         │    └────────┬────────┘                    │
         │              │ 加载失败                     │
         │              ▼                            │
         │    ┌─────────────────┐   点击重试         │
         └────│  captcha-error  │───────────────────┘
              │ (验证码获取失败) │
              └─────────────────┘

idle ──→ 点击提交 ──→ submitting ──→ 成功 ──→ success ──→ 跳转 /dashboard
                        │
                        └──→ 失败 ──→ error (wrong-password / wrong-captcha / account-not-found)
```

### 2.2 状态转换详表

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| — | `idle` | 页面 mount | 自动调用 `POST /auth/captcha` 获取验证码；清空表单字段（手机号保留上次输入） | — |
| `idle` | `captcha-loading` | 用户点击验证码图片 | 显示验证码区域 loading spinner（Skeleton） | 当前无正在进行的验证码请求（防抖 500ms） |
| `captcha-loading` | `idle` | `/auth/captcha` 返回 200 | 更新 `captchaToken` + `captchaImage` 到组件 state；图片 Base64 渲染 | — |
| `captcha-loading` | `captcha-error` | `/auth/captcha` 返回 500 或网络超时 | 显示「验证码加载失败，点击重试」提示；保留旧验证码（如有）或显示占位图 | 错误码为 `INTERNAL_SERVER_ERROR` 或请求超时 |
| `captcha-error` | `captcha-loading` | 用户点击重试区域 | 重新发起 `POST /auth/captcha` | 同上的防抖 Guard |
| `idle` | `submitting` | 用户点击「登录」按钮 | 按钮进入 loading 态（disabled + spinner）；前端表单校验 | 手机号 8-15 位数字、密码 >= 6 位、验证码 4 位数字均通过 |
| `submitting` | `success` | `POST /auth/login` 返回 200 | 写入 `localStorage.accessToken` / `refreshToken`；更新全局 `authState` 为 `logged_in`；Toast「登录成功」 | 响应 `success === true` |
| `success` | —（页面卸载）| 定时器 800ms 后 | `router.replace('/dashboard')` 或 `redirect` 参数指定页 | — |
| `submitting` | `error.wrong-password` | `POST /auth/login` 返回 401，message 含「密码错误」| 按钮恢复可点击；密码输入框清空并聚焦；显示红色错误文案「手机号或密码错误」；验证码自动刷新一次 | 后端错误码 `UNAUTHORIZED` |
| `submitting` | `error.wrong-captcha` | `POST /auth/login` 返回 401，message 含「验证码错误」| 按钮恢复可点击；验证码输入框清空并聚焦；显示「验证码错误，请重新输入」；自动调用刷新验证码 | 后端错误码 `UNAUTHORIZED` 且验证码字段被指出 |
| `submitting` | `error.account-not-found` | `POST /auth/login` 返回 401，message 含「账号不存在」| 按钮恢复可点击；手机号输入框下方显示红色提示「该账号不存在，请前往注册」；提供「去注册」快捷链接 | 后端错误码 `UNAUTHORIZED` |
| `submitting` | `error.rate-limited` | 连续 5 次密码错误后后端返回 429 | 显示「账号已临时锁定 15 分钟，请稍后再试」；整个表单置灰不可操作；启动 15 分钟倒计时 | 后端错误码 `TOO_MANY_REQUESTS` |
| 任意 `error.*` | `idle` | 用户修改任意表单字段 | 清除当前错误提示；恢复按钮可点击状态 | — |

### 2.3 表单校验状态 (Inline Validation)

| 字段 | 校验规则 | 状态变化 |
|------|----------|----------|
| 手机号 | 失去焦点时校验：纯数字、长度 8-15 | `idle.validating-phone` → `idle.phone-valid` / `idle.phone-invalid`（显示「手机号格式不正确」） |
| 密码 | 失去焦点时校验：长度 >= 6 | `idle.password-invalid`（显示「密码至少 6 位」） |
| 验证码 | 输入时实时校验：纯数字、长度 == 4 | 输入非数字自动拦截；未满 4 位时提交按钮 disabled |

---

## 3. 注册页面状态机 (Register Page States)

页面路径：`/register`

### 3.1 状态总览

```
─→ idle ──→ 点击提交 ──→ submitting ──→ 注册成功 ──→ success-then-forced-profile-popup
                │                              │
                └──→ 失败 ──→ error (phone-exists / password-mismatch / wrong-captcha)
```

### 3.2 状态转换详表

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| — | `idle` | 页面 mount | 自动获取验证码；所有字段为空 | — |
| `idle` | `submitting` | 点击「注册」按钮 | 前端校验全部字段；按钮 loading | 手机号、密码、确认密码、验证码格式均正确 |
| `submitting` | `success-then-forced-profile-popup` | `POST /auth/register` 返回 201 | 写入 Token 到 `localStorage`；更新全局 `authState` 为 `logged_in`；立即弹出「个性化计划弹窗」（Profile Popup），不可关闭 | `success === true` |
| `submitting` | `error.phone-exists` | 返回 409 CONFLICT | 显示「该手机号已注册，请直接登录」；提供跳转 `/login` 链接 | 后端错误码 `CONFLICT` |
| `submitting` | `error.password-mismatch` | 前端校验触发 | 确认密码框标红抖动；显示「两次输入的密码不一致」 | 前端 Guard：密码 != 确认密码时阻止提交 |
| `submitting` | `error.wrong-captcha` | 返回 401 | 同登录页验证码错误处理 | — |
| `submitting` | `error.validation-failed` | 返回 422 | 显示「请检查输入信息是否正确」；对应字段标红 | 后端错误码 `UNPROCESSABLE_ENTITY` |

---

## 4. 个性化计划弹窗状态机 (Profile Popup States)

触发场景：
1. 新用户注册成功后强制弹出（不可关闭/跳过）
2. 老用户在 Dashboard 点击右下角浮动「更新计划」按钮主动打开（可关闭）

### 4.1 状态总览

```
modal-closed ──→ modal-open (forced / editable)
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   field-typing   validating   submitting
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
                success ──→ 自动关闭弹窗 ──→ 跳转 /dashboard
                      │
                      └──→ error (api-error / validation-error)
```

### 4.2 状态转换详表

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `modal-closed` | `modal-open.forced` | 注册成功后自动弹出 | 背景遮罩 `backdrop-filter: blur`；**不显示关闭按钮（×）**；**不响应 ESC 键**；**点击遮罩不关闭** | 仅在新用户注册成功后的首次场景 |
| `modal-closed` | `modal-open.editable` | Dashboard 点击「更新计划」浮动按钮 | 弹窗预填充当前用户数据；显示关闭按钮；响应 ESC 和遮罩点击关闭 | 全局 `authState === 'logged_in'` |
| `modal-open` | `field-typing` | 用户输入任意字段 | 实时清除该字段的错误提示 | — |
| `field-typing` | `validating` | 字段失去焦点（blur）| 前端单字段校验 | — |
| `validating` | `modal-open` | 字段校验通过 | 移除该字段红色边框 | — |
| `validating` | `modal-open.field-error` | 字段校验失败 | 字段边框变红；显示具体错误文案 | 规则见下表 |
| `modal-open` | `submitting` | 点击「生成我的计划」| 前端全字段校验；按钮 loading；调用 `PUT /users/me/plan` | 所有必填字段通过校验 |
| `submitting` | `success` | API 返回 200 | 展示计划摘要卡片（BMI、BMR、TDEE、每日热量目标、三大营养素目标、饮水目标 2000ml、睡眠目标 7.5h）；按钮变为「进入首页」 | `success === true` |
| `success` | `modal-closed` | 用户点击「进入首页」| 关闭弹窗；`router.push('/dashboard')`；Toast「个性化计划已生成」 | 强制场景下必须点击才能关闭 |
| `submitting` | `error.api-error` | API 返回 500 或网络断开 | 显示「保存失败，请重试」；按钮恢复可点击 | — |

### 4.3 字段校验规则与状态

| 字段 | 校验规则 | 错误状态文案 |
|------|----------|--------------|
| 身高 | 50-300 cm | 「身高需在 50-300 cm 之间」 |
| 体重 | 20-300 kg | 「体重需在 20-300 kg 之间」 |
| 年龄 | 10-100 整数 | 「年龄需在 10-100 岁之间」 |
| 性别 | 必选一个（男/女/其他）| 「请选择性别」 |
| 运动频率 | 必选一个 | 「请选择运动频率」 |
| 健身目标 | 必选一个（减脂/维持/增肌）| 「请选择健身目标」 |

### 4.4 特殊边界状态

| 场景 | 状态 | 行为 |
|------|------|------|
| 新用户中途关闭浏览器 | `modal-open.forced`（下次重新进入）| 下次访问时因无完成标记，重新弹出弹窗；已填写字段**不保留**（因未登录完成前无持久化用户身份） |
| 老用户更新计划 | `modal-open.editable` | 预填充 `user_profiles` 当前数据；提交后后端触发 `trg_update_profile_targets` 重新计算；级联更新未来日期 `daily_nutrition` 目标值 |
| API 计算失败 | `error.api-error` | 弹窗内展示错误提示，允许重新提交；不关闭弹窗 |

---

## 5. 仪表盘页面状态机 (Dashboard States)

页面路径：`/dashboard`

### 5.1 状态总览

```
page-mount
    │
    ▼
data-loading ──→ data-loaded ──→ empty-state (新用户无数据)
    │                │
    │                ├──→ date-switching ──→ data-loading (新日期数据)
    │                │
    │                ├──→ checklist-item-toggling ──→ data-loaded (评分更新)
    │                │
    │                └──→ chart-loading ──→ chart-loaded
    │
    └──→ error (网络/API 错误)
```

### 5.2 状态转换详表

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| — | `data-loading` | 页面 mount 或日期切换 | 调用 `GET /dashboard?date=YYYY-MM-DD`；显示骨架屏（shimmer）| `authState === 'logged_in'` |
| `data-loading` | `data-loaded` | API 返回 200 | 渲染所有组件：欢迎语、营养卡片、身体指标、评分清单、环形图、7 日趋势图 | `success === true` |
| `data-loading` | `empty-state` | API 返回 200 但当日无任何记录 | 营养进度条显示 0%；健康评分显示「--」；环形图为灰色空心；提示「开始记录以获取评分」；提供快捷入口跳转到 `/nutrition` 和 `/training` | `nutrition.current === 0` 且无 checklist 完成项 |
| `data-loading` | `error` | API 返回 500 或网络超时 | 显示「数据加载失败」占位图；提供「重试」按钮 | — |
| `data-loaded` | `date-switching` | 用户点击日期左右箭头 | 进入 `data-loading` 状态（仅图表和数据区，保留页面框架）；调用 `GET /dashboard?date=newDate` | 新日期格式合法 |
| `date-switching` | `data-loaded` | 新日期数据返回 | 全页数据联动刷新 | — |
| `date-switching` | `future-date-readonly` | 切换日期 > 今天 | 所有打卡项置为不可编辑；显示提示条「未来日期无法记录」；输入控件 disabled | 日期 > 当前系统日期 |
| `date-switching` | `past-empty-state` | 切换日期 < 今天 且 无数据 | 展示空状态「当日无记录」；提供「补录」入口跳转 `/nutrition` 或 `/training` | — |
| `data-loaded` | `checklist-item-toggling` | 用户点击打卡项（水分/睡眠）| 弹出快捷输入面板（饮水：+250ml / +500ml / 自定义；睡眠：小时输入） | 当前日期为今天（非未来/过去） |
| `checklist-item-toggling` | `data-loaded` | 输入确认后调用 `POST /checkin/:id` 成功 | 该打卡项变为 completed（实心勾选）；触发健康评分重新计算；环形图动画更新；营养卡片旁的「完成率」更新 | — |
| `data-loaded` | `chart-loading` | 7 日趋势图数据缺失或首次进入视口 | 图表区域显示 shimmer；调用 `GET /nutrition/trends?startDate=&endDate=` | IntersectionObserver 触发 |
| `chart-loading` | `chart-loaded` | 趋势数据返回 | 渲染 3 条实线 + 3 条虚线折线图；不足 7 天显示断点提示 | — |
| `data-loaded` | `score-ring-animating` | 首次进入视口且评分 > 0 | 环形图执行 1s ease-out 动画 | IntersectionObserver 仅触发一次 |

### 5.3 打卡项交互状态

| 打卡项 | 未完成状态 | 完成状态 | 快捷操作面板状态 |
|--------|-----------|----------|-----------------|
| 水分补充 | 空心圆圈 + 「已饮用 X ml (目标 Y ml)」| 绿色实心勾选 + 当前值标绿 | 展开：+250ml 按钮、+500ml 按钮、自定义输入框（ml） |
| 睡眠质量 | 空心圆圈 + 「睡眠 X h (目标 Y h)」| 绿色实心勾选 | 展开：数字输入框（小时，步进 0.5h，默认 7.5h） |
| 运动锻炼 | 空心圆圈 + 「0 次 (目标 1 次)」| 绿色实心勾选（自动） | 无快捷操作；点击跳转 `/training`；训练完成由系统自动勾选 |

### 5.4 BMI / BMR 卡片交互状态

| 状态 | 触发 | 表现 |
|------|------|------|
| `bmi-collapsed` | 默认 | 显示数值 + 等级标签（偏瘦/正常/超重/肥胖） |
| `bmi-expanded` | 点击 BMI 卡片 | 展开浮层「BMI 是什么？」简要说明；再次点击收起 |
| `bmr-tooltip` | 点击 BMR 卡片 | Tooltip 显示「基础代谢率是指人体在静息状态下维持生命所需的最低热量」 |

---

## 6. 饮食与营养页面状态机 (Nutrition Page States)

页面路径：`/nutrition`

### 6.1 状态总览

```
page-mount
    │
    ▼
page-loading ──→ page-loaded
                      │
        ┌─────────────┼─────────────┬─────────────────┐
        │             │             │                 │
        ▼             ▼             ▼                 ▼
  ai-upload-idle  manual-food   daily-overview     food-category-tabs
        │         staging           │
        │             │             │
        ▼             ▼             ▼
  ai-upload-loading  item-editing  meal-confirming
        │             │             │
        ▼             ▼             ▼
  ai-result-displayed  staged      meal-success
        │             │             │
        ▼             │             ▼
  ai-result-editing   │        daily-overview-updating
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
                page-loaded (数据刷新)
```

### 6.2 状态转换详表

#### 页面级状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| — | `page-loading` | 页面 mount | 并发调用：`GET /nutrition/today`、`GET /nutrition/food-categories`、`GET /nutrition/oil-options` | — |
| `page-loading` | `page-loaded` | 所有 API 返回 | 渲染今日摄入概览、食物分类面板、AI 上传区 | 所有请求 `success === true` |
| `page-loading` | `page-error` | 任一 API 返回 500 或网络超时 | 显示全页错误占位；提供「刷新页面」按钮 | — |

#### AI 拍照识别状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `ai-upload-idle` | `ai-upload-loading` | 用户选择图片文件（点击上传区或拖拽）| 前端校验：文件类型（jpg/png/webp）、大小 <= 10MB、分辨率 >= 300x300；通过后显示上传进度/loading；调用 `POST /nutrition/ai-recognize` (multipart/form-data) | 同时只能有 1 个识别任务在进行中（后续任务排队或提示「请等待当前识别完成」） |
| `ai-upload-loading` | `ai-result-displayed` | API 返回 200 且识别成功 | 展示识别结果卡片（食物名称、蛋白质、碳水、脂肪、前端计算热量 = 蛋白×4 + 碳水×4 + 脂肪×9）；显示置信度标签 | `results.length > 0` |
| `ai-upload-loading` | `ai-upload-idle` | API 返回 503 (DeepSeek 不可用) | 显示「AI 识别服务暂时不可用」；提供「重试」和「手动录入」两个选项 | 后端错误码 `SERVICE_UNAVAILABLE` |
| `ai-upload-loading` | `ai-upload-idle` | API 返回 200 但识别为空数组 | 显示「未识别出食物，请尝试重新拍摄或手动录入」 | `results.length === 0` |
| `ai-result-displayed` | `ai-result-editing` | 用户点击营养数值输入框进行修改 | 蛋白质、碳水、脂肪变为可编辑 input；热量实时重新计算 | — |
| `ai-result-editing` | `ai-result-displayed` | 用户点击「确认使用」| 将该食物数据加入「当前餐食待确认列表」；清空 AI 结果区 | 数值为非负数且有上限（单营养素 <= 500g） |
| `ai-result-displayed` | `ai-upload-idle` | 用户点击「重新拍摄」| 清空当前结果；重新唤起文件选择器 | — |
| `ai-result-displayed` | `manual-food-staging` | 用户点击「手动录入」| 将当前 AI 结果区收起；跳转至手动录入面板 | — |

#### 手动食物录入状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `page-loaded` | `manual-food-staging` | 用户在食物输入框输入克数 | 该食物项高亮（绿色背景）；实时显示热量小标签（如「+156 kcal」）；数据加入前端 staging 数组 | 克数 > 0 且 <= 5000（超出自动截断并提示） |
| `manual-food-staging` | `staging-item-editing` | 用户点击「+」/「-」快捷按钮或手动修改克数 | 实时更新该食物 staging 数据；重新计算该食物热量 | — |
| `staging-item-editing` | `manual-food-staging` | 用户清空输入框（克数 = 0 或空）| 该食物项取消高亮；从 staging 数组移除 | — |
| `manual-food-staging` | `food-category-tabs` | 用户点击分类标题折叠/展开 | 该分类面板收起/展开（手风琴模式，可同时展开多个） | — |
| `manual-food-staging` | `oil-option-selected` | 用户选择油脂用量（无油/少油/中等/多油）| 选中项高亮；关联系统油脂食物（食用油条目）；按克数计算脂肪与热量 | 单选互斥 |

#### 餐食确认与记录状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `manual-food-staging` (空) | — | — | 底部 CTA 按钮置灰 disabled；文字显示「请选择食物」 | `stagingList.length === 0` |
| `manual-food-staging` (有数据) | `meal-confirming` | 点击底部 CTA「确认并记录」| 弹出确认浮层：展示食物清单（名称+克数+热量）、餐别选择（早餐/午餐/晚餐/加餐，默认按当前时间智能推断：05-10早餐/11-14午餐/17-20晚餐/其他加餐）、备注输入框 | `stagingList.length > 0` |
| `meal-confirming` | `meal-submitting` | 用户点击浮层「确认」| 按钮进入 loading 态；防抖 2 秒防止重复提交；调用 `POST /nutrition/meals` | — |
| `meal-submitting` | `meal-success` | API 返回 201 | Toast「记录成功！」；浮层关闭；清空所有食物输入框（staging 归零）；触发 `daily-overview-updating` | `success === true` |
| `meal-submitting` | `meal-error` | 网络断开 | 提示「网络异常，请检查网络后重试」；保留当前 staging 状态不丢失 | 请求超时或网络错误 |
| `meal-success` | `daily-overview-updating` | 自动触发 | 调用 `GET /nutrition/today` 刷新今日摄入概览；4 个指标大字号执行 count-up 动画（500ms）；进度条平滑过渡 | — |
| `daily-overview-updating` | `page-loaded` | 数据刷新完成 | 今日摄入概览更新为新数据；CTA 按钮恢复为「请选择食物」（因 staging 已清空） | — |

### 6.3 今日摄入概览数字动画状态

| From | To | Trigger | Side Effects |
|------|-----|---------|--------------|
| `metric-static` | `metric-counting-up` | 数据更新且新值 != 旧值 | 数字从旧值滚动到新值，时长 500ms |
| `metric-counting-up` | `metric-static` | 动画结束 | 显示最终数值 |
| `metric-static` | `pie-chart-expanded` | 用户点击总热量数字 | 展开热量来源饼图（按餐别划分） |

---

## 7. 每日训练页面状态机 (Training Page States)

页面路径：`/training`

### 7.1 状态总览

```
page-mount
    │
    ▼
page-loading ──→ page-loaded
                      │
        ┌─────────────┼─────────────┬─────────────────┐
        │             │             │                 │
        ▼             ▼             ▼                 ▼
   exercise-library  filter-tabs   staging-list    today-goal-card
   -loading         (all/chest/   (empty/has)     (in-progress/
                    back/...)                      achieved)
        │             │             │                 │
        ▼             │             ▼                 ▼
   page-loaded       │      staging-item-editing   yesterday-review
                      │             │              (has-data/empty)
                      │             ▼                 │
                      │      submitting-training      ▼
                      │             │           weekly-stats-loading
                      │             ▼                 │
                      │      success-clear-list   weekly-stats-loaded
                      │             │
                      └─────────────┘
```

### 7.2 状态转换详表

#### 页面级状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| — | `page-loading` | 页面 mount | 并发调用：`GET /training/today`、`GET /training/yesterday`、`GET /training/weekly-stats`、`GET /training/exercises?category=all` | — |
| `page-loading` | `page-loaded` | 所有 API 返回 | 渲染今日目标、昨日回顾、本周统计、动作库 Bento 网格 | — |
| `page-loading` | `page-error` | 动作库 API 返回 500 | 动作库区域显示「加载失败，点击重试」占位图；其余区域正常渲染 | — |

#### 动作库与筛选状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `page-loaded` | `filter-tabs.active` | 用户点击筛选标签（全部/胸部/背部/肩部/腿部/有氧）| 该标签高亮（背景色变化）；动作库 Bento 网格过滤显示对应部位动作；无匹配时显示「该分类下暂无动作」空状态 | 标签点击即时响应，无需等待 API（前端过滤） |
| `page-loaded` | `exercise-card-focusing` | 用户 hover 动作卡片 | 卡片阴影加深；输入框获得焦点时边框变为主色 | — |
| `exercise-card-focusing` | `staging-item-adding` | 用户点击「+」按钮 | 将动作（含当前输入参数，未输入则使用系统默认值 default_sets/default_reps/default_duration_min）加入「今日训练清单」| 清单长度 <= 20（超出 toast 提示「单次训练建议不超过 20 个动作」） |
| `staging-item-adding` | `page-loaded` | 添加成功 | 该动作卡片的「+」变为勾选状态；再次点击可移除 | — |

#### 今日训练清单状态

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| `staging-list-empty` | `staging-list-has-items` | 用户添加第一个动作 | 底部清单区域从空状态变为列表展示；CTA 按钮从「请先添加动作」（置灰）变为「提交今日训练（N 个动作）」 | `list.length === 1` |
| `staging-list-has-items` | `staging-item-editing` | 用户在清单内修改参数（重量/组数/时长）或移除动作 | 实时更新前端清单状态；若移除后长度为 0 回到 `staging-list-empty` | — |
| `staging-list-has-items` | `staging-list-empty` | 用户点击「清空清单」| 弹出二次确认对话框：「确定清空当前训练计划？」；确认后清空 | 清单长度 > 0 |
| `staging-list-has-items` | `submitting-training` | 点击「提交今日训练」| 弹出确认浮层：展示动作列表汇总；按钮 loading；防抖 2 秒 | — |
| `submitting-training` | `success-clear-list` | API 返回 200/201 | Toast「训练记录成功！」；清单清空（回到 `staging-list-empty`）；自动触发 `health_checklist.exercise_done = true`；触发 Dashboard 数据刷新 | `success === true` |
| `success-clear-list` | `today-goal-updating` | 自动触发 | 今日目标卡片进度更新；若已完成目标次数，状态变为 `today-goal-achieved` | — |
| `today-goal-achieved` | — | — | 卡片显示「今日目标已达成！」；进度 100% | — |

#### 今日目标卡片状态

| 状态 | 触发条件 | 展示内容 |
|------|----------|----------|
| `today-goal-in-progress` | 今日已完成次数 < 目标次数 | 「今日已计划/完成 X 次训练」、训练部位标签、预计总时长、进度环 |
| `today-goal-achieved` | 今日已完成次数 >= 目标次数 | 「今日目标已达成！」、进度 100%、绿色高亮 |
| `today-goal-first-time` | 用户从未训练过 | 「开始你的第一次训练！」引导文案 |

#### 昨日训练回顾状态

| 状态 | 触发条件 | 展示内容 |
|------|----------|----------|
| `yesterday-review-has-data` | `GET /training/yesterday` 返回 `hasWorkout === true` | 横向卡片展示昨日最后一次训练的动作列表（动作名 + 组数×次数/时长） |
| `yesterday-review-expanded` | 用户点击昨日回顾卡片 | 展开完整训练详情（所有动作、每组重量/次数） |
| `yesterday-review-empty` | `hasWorkout === false` | 卡片隐藏，不占位 |

#### 本周统计状态

| From | To | Trigger | Side Effects |
|------|-----|---------|--------------|
| `weekly-stats-loading` | `weekly-stats-loaded` | API 返回 | 三个指标（训练次数、总时长、同比增幅）执行 count-up 数字动画 |
| `weekly-stats-loaded` | — | 上周为 0 | 同比增幅显示「N/A」或「--」 |

---

## 8. 系统设置页面状态机 (Settings Page States)

页面路径：`/settings`

### 8.1 状态总览

```
page-mount
    │
    ▼
page-loading ──→ page-loaded
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
  logout-confirming  changelog-   privacy-policy-
                     modal-open   modal-open
```

### 8.2 状态转换详表

| From | To | Trigger | Side Effects | Guard |
|------|-----|---------|--------------|-------|
| — | `page-loading` | 页面 mount | 调用 `GET /settings/app-info`、`GET /settings/developers`（公开接口，无需认证） | — |
| `page-loading` | `page-loaded` | API 返回 | 渲染应用信息卡片、开发者信息、底部操作按钮 | — |
| `page-loaded` | `logout-confirming` | 用户点击「退出登录」| 弹出二次确认对话框：「确定要退出登录吗？所有本地数据将被清除。」；选项「取消」/「确认退出」 | 全局 `authState === 'logged_in'` |
| `logout-confirming` | `page-loaded` | 点击「取消」| 关闭确认对话框；保持当前页面 | — |
| `logout-confirming` | `logged_out`（全局）| 点击「确认退出」| 调用 `POST /auth/logout`；清除 `localStorage` 所有 Token；全局 `authState` 变为 `logged_out`；`window.location.href = '/login'` | — |
| `page-loaded` | `changelog-modal-open` | 点击「更新日志」按钮 | 弹出模态框；调用 `GET /settings/changelog`；按版本倒序展示时间线；支持 Markdown 渲染 | — |
| `changelog-modal-open` | `page-loaded` | 点击关闭按钮/ESC/遮罩 | 关闭模态框 | — |
| `page-loaded` | `privacy-policy-modal-open` | 点击「隐私政策」按钮 | 弹出模态框或新标签页（视实现）；调用 `GET /settings/privacy-policy`；渲染 Markdown 内容 | — |
| `privacy-policy-modal-open` | `page-loaded` | 点击关闭按钮/ESC/遮罩 | 关闭模态框 | — |
| `privacy-policy-modal-open` | `privacy-policy-error` | URL 无法访问或 API 返回 500 | 提示「链接暂时无法访问，请稍后重试」 | — |

---

## 9. 错误与边界状态 (Error & Boundary States)

### 9.1 全局错误状态机

```
正常页面渲染
    │
    ▼
┌─────────────────────────┐
│ 捕获错误类型             │
└───────────┬─────────────┘
            │
    ┌───────┼───────┬───────────┬───────────┐
    │       │       │           │           │
    ▼       ▼       ▼           ▼           ▼
  401     503    网络错误    表单校验错误   500+
    │       │       │           │           │
    ▼       ▼       ▼           ▼           ▼
  重定向   AI降级   重试机制    字段标红     全局错误页
  /login   手动录入  Toast提示   抖动动画     或占位图
```

### 9.2 错误状态转换详表

| 错误类型 | From | To | Trigger | Side Effects | Guard |
|----------|------|-----|---------|--------------|-------|
| **401 未授权** | 任何受保护页面 | `/login` | API 返回 401 且 Refresh 失败 | 清除 Token；Toast「登录已过期，请重新登录」；跳转 `/login?redirect=currentPath` | 排除 `/auth/login` 和 `/auth/register` 本身 |
| **503 DeepSeek 不可用** | `ai-upload-loading` | `ai-degraded-to-manual` | `POST /nutrition/ai-recognize` 返回 503 | 显示「AI 识别服务暂时不可用，请使用手动录入」；提供「手动录入」快捷跳转按钮 | 后端错误码 `SERVICE_UNAVAILABLE` |
| **网络错误** | 任何 API 请求中 | `network-error` | `navigator.onLine === false` 或请求超时 | Toast「网络连接异常，请检查网络后重试」；表单类请求保留用户输入不丢失 | 通过 Axios 拦截器统一捕获 `error.message === 'Network Error'` |
| **网络恢复** | `network-error` | 正常状态 | `window.online` 事件触发 | 自动重试最近一次失败的请求（仅限幂等请求 GET/PUT） | — |
| **表单校验错误** | 任意表单填写中 | `field-error` | 失去焦点时校验失败 | 输入框边框变红（`border-color: error`）；显示错误文案；执行 shake 动画（300ms） | — |
| **服务端校验错误 422** | `submitting` | `form-error` | API 返回 422 | 将后端返回的字段级错误映射到对应输入框；全局错误提示置顶 | 解析后端 `error.details` 数组 |
| **500 服务器内部错误** | 任何页面 | `global-error` | API 返回 500 | 显示全局错误边界页（「系统遇到一些问题」）；提供「刷新页面」和「返回首页」按钮 | 由 React Error Boundary 捕获 |
| **429 请求过快** | `submitting` | `rate-limited` | API 返回 429 | 按钮置灰；显示倒计时；提示「操作过于频繁，请稍后再试」 | — |

### 9.3 错误降级策略状态

| 场景 | 降级状态 | 行为 |
|------|----------|------|
| DeepSeek API 超时 (>15s) | `ai-timeout` | 返回 503 给前端；前端降级为纯手动录入；本地缓存高频食物识别结果（未来扩展） |
| 高并发下聚合表更新延迟 | `data-stale` | 仪表盘展示时显示「数据更新中」轻提示；前端乐观更新后等待 WebSocket 或轮询确认 |
| 图片上传超过 10MB | `file-oversize` | 前端拦截不上传；提示「图片大小超过 10MB，请压缩后重试」 |
| 图片格式不支持 | `file-type-error` | 前端拦截；提示「仅支持 JPG、PNG 格式」 |
| 用户连续快速上传 | `upload-queue-blocked` | 限制同时只能有 1 个识别任务；后续任务提示「请等待当前识别完成」 |

### 9.4 边界状态定义

| 边界状态 | 表现 | 恢复方式 |
|----------|------|----------|
| `skeleton-loading` | 页面区块显示 shimmer 骨架屏 | 数据加载完成后自动恢复 |
| `empty-state` | 显示空状态插图 + 引导文案 | 用户执行对应操作（添加记录）后恢复 |
| `readonly-past` | 过去日期的打卡项不可编辑 | 切换回今天后恢复 |
| `readonly-future` | 未来日期所有操作 disabled | 切换回今天后恢复 |
| `offline-mode` | 网络断开时的本地缓存态 | 网络恢复后自动同步 |
| `session-expired` | 所有操作跳转登录 | 重新登录后恢复 |

---

## 附录：状态机实现建议

### A.1 状态管理选型

| 状态层级 | 推荐方案 | 理由 |
|----------|----------|------|
| 全局认证状态 | Zustand / Jotai | 轻量，跨组件共享，配合持久化中间件同步 localStorage |
| 页面级状态 | React `useReducer` + Context | 登录/注册/弹窗等页面内状态复杂，适合 reducer 模式 |
| 表单状态 | React Hook Form | 内置校验、防抖、错误管理 |
| 服务端状态 | TanStack Query (SWR) | 自动缓存、重试、刷新、乐观更新 |
| 临时 UI 状态 | 局部 `useState` | 模态框开关、hover、动画触发等 |

### A.2 关键状态持久化规则

| 状态 | 持久化位置 | 说明 |
|------|-----------|------|
| Access Token | `localStorage` | 页面刷新后恢复登录态 |
| Refresh Token | `localStorage` | 用于无感刷新 |
| 训练 staging 清单 | `sessionStorage` | 页面刷新不丢失，关闭标签页后清除 |
| 食物 staging 清单 | `sessionStorage` | 同上 |
| 当前选中日期 (Dashboard) | `sessionStorage` | 刷新后保持日期上下文 |
| 用户偏好设置 | `localStorage` | 语言等长期偏好 |

### A.3 状态命名规范

- 全局状态：`camelCase`，如 `authState`、`currentUser`
- 页面状态：`[page]-[state]`，如 `dashboard-data-loading`、`nutrition-ai-upload-loading`
- 布尔标记：`is` / `has` / `should` 前缀，如 `isSubmitting`、`hasError`
- 错误状态：`error.[type]`，如 `error.wrongPassword`、`error.network`
