# Mission Control（OpenClaw 任务管理中控）

一个面向 OpenClaw 协作场景的任务管理系统：提供任务看板、日历调度、记忆库、Agent 团队管理和运行审计。

## 1. 系统定位

- 为 OpenClaw 提供可视化任务中控（人类任务 + Agent 任务）
- 支持周期性事件（cron）与后台 worker 执行
- 自动沉淀 Memory（任务完成、Run 结束）
- 用 Activity 记录关键操作，方便追踪和回放

## 2. 核心功能

- `Tasks`：Kanban 看板、拖拽排序、优先级/状态、用户与 Agent 双分配
- `Calendar`：一次性事件 + 周期事件（cronExpr），并可查看运行记录
- `Memory`：可搜索知识库，支持自动生成总结
- `Team`：Agent 增删改查、角色视图、Office 实时状态、快速分配任务
- `Dashboard`：任务/事件统计与最近活动

## 3. 技术栈

- 前端：Next.js 15（App Router）、React 19、TypeScript、Tailwind CSS
- 后端：Next.js Route Handlers + Server Actions
- 数据层：Prisma + PostgreSQL
- 后台任务：`scripts/worker.ts`（轮询事件并触发 run）

## 4. 数据模型（摘要）

主要表（见 `prisma/schema.prisma`）：

- `users`：系统用户
- `agents`：Agent 信息、状态、配置、当前任务关联
- `task_columns` + `tasks`：看板列和任务
- `events` + `runs`：调度事件和执行记录
- `memories`：知识沉淀（含全文检索向量）
- `activity`：操作审计日志

关键枚举：

- `TaskPriority`：`LOW | MEDIUM | HIGH | URGENT`
- `TaskStatus`：`OPEN | IN_PROGRESS | DONE | BLOCKED`
- `EventType`：`ONE_TIME | RECURRING`
- `RunStatus`：`PENDING | RUNNING | SUCCESS | FAILED | CANCELLED`
- `MemorySource`：`MANUAL | TASK_DONE | RUN_FINISHED`

## 5. 目录结构

```text
mission-control/
├── src/
│   ├── app/                    # 页面、API、server actions
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── memory/
│   │   ├── team/
│   │   └── api/
│   ├── components/             # 各模块 UI 组件
│   └── lib/prisma.ts           # Prisma 单例
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed*.js                # 初始化数据脚本
├── scripts/
│   ├── worker.ts               # 事件调度 worker
│   ├── task-manager.ts         # 任务巡检脚本
│   ├── task-executor.ts        # Agent 任务执行器（可扩展）
│   └── status-check.ts         # 环境/服务状态检查
├── TASK_MANAGER.md             # OpenClaw 任务巡检说明
└── ecosystem.config.js         # PM2 本地运行配置
```

## 6. 快速启动

### 6.1 环境要求

- Node.js 18+
- PostgreSQL
- npm

### 6.2 安装与初始化

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
```

### 6.3 启动服务

```bash
# Web
npm run dev

# Worker（另开终端）
npm run worker
```

可选：

```bash
npm run db:studio
npm run lint
```

## 7. OpenClaw 集成建议

建议把以下脚本接入 heartbeat 或 cron：

```bash
npm run status:check
npm run tasks:check
npm run tasks:execute
```

推荐节奏：

- 每 30 分钟：`tasks:check`
- 工作时段（如 08:00-23:00）触发 `tasks:execute`
- 发布或重启后执行一次 `status:check`

详细操作可见 `TASK_MANAGER.md`。

## 8. API 入口（示例）

- `GET/POST /api/agents`
- `GET/POST /api/agents/[id]`
- `GET/POST /api/events`
- `GET /api/tasks/columns`
- `GET /api/tasks/users`
- `GET /api/tasks/agents`
- `GET/POST /api/memories`
- `POST /api/memories/search`
- `GET /api/dashboard`

## 9. 当前实现注意点

- 部分脚本（如 `task-manager.ts`、`task-executor.ts`、`status-check.ts`）内含硬编码数据库连接；部署前建议统一改为读取 `DATABASE_URL`。
- 当前页面中存在 `user-id-placeholder`，接入鉴权后应替换为真实用户 ID。
- `worker.ts` 的 cron 解析为简化实现，复杂表达式建议接入专业 cron parser。

## 10. 变更记录

历史版本见 `CHANGELOG.md`。
