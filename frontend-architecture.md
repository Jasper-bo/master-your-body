# VitalPulse 前端组件架构文档

## 1. 技术栈确认

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | 服务端组件减少首屏 JS，API Routes 处理文件上传与 JWT 鉴权 |
| 语言 | TypeScript 5.x | 全类型覆盖，接口与组件 props 严格定义 |
| ORM | Prisma | API Routes 中操作 PostgreSQL（生产）/ SQLite（本地开发），类型安全 |
| 样式 | Tailwind CSS 3.x | 推荐理由：原型全部基于 Tailwind；utility-first 适合仪表盘大量微布局；与 Next.js 零配置集成；设计令牌（color/surface/container）可直接映射为 Tailwind 自定义主题。不使用 CSS Modules，避免同一 feature 内样式文件与 TSX 分离维护。 |
| 图表 | Recharts + 自定义 SVG | Recharts 负责 7 日营养趋势折线图（实线+虚线组合、Tooltip、图例显隐）；评分环形图用自定义 SVG `<circle>` 实现（单环动画轻量，无需引入图表库重渲染开销） |
| 状态管理 | Zustand 4.x | 轻量、TypeScript 友好、无 Provider 嵌套，适合两份"购物车"型暂存状态（饮食 staging、训练 staging） |
| 字体 | Manrope (标题) + Inter (正文) | 与原型一致；通过 `next/font/google` 加载，避免渲染阻塞 |
| 图标 | Material Symbols Outlined | `next/font/google` 子集加载，CSS font-variation-settings 控制 fill/weight |

---

## 2. 目录结构

按 feature 组织，拒绝按文件类型扁平化。

```text
src/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # 登录页（Client Component）
│   │   ├── register/
│   │   │   └── page.tsx              # 注册页（Client Component）
│   │   └── layout.tsx                # 无导航栏的极简布局
│   ├── (main)/
│   │   ├── dashboard/
│   │   │   └── page.tsx              # 仪表盘（Server Component 外壳）
│   │   ├── nutrition/
│   │   │   └── page.tsx              # 饮食与营养（Client Component，大量交互）
│   │   ├── training/
│   │   │   └── page.tsx              # 每日训练（Client Component）
│   │   ├── settings/
│   │   │   └── page.tsx              # 系统设置（Server Component 外壳）
│   │   └── layout.tsx                # 带 TopNav + 全局 Toast 的主布局
│   ├── api/                          # API Routes（与 interface.md 对齐）
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── nutrition/
│   │   ├── training/
│   │   ├── checkin/
│   │   ├── users/
│   │   └── settings/
│   ├── layout.tsx                    # 根布局（Provider、字体加载）
│   └── globals.css                   # Tailwind directives + CSS variables
│
├── components/                       # 按 feature 组织组件
│   ├── dashboard/
│   │   ├── DateHeader.tsx
│   │   ├── NutritionProgressBars.tsx
│   │   ├── BMICard.tsx
│   │   ├── BMRCard.tsx
│   │   ├── CompletionRate.tsx
│   │   ├── HealthChecklist.tsx
│   │   ├── ScoreRingChart.tsx
│   │   ├── TrendChart.tsx
│   │   ├── FloatingPlanButton.tsx
│   │   └── ProfileModal.tsx          # 个性化计划弹窗（强制/更新两用）
│   ├── nutrition/
│   │   ├── AIUploadZone.tsx
│   │   ├── AIResultEditor.tsx
│   │   ├── AIResultCard.tsx          # 单条 AI 识别结果卡片
│   │   ├── DailyOverviewCard.tsx
│   │   ├── FoodCategoryTabs.tsx
│   │   ├── FoodSelector.tsx
│   │   ├── OilSelector.tsx
│   │   ├── StagingList.tsx           # 餐食暂存清单
│   │   ├── MealConfirmDialog.tsx
│   │   └── FoodInputRow.tsx          # 单一食物输入行（克数 +/-）
│   ├── training/
│   │   ├── TodayGoalCard.tsx
│   │   ├── YesterdayReviewCard.tsx
│   │   ├── WeeklyStats.tsx
│   │   ├── ExerciseFilterTabs.tsx
│   │   ├── ExerciseBentoGrid.tsx
│   │   ├── ExerciseCard.tsx
│   │   ├── StagingListBar.tsx        # 底部训练暂存栏
│   │   ├── TrainingSubmitButton.tsx
│   │   └── SetInputGroup.tsx         # 重量/组数或时长/坡度输入组
│   ├── settings/
│   │   ├── AppInfoCard.tsx
│   │   ├── DeveloperCard.tsx
│   │   ├── ChangelogButton.tsx
│   │   ├── PrivacyPolicyButton.tsx
│   │   └── LogoutButton.tsx
│   └── ui/                           # 仅跨 feature 使用的原子组件
│       ├── Button.tsx
│       ├── IconButton.tsx
│       ├── Card.tsx
│       ├── ProgressBar.tsx
│       ├── NumberInput.tsx           # 带 +/- 步进的数字输入
│       ├── Dialog.tsx                # 基础对话框（非强制弹窗）
│       ├── Toast.tsx
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
│
├── hooks/
│   ├── useAuth.ts                    # JWT 读取、自动刷新、登出
│   ├── useNutritionStaging.ts        # 对 nutrition store 的封装 hook
│   ├── useTrainingStaging.ts         # 对 training store 的封装 hook
│   ├── useDateSwitcher.ts            # 仪表盘日期切换逻辑
│   ├── useCountUp.ts                 # 数字滚动动画
│   └── useMealTypeInference.ts       # 根据当前时间推断餐别
│
├── lib/
│   ├── api-client.ts                 # 封装 fetch，统一附加 Authorization、错误码处理
│   ├── constants.ts                  # 路由、枚举、默认目标值常量
│   ├── nutrition-math.ts             # 热量/三大营养素换算函数
│   ├── bmi-bmr.ts                    # BMI/BMR/TDEE 计算
│   ├── formatters.ts                 # 日期、数字格式化
│   └── validators.ts                 # 手机号、密码、克数校验
│
├── stores/
│   ├── nutritionStagingStore.ts      # Zustand：餐食暂存列表
│   ├── trainingStagingStore.ts       # Zustand：训练暂存列表
│   └── authStore.ts                  # Zustand：JWT 状态（内存，不持久化）
│
├── types/
│   ├── api.ts                        # API 请求/响应类型（与 interface.md 对齐）
│   ├── models.ts                     # 业务实体类型（与 data-schema.md 对齐）
│   └── components.ts                 # 通用组件 props 类型
│
└── middleware.ts                     # Next.js middleware：JWT 校验 + 未登录跳转 /login
```

---

## 3. 页面与路由映射

| 路由 | 页面组件 | 布局 | 类型 | 说明 |
|------|---------|------|------|------|
| `/login` | `app/(auth)/login/page.tsx` | `app/(auth)/layout.tsx` | Client | 手机号+密码+图形验证码登录 |
| `/register` | `app/(auth)/register/page.tsx` | `app/(auth)/layout.tsx` | Client | 注册后立即唤起强制 ProfileModal |
| `/dashboard` | `app/(main)/dashboard/page.tsx` | `app/(main)/layout.tsx` | Server (外壳) | 服务端取聚合数据，子组件混合 SSR/CSR |
| `/nutrition` | `app/(main)/nutrition/page.tsx` | `app/(main)/layout.tsx` | Client | 重度交互（AI 上传、暂存列表、实时计算） |
| `/training` | `app/(main)/training/page.tsx` | `app/(main)/layout.tsx` | Client | 重度交互（Bento 网格、暂存、参数输入） |
| `/settings` | `app/(main)/settings/page.tsx` | `app/(main)/layout.tsx` | Server (外壳) | 服务端取 app-info/changelog/privacy |

---

## 4. Component Inventory

### 4.1 Dashboard（仪表盘）

```typescript
// DateHeader
interface DateHeaderProps {
  date: string;               // YYYY-MM-DD
  greeting: string;           // 后端返回或前端按时间段计算
  nickname?: string;
  onPrevDate: () => void;
  onNextDate: () => void;
  isFuture: boolean;          // 未来日期禁用编辑
}

// NutritionProgressBars
interface NutritionProgressBarsProps {
  protein: { current: number; target: number };
  carbs:   { current: number; target: number };
  fat:     { current: number; target: number };
  onClick: () => void;       // 跳转 /nutrition
}

// BMICard
interface BMICardProps {
  bmi: number | null;
  category: 'underweight' | 'normal' | 'overweight' | 'obese' | null;
}

// BMRCard
interface BMRCardProps {
  bmr: number | null;
}

// CompletionRate
interface CompletionRateProps {
  checklist: { water: boolean; sleep: boolean; exercise: boolean };
}

// HealthChecklist
interface CheckItem {
  id: 'hydration' | 'sleep' | 'exercise';
  name: string;
  completed: boolean;
  target: string;
  current: string;
}
interface HealthChecklistProps {
  items: CheckItem[];
  date: string;
  readOnly: boolean;
  onCheckIn: (id: CheckItem['id'], value?: number) => void; // value 用于水分/睡眠数值
}

// ScoreRingChart（自定义 SVG）
interface ScoreRingChartProps {
  score: number | null;       // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | null;
  size?: number;              // 默认 128
  strokeWidth?: number;       // 默认 8
}

// TrendChart（Recharts 封装）
interface TrendDataset {
  label: string;
  data: (number | null)[];    // 空缺日期用 null（断点）
  color: string;
  isTarget?: boolean;         // 虚线
}
interface TrendChartProps {
  labels: string[];           // MM-DD
  datasets: TrendDataset[];
}

// FloatingPlanButton
interface FloatingPlanButtonProps {
  onClick: () => void;
}

// ProfileModal（强制/更新两用）
interface ProfileModalProps {
  mode: 'forced' | 'update';  // forced 时无关闭按钮、不响应 ESC/遮罩点击
  initialData?: Partial<UserProfileForm>;
  onSubmit: (data: UserProfileForm) => Promise<void>;
  onSuccess?: () => void;
}
interface UserProfileForm {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
  fitnessGoal: 'lose_weight' | 'maintain' | 'gain_muscle';
}
```

### 4.2 Nutrition（饮食与营养）

```typescript
// AIUploadZone
interface AIUploadZoneProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
  disabled?: boolean;         // 限制同时 1 个识别任务
}

// AIResultEditor（单条或多条结果）
interface AIRecognizedFood {
  tempId: string;             // 前端临时 ID
  name: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  calories: number;           // 前端实时计算
  confidence?: number;
}
interface AIResultEditorProps {
  results: AIRecognizedFood[];
  onChange: (results: AIRecognizedFood[]) => void;
  onConfirmSingle: (item: AIRecognizedFood) => void; // 确认进入 staging
  onRemoveSingle: (tempId: string) => void;
  onRetry: () => void;
}

// DailyOverviewCard
interface DailyOverviewCardProps {
  summary: {
    calories: { current: number; target: number };
    protein:  { current: number; target: number };
    carbs:    { current: number; target: number };
    fat:      { current: number; target: number };
  };
}

// FoodCategoryTabs
interface FoodCategoryTabsProps {
  categories: FoodCategory[];
  activeCategoryId: string;
  onChange: (id: string) => void;
}

// FoodSelector（面板内所有行）
interface FoodItem {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}
interface FoodSelectorProps {
  foods: FoodItem[];
  selections: Record<string, number | undefined>; // foodId -> grams
  onChange: (foodId: string, grams: number | undefined) => void;
}

// OilSelector
interface OilOption {
  id: string;
  label: string;
  amountG: number;
  calories: number;
}
interface OilSelectorProps {
  options: OilOption[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

// StagingList（餐食暂存清单）
interface StagingFoodItem {
  id: string;                 // 前端临时 ID
  foodId?: string;            // 系统食物 ID（AI 结果可能无）
  name: string;
  amountG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: 'staple' | 'meat' | 'vegetable' | 'oil' | 'ai';
}
interface StagingListProps {
  items: StagingFoodItem[];
  onRemove: (id: string) => void;
  onUpdateAmount?: (id: string, amountG: number) => void;
  totalCalories: number;
}

// MealConfirmDialog
interface MealConfirmDialogProps {
  open: boolean;
  items: StagingFoodItem[];
  inferredMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onMealTypeChange: (type: MealType) => void;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}
```

### 4.3 Training（每日训练）

```typescript
// TodayGoalCard
interface TodayGoalCardProps {
  targetCount: number;        // 建议训练次数
  completedCount: number;
  suggestedBodyPart?: string;
}

// YesterdayReviewCard
interface YesterdayExerciseSummary {
  name: string;
  setsCompleted: number;
  repsPerSet: string;
  weightNote?: string;
}
interface YesterdayReviewCardProps {
  exercises: YesterdayExerciseSummary[];
  hasWorkout: boolean;
}

// WeeklyStats
interface WeeklyStatsProps {
  workoutCount: number;
  totalDurationMin: number;
  weekOverWeekChange: number | null; // null 时显示 "--"
}

// ExerciseFilterTabs
interface ExerciseFilterTabsProps {
  categories: { id: string; name: string }[];
  activeId: string;
  onChange: (id: string) => void;
}

// ExerciseBentoGrid
interface ExerciseBentoGridProps {
  exercises: Exercise[];
  stagedIds: Set<string>;     // 已加入今日清单的动作 ID
  onToggle: (exercise: Exercise, params: ExerciseParams) => void;
}

// ExerciseCard
interface Exercise {
  id: string;
  name: string;
  category: string;
  isCardio: boolean;
  defaultSets?: number;
  defaultReps?: number;
  defaultDurationMin?: number;
}
type ExerciseParams =
  | { weightKg: number; sets: number; reps?: number }
  | { durationMin: number; incline?: number; resistance?: number; load?: number };
interface ExerciseCardProps {
  exercise: Exercise;
  isStaged: boolean;
  defaultParams: ExerciseParams;
  onToggle: (params: ExerciseParams) => void;
}

// StagingListBar
interface StagingExercise {
  tempId: string;
  exerciseId: string;
  name: string;
  category: string;
  params: ExerciseParams;
}
interface StagingListBarProps {
  items: StagingExercise[];
  onRemove: (tempId: string) => void;
  onClear: () => void;
}

// TrainingSubmitButton
interface TrainingSubmitButtonProps {
  count: number;
  disabled: boolean;
  isSubmitting: boolean;
  onClick: () => void;
}
```

### 4.4 Settings（系统设置）

```typescript
// AppInfoCard
interface AppInfo {
  name: string;
  version: string;
  buildNumber?: string;
  iconUrl?: string;
}
interface AppInfoCardProps {
  info: AppInfo;
}

// DeveloperCard
interface Developer {
  name: string;
  title: string;
  email?: string;
  avatarUrl?: string;
}
interface DeveloperCardProps {
  developers: Developer[];
}

// ChangelogButton（触发弹窗）
interface ChangelogEntry {
  version: string;
  releaseDate: string;
  changes: { type: string; description: string }[];
}
interface ChangelogButtonProps {
  entries: ChangelogEntry[];
}

// PrivacyPolicyButton
interface PrivacyPolicyButtonProps {
  content: string;
  sections?: { heading: string; anchor: string }[];
}

// LogoutButton
interface LogoutButtonProps {
  onLogout: () => Promise<void>;
}
```

### 4.5 Shared（共享组件）

```typescript
// Layout（main 布局）
interface MainLayoutProps {
  children: React.ReactNode;
}

// NavSidebar / TopNav
interface NavItem {
  href: string;
  label: string;
  icon: string;               // Material Symbol name
}
interface TopNavProps {
  items: NavItem[];
  activeHref: string;
}

// Toast
interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

// LoadingSpinner
interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

// ErrorBoundary（类组件）
// 封装为 wrapper，无 props，捕获渲染错误展示降级 UI

// ProtectedRoute（HOC / wrapper）
// 由 middleware 实现，组件层无需重复封装

// CaptchaImage
interface CaptchaImageProps {
  imageBase64: string;
  onRefresh: () => void;
  isLoading: boolean;
}
```

---

## 5. Data Flow

### 5.1 Server Components vs Client Components 策略

| 页面/区域 | 策略 | 理由 |
|-----------|------|------|
| `/dashboard` page.tsx | **Server Component** 外壳 | 首屏聚合数据（营养、指标、评分、趋势）服务端一次性获取，减少瀑布请求 |
| `/nutrition` page.tsx | **Client Component** | AI 上传（multipart）、实时热量计算、暂存列表频繁增删改，必须客户端状态 |
| `/training` page.tsx | **Client Component** | Bento 网格筛选、动作参数输入、暂存清单全为高频交互 |
| `/settings` page.tsx | **Server Component** 外壳 | 应用信息、隐私政策为静态/半静态内容，服务端渲染加速首屏 |
| `ProfileModal` | Client Component（Portal） | 强制弹窗需要浏览器事件拦截（禁用 ESC、遮罩点击） |
| `ScoreRingChart` | Client Component | SVG 动画依赖 `useEffect` + `IntersectionObserver` |
| `TrendChart` | Client Component | Recharts 依赖 `useState/useEffect` 计算容器尺寸 |

API Routes 到页面数据映射：
- `/dashboard` -> `GET /api/dashboard?date=YYYY-MM-DD`
- `/nutrition` -> 初始 `GET /api/nutrition/today` + `GET /api/nutrition/food-categories`；AI 识别走 `POST /api/nutrition/ai-recognize`；提交走 `POST /api/nutrition/meals`
- `/training` -> 初始 `GET /api/training/today` + `GET /api/training/exercises?category=all`；提交走 `POST /api/training/quick-log`（或按接口文档 `/training/today/complete`）
- `/settings` -> `GET /api/settings/app-info`（公开）+ `GET /api/settings/changelog` + `GET /api/settings/privacy-policy`

### 5.2 Staging List 状态管理

两份暂存列表均使用 **Zustand**，不放入 URL，因为：
- 数据生命周期短（确认记录后即清空）
- 数据量大（克数、热量、营养素）不适合序列化到 URL
- 不涉及分享/回退恢复需求

**饮食暂存 Store（nutritionStagingStore.ts）**：
```typescript
interface NutritionStagingState {
  items: StagingFoodItem[];
  oilOption: OilOption | null;
  addItem: (item: StagingFoodItem) => void;
  removeItem: (id: string) => void;
  updateAmount: (id: string, amountG: number) => void;
  setOilOption: (option: OilOption | null) => void;
  clear: () => void;
  totalCalories: () => number;
  totalMacros: () => { proteinG: number; carbsG: number; fatG: number };
}
```

**训练暂存 Store（trainingStagingStore.ts）**：
```typescript
interface TrainingStagingState {
  items: StagingExercise[];
  addExercise: (exercise: StagingExercise) => void;
  removeExercise: (tempId: string) => void;
  updateParams: (tempId: string, params: ExerciseParams) => void;
  clear: () => void;
  isStaged: (exerciseId: string) => boolean;
}
```

封装 `useNutritionStaging` / `useTrainingStaging` hooks，对外暴露派生状态（`totalCalories`、`isStaged`），保持组件层简洁。

### 5.3 JWT Auth Flow in Next.js App Router

```
[浏览器]
  │ 登录/注册成功
  ▼
存储 accessToken 到内存（Zustand authStore）
  │ 同时 httpOnly cookie 存储 refreshToken（API Route Set-Cookie）
  ▼
后续请求：Authorization: Bearer <accessToken>
  │
  ▼
middleware.ts 校验 accessToken（jose 库，Edge Runtime 兼容）
  ├─ 有效 → 继续请求
  └─ 无效/过期 → 重定向 /login
```

**自动刷新机制**：
- `api-client.ts` 拦截 401 响应，静默调用 `POST /api/auth/refresh`（携带 httpOnly refreshToken cookie）
- 刷新成功：更新内存 accessToken，重试原请求
- 刷新失败：清除 authStore，跳转 `/login`

**登出**：
- 调用 `POST /api/auth/logout`，后端将 refreshToken 标记 revoked
- 前端清除 authStore，middleware 后续拦截跳转登录页

---

## 6. Key Implementation Decisions

### 6.1 "Staging List" 购物车模式

饮食和训练页面均存在"先暂存、后统一提交"的购物车行为。核心决策：

1. **纯前端状态**：确认前不调用任何写入 API，避免脏数据。
2. **Zustand 独立 Store**：饮食与训练各一个 Store，不合并，避免互相污染。
3. **派生数据即时计算**：热量、三大营养素总量使用 Store 内 getter 实时计算，组件层直接消费，不额外缓存。
4. **确认即清空**：`POST /api/nutrition/meals` 或 `POST /api/training/quick-log` 成功后，调用 `store.clear()`，并触发全局 Toast + 仪表盘数据重新验证（若用户切换回 dashboard）。
5. **网络断开保护**：提交失败时不清空 staging，按钮恢复可点状态，保留用户选择。

### 6.2 强制个性化计划弹窗（不可关闭）

- **组件复用**：`ProfileModal` 通过 `mode: 'forced' | 'update'` 两用。
- **强制模式行为**：
  - 不渲染关闭按钮（×）
  - `onClose` 回调传 `undefined`，Dialog 组件底层判断无 `onClose` 则不绑定 ESC/遮罩点击
  - 使用 `createPortal` 挂载到 `document.body`，`z-index: 50` 确保最顶层
- **触发时机**：
  - 注册页：`/register` 在注册 API 返回 success 后，立即本地设置 `showForcedProfile = true`，渲染 `<ProfileModal mode="forced" />`
  - 仪表盘：`FloatingPlanButton` 点击触发 `mode="update"`，预填充 `initialData`
- **数据回填**：老用户更新时，`initialData` 从 `GET /api/users/me` 的 `profile` 字段传入

### 6.3 图表实现方案

| 图表 | 实现方式 | 理由 |
|------|---------|------|
| 7 日营养趋势 | **Recharts** `<LineChart>` | 3 条实线（蛋白/碳水/脂肪）+ 3 条虚线（目标），Recharts 原生支持 `strokeDasharray`、`<Tooltip>`、图例点击显隐，代码量远低于手写 SVG |
| 评分环形图 | **自定义 SVG** | 单环动画只需一个 `<circle>` 的 `stroke-dasharray/offset` 过渡，Recharts 引入 `<PieChart>` 反而增加 bundle 体积和重渲染成本 |
| 热量来源饼图 | **Recharts** `<PieChart>` | 点击总热量数字展开的弹窗中使用，Recharts 饼图支持点击交互和 Tooltip |

SVG 环形图动画细节：
- 使用 `IntersectionObserver` 在首次进入视口时触发 CSS transition（`stroke-dashoffset` 从满周长过渡到目标值）
- 动画时长 1s，`ease-out`
- 等级颜色映射：`A=#10B981` 青绿，`B=#3B82F6` 蓝，`C=#F59E0B` 橙，`D=#EF4444` 红

### 6.4 AI 拍照识别（图片上传）

- **文件选择**：前端 `<input type="file" accept="image/jpeg,image/png" />` 限制格式
- **前端预校验**：文件大小 `<= 10MB`，最小分辨率 `>= 300x300`（通过 `URL.createObjectURL` + `Image` 对象读取宽高）
- **上传方式**：`FormData` + `fetch` 调用 `POST /api/nutrition/ai-recognize`
- **状态机**：`idle -> uploading -> recognizing -> success/error`
- **限制并发**：上传中禁用上传区，后续点击提示"请等待当前识别完成"
- **结果处理**：后端返回不含 calories，前端根据 `protein * 4 + carbs * 4 + fat * 9` 实时计算每条结果的热量，展示在 `AIResultEditor` 中供用户修改
- **图片生命周期**：前端不保存 base64，File 对象在 fetch 后释放

### 6.5 Route Guard 实现（App Router）

不采用组件层 HOC，统一使用 **Next.js Middleware**：

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/captcha', '/api/settings/app-info'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  // 或从 cookie 读取，取决于前端的 token 存放策略

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**补充说明**：
- 受保护页面在 Server Component 中通过 `headers()` 获取 token，二次校验，防止 middleware 被绕过（如直接调用 API）
- API Routes 中统一使用一个 `withAuth(handler)` 高阶函数校验 JWT，保证 API 层独立安全
- 未登录用户访问 `/dashboard` 等页面：middleware 302 重定向到 `/login`，无闪屏

---

*文档版本：v1.0*
*日期：2026-04-28*
*关联文档：prd.md、interface.md、data-schema.md、function.md*
