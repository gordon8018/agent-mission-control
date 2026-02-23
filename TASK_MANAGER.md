# Mission Control 任务管理系统

## 概述

Mission Control 任务管理系统可以定期检查和处理待完成的任务，支持：
- 定时检查待完成任务（每 30 分钟）
- 自动执行分配给 agent 的任务
- 提醒用户任务和即将到期的任务
- 跟踪任务状态变更

## 快速开始

### 0. 检查系统状态

在运行任务前，先检查系统状态：

```bash
cd /Users/gordonyang/.openclaw/workspace-code/mission-control
npm run status:check
```

这会检查：
- 开发服务器是否运行
- 数据库连接是否正常
- 关键依赖项是否安装
- 任务脚本是否存在
- 任务统计信息

### 1. 运行任务检查

检查所有待处理的任务：

```bash
cd /Users/gordonyang/.openclaw/workspace-code/mission-control
npm run tasks:check
```

输出示例：
```
🔍 检查 Mission Control 待完成任务...

📋 找到 2 个待处理任务：

🤖 分配给 Agent 的任务 (1):
  1. [HIGH] Set up development environment (OPEN)

👤 分配给用户的任务 (1):
  1. [MEDIUM] Review project requirements → gordon@example.com (OPEN)

✨ 任务检查完成
```

### 2. 运行任务执行器

检查并显示分配给 agent 的任务：

```bash
npm run tasks:execute
```

输出示例：
```
🤖 处理 Agent 任务...

📋 找到 1 个 agent 任务：

🟠 高优先级任务 (1):
  - Set up development environment [code_master]

📊 任务摘要：
  - 紧急: 0
  - 高: 1
  - 中: 0
  - 低: 0

✨ 任务检查完成，共 1 个待处理任务
```

## 自动化

### Cron 定时任务

系统已配置 cron 任务，每 30 分钟自动检查一次任务：

```json
{
  "name": "Mission Control Task Checker",
  "schedule": "every 30 minutes",
  "payload": {
    "kind": "systemEvent",
    "text": "Check Mission Control tasks"
  }
}
```

### Heartbeat 集成

每次 heartbeat 时，会自动运行任务检查脚本。检查规则：

1. **工作时间（08:00-23:00）**：检查所有任务
2. **非工作时间（23:00-08:00）**：只提醒紧急任务（URGENT）
3. **即将到期的任务**：24 小时内到期的任务会特别提醒

## 脚本说明

### task-manager.ts

主要功能：
- 获取所有待处理的任务（OPEN/IN_PROGRESS）
- 按类型分组（agent 任务 vs 用户任务）
- 检查即将到期的任务（24 小时内）
- 按优先级排序

导出函数：
- `getPendingTasks()` - 获取待处理任务
- `updateTaskStatus(taskId, status)` - 更新任务状态
- `markTaskInProgress(taskId)` - 标记任务为进行中
- `markTaskCompleted(taskId)` - 标记任务为完成
- `getTaskDetail(taskId)` - 获取任务详情

### task-executor.ts

主要功能：
- 获取分配给 agent 的任务
- 按优先级分组
- 支持自动执行任务逻辑

导出函数：
- `getAgentTasks()` - 获取 agent 任务
- `updateTask(taskId, status)` - 更新任务
- `processAgentTasks()` - 处理所有 agent 任务
- `executeTask(taskId)` - 执行单个任务

## 任务状态

- **OPEN**: 待处理
- **IN_PROGRESS**: 进行中
- **DONE**: 已完成
- **BLOCKED**: 已阻塞

## 任务优先级

- **URGENT**: 紧急，立即处理
- **HIGH**: 高优先级，尽快处理
- **MEDIUM**: 中优先级，正常处理
- **LOW**: 低优先级，可以延后

## 数据库 Schema

### Task 表

```typescript
{
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToAgentId?: string;
  assignedToUserId?: string;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Agent 表

```typescript
{
  id: string;
  name: string;
  status: string;
  currentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 使用示例

### 在代码中使用

```typescript
import { getPendingTasks, markTaskCompleted } from './scripts/task-manager';

// 获取待处理任务
const tasks = await getPendingTasks();
console.log(`找到 ${tasks.length} 个待处理任务`);

// 完成一个任务
await markTaskCompleted('task-id-123');
```

### 与 OpenClaw 集成

在 heartbeat 或 cron 触发时运行：

```typescript
// 在 OpenClaw 中创建 cron job
{
  "schedule": {"kind": "every", "everyMs": 1800000},
  "payload": {
    "kind": "systemEvent",
    "text": "Check Mission Control tasks"
  }
}
```

## 高级功能

### 自动执行任务

扩展 `task-executor.ts` 中的 `executeTask` 函数来实现自动执行：

```typescript
async function executeTask(taskId: string) {
  await updateTask(taskId, 'IN_PROGRESS');

  // 调用 OpenClaw 的 sessions_spawn
  const result = await spawnAgent({
    task: task.description,
    label: `task:${taskId}`,
  });

  await updateTask(taskId, 'DONE');
}
```

### 任务提醒

当任务即将到期时，可以通过 OpenClaw 的 message 工具发送提醒：

```typescript
import { message } from 'openclaw';

if (hoursLeft <= 24 && hoursLeft > 0) {
  await message({
    action: 'send',
    channel: 'telegram',
    to: 'user-id',
    message: `⏰ 任务 "${task.title}" 将在 ${hoursLeft} 小时后到期`,
  });
}
```

## 注意事项

1. **数据库连接**: 确保数据库连接字符串正确
2. **任务分配**: Agent 任务应该有 `assignedToAgentId`
3. **权限**: 确保脚本有读写数据库的权限
4. **错误处理**: 任务执行失败时，状态会变为 BLOCKED
5. **活动日志**: 所有状态变更都会记录到 activity 表

## 故障排查

### Memory 搜索功能编译错误

**症状**: 编译时显示 `'const' declarations must be initialized`

**错误信息**:
```
Error: 'const' declarations must be initialized
./src/app/memory/actions.ts:170:1
  170 |   `, [query] as any;
      : ^^^^^^^
```

**原因**: `searchMemories` 函数中使用了错误的 `$queryRaw` 语法，混合了 Prisma 模板字符串和 PostgreSQL 参数占位符

**解决方案**: 修复 `src/app/memory/actions.ts` 中的查询语法，使用 `${query}` 而不是 `$1`

### Mission Control 无法访问 (HTTP 500)

**症状**: 访问 http://localhost:3000 返回 500 错误

**原因**: 缺少 autoprefixer 依赖

**解决方案**:
```bash
cd /Users/gordonyang/.openclaw/workspace-code/mission-control
npm install autoprefixer --save-dev
npm run dev
```

**预防**: 运行 `npm run status:check` 定期检查依赖项

### 脚本无法运行

确保 tsx 已安装：
```bash
npm install -D tsx
```

### 数据库连接失败

检查 DATABASE_URL 环境变量：
```bash
export DATABASE_URL="postgresql://hft_user:hft_password@localhost:5432/hft_trading?schema=mission_control"
```

### Cron 任务不触发

检查 cron 状态：
```bash
openclaw cron list
```

## 未来改进

- [ ] 支持任务依赖关系
- [ ] 支持任务标签和搜索
- [ ] 集成更多通知渠道（邮件、短信）
- [ ] 支持任务模板
- [ ] 支持任务工时跟踪
- [ ] 支持任务评论和附件
