# Definition of Done: Team Module

**Status**: 📋 In Progress
**Last Updated**: 2026-02-21

## Overview
Production-ready implementation of AI Team Management with agent CRUD, role-based grouping, real-time office view, task assignment, and comprehensive observability.

## Acceptance Criteria

### 1. Agent CRUD

#### Create Agent
- [ ] Create agent with name, role, capabilities, and config
- [ ] Roles supported: developer, reviewer, tester, deployer, admin, agent
- [ ] Capabilities supported: code, review, debug, test, deploy, monitor, documentation
- [ ] Config stores: role, capabilities, notes, createdAt
- [ ] Default status: 'idle'
- [ ] Creates activity row with action: 'agent.created'
- [ ] Activity includes: message, diff (name, role, capabilities)

#### Update Agent
- [ ] Update agent name, role, capabilities, status, config
- [ ] Status values: 'idle', 'busy', 'error', 'offline'
- [ ] Config can be partially updated (role + capabilities merged)
- [ ] Creates activity row with action: 'agent.updated'
- [ ] Activity includes: diff (all changed fields)

#### Delete Agent
- [ ] Delete agent by ID
- [ ] Creates activity row with action: 'agent.deleted'
- [ ] Activity includes: agent name, role for audit trail

#### Get Agents
- [ ] Return list of all agents
- [ ] Support filters by role and status
- [ ] Include assigned tasks (last 3, where status != 'DONE')
- [ ] Include executed runs (last 5)
- [ ] Include activity log (last 10)
- [ ] Ordered by name ascending

#### Get Agent with Activities
- [ ] Return single agent with full details
- [ ] Include all related entities (tasks, runs, activities)
- [ ] Return 404 if agent not found

---

### 2. Team Screen (Grouped by Role)

#### Role Grouping
- [ ] Group agents by role: developer, reviewer, tester, deployer, admin, agent
- [ ] Each group shows role icon, label, color
- [ ] Groups are collapsible (expand/collapse all)
- [ ] Groups show agent count

#### Role Badge
- [ ] Display role-specific icon
  [ ] Display role label (e.g., "Developers", "Reviewers")
- [ ] Display agent count in role

#### Status Indicators
- [ ] Show "busy" count per role
- [ ] Show "idle" count per role
- [ ] Color-coded badges (busy = blue, idle = green)

#### Expand/Collapse All
- [ ] Button to expand all role groups
- [ ] Button to collapse all role groups
- [ ] Groups maintain individual expand/collapse state

#### Create Agent in Role
- [ ] "Create Agent" button in each role group
- [ ] Opens CreateAgentDialog with pre-selected role
- [ ] Quick-create for common roles

#### Empty State per Role
- [ ] Show "No agents in this role" message when role is empty
- [ ] Show CTA to create first agent in that role
- [ ] Display empty state icon

---

### 3. Office View (Real-time Status Grid)

#### Avatar Grid
- [ ] Grid layout (responsive: 2/3/4 columns)
- [ ] Each card shows agent avatar (large, 80px)
- [ ] Avatar shows current status icon
- [ ] Avatar color-coded by status (green/blue/red/gray)
- [ ] Status icons: idle (💤), busy (🔵), error (❌), offline (⚪)

#### Real-time Polling
- [ ] Poll every 30 seconds
- [ ] Endpoint: `/api/agents/[id]?action=activities&limit=1`
- [ ] Updates latest activity ticker
- [ ] Shows "Latest Activity" badge with pulsing dot
- [ ] Shows activity message: "Created", "Updated", "Task assigned", "Run finished"
- [ ] No polling for empty state or when office is closed

#### Latest Activity Display
- [ ] Per agent shows most recent activity
- [ ] Activity types: create, update, delete, task_assigned, run_finished, run_failed
- [ ] Message mapping: Created/Updated/Task assigned/Run finished/Run failed
- [ ] Activity shows timestamp (e.g., "2 minutes ago")

#### Click to View Details
- [ ] Clicking agent card opens detail modal
- [ ] Shows agent full info, current task, recent activities
- [ ] Detail modal includes "Assign Task" button
- [ ] Can assign tasks from modal

#### Footer Info
- [ ] Shows "Status updates every 30 seconds"
- [ ] Shows "Click an agent for details"
- [ ] Auto-closes on modal open

---

### 4. Task Assignment

#### Quick Assign to Agent
- [ ] Available as dropdown on Tasks page
- [ ] Shows "Assign to Agent" button with Bot icon
- [ ] Shows available agent count (e.g., "5 available")
- [ ] Clicking opens dropdown with all idle/busy agents

#### Agent Dropdown
- [ ] Shows all available agents
- [ ] Agents grouped by status (idle/busy)
- [ ] Each agent shows:
  - Name
  - Role (developer, reviewer, etc.)
  - Status badge (idle/busy)
  - Avatar with status color
- [ ] Clicking agent selects it
- [ ] "Assign" button confirms assignment

#### Full Assign Dialog
- [ ] Accessible from Tasks page
- [ ] Shows task title (read-only)
- [ ] Search agents by name or role
- [ ] Filter by status (idle/busy)
- [ ] Shows all agents in grid
- [ ] Each agent shows:
  - Avatar (large, 56px)
  - Name and role
  - Current status (idle/busy/error/offline)
  - Capability tags (code, review, debug, test, deploy)
  - "Selected" state with blue border

#### Assign Action
- [ ] Assigns task to selected agent
- [ ] Sets task.assignedToAgentId
- [ ] Sets task.assignedToUserId to null (clear user assignment - XOR constraint)
- [ ] Sets agent.status to 'busy'
- [ ] Creates activity for task: action: 'task.assigned', diff: {taskId, taskTitle, agentId, agentName, previousAssignee}
- [ ] Creates activity for agent: action: 'agent.task_assigned', diff: {taskId, taskTitle}
- [ ] Updates Team page to show new assignment

#### Quick Assign
- [ ] Same as full assign but from dropdown
- [ ] One-click assign to first available agent
- [ ] Auto-selects first idle agent
- [ ] If no idle agents, shows first busy agent

#### Assign Task from Agent Modal
- [ ] Agent detail modal shows current task (if any)
- [ ] Modal shows "Assign Task" button
- [ ] Opens dialog to select from existing unassigned tasks (TODO - future)
- [ ] Or quick assign from task page

---

### 5. Recent Tasks & Runs (Per Agent)

#### Agent Card Recent Tasks
- [ ] Shows "Current Task" section if agent has assigned tasks
- [ ] Shows last 3 tasks where status != 'DONE'
- [ ] Each task shows:
  - Title (line-clamp-1)
  - Status (text: "in progress", "blocked")
  - Created date
- [ ] Click to open task detail (TODO - future)

#### Agent Card Recent Runs
- [ ] Shows "Recent Runs" section if agent has executed runs
- [ ] Shows last 5 runs ordered by startedAt DESC
- [ ] Each run shows:
  - Status icon (check, alert, spinner)
  - Status text (success, failed, running)
  - Started time (e.g., "2024-01-15 10:30 AM")
  - Completed time with duration (e.g., "Completed 5s ago")
  - Status color: success (green), failed (red), running (blue)

---

### 6. Error & Empty States

#### No Agents (Team Page Empty State)
- [ ] Shows when no agents exist
- [ ] Displays empty state icon (large Bot icon)
- [ ] Message: "No agents found"
- [ ] Subtext: "Click 'Create Agent' to add your first AI team member"
- [ ] CTA button to open CreateAgentDialog
- [ ] Shows role-specific CTAs if possible (TODO - future)

#### No Agents (Office View Empty State)
- [ ] Shows when office view has no agents
- [ ] Message: "No agents available"
- [ ] Subtext: "Create agents first to see office status"

#### No Available Agents (Assign Dropdown)
- [ ] Shows when all agents are offline or no agents exist
- [ ] Message: "No available agents"
- [ ] Subtext: "Create an agent first or check agent status"

#### Agent Offline (Assignment)
- [ ] Shows warning when trying to assign to offline agent
- [ ] Server rejects assignment if agent.status === 'offline'
- [ ] Returns error message: "Cannot assign task to offline agent"
- [ ] UI shows error toast

#### API Error States
- [ ] 401 Unauthorized: "Please sign in to assign tasks"
- [ ] 403 Forbidden: "You don't have permission to assign tasks"
- [ ] 404 Agent Not Found: "Agent not found"
- [ ] 409 Conflict: "Task is already assigned"
- [ ] 500 Server Error: "Failed to assign task. Please try again."

---

### 7. Security & Permissions

#### Authentication Required
- [ ] All create/update/delete operations require authenticated user
- [ ] Server Actions validate performedBy exists (or system-worker)
- [ ] Unauthenticated requests return 401 Unauthorized

#### Authorization
- [ ] Admin role required for create/update/delete agents
- [ ] Regular users can assign tasks
- [ ] Users can view agents
- [ ] Server-side role check on all mutations

#### Permission Errors
- [ ] 403 Forbidden when non-admin tries to create/update/delete agent
- [ ] Error message: "You don't have permission to manage agents"
- [ ] 401 Unauthorized when not signed in
- [ ] Error message: "Please sign in to access this feature"

---

### 8. Performance Requirements

#### Bounded Queries
- [ ] Recent tasks per agent: LIMIT 3
- [ ] Recent runs per agent: LIMIT 5
- [ ] Activities per agent: LIMIT 10
- [ ] Activity feed on Team page: LIMIT 50 (with pagination)
- [ ] Office polling: LIMIT 1 activity per agent

#### Efficient Indexes
- [ ] INDEX on agents(status)
- [ ] INDEX on agents(role via config path)
- [ ] INDEX on tasks(column_id, status)
- [ ] INDEX on tasks(assignee_agent_id)
- [ ] INDEX on activity(entity_type, entity_id)
- [ ] INDEX on activity(performed_by)
- [ ] INDEX on activity(created_at)

#### Office Polling Optimization
- [ ] Poll interval: 30 seconds
- [ ] Only when office view is open (stop when closed)
- [ ] Returns minimal data (only latest 1 activity)
- [ ] Uses ETag/Last-Modified header for caching (TODO - Phase 5)

#### Query Complexity
- [ ] Team page: O(1) query for agents (JOIN tasks, runs, activities)
- [ ] Agent detail: O(1) query with included relations
- [ ] Office polling: O(N) queries where N = number of agents
- [ ] N+1 pattern avoided (no nested loops, single query with includes)

#### Response Sizes
- [ ] Agent list: ~5KB per agent (with relations)
- [ ] Office poll: ~1KB per agent (minimal activity)
- [ ] Total agents < 100: expected < 500KB per poll

---

### 9. Activity Log Requirements

#### Activity Row Structure
- [ ] id: UUID
- [ ] entity_type: 'agent' | 'task' | 'run'
- [ ] entity_id: UUID of the affected entity
- [ ] action: Standardized action string (see docs/team/ACTIVITY_ACTIONS.md)
- [ ] changes: JSON object containing:
  - [ ] message: Human-readable description
  - [ ] diff: Detailed change information
  - [ ] diff structure varies by action

#### Agent Activity Actions
- [ ] `agent.created`: When agent is created
  - [ ] `agent.updated`: When agent is updated
  - [ ] `agent.deleted`: When agent is deleted
  - [ ] `agent.status_changed`: When agent status changes (idle -> busy, etc.)
- [ ] `agent.task_assigned`: When task is assigned to agent
- [ ] `agent.task_completed`: When assigned task is completed

#### Activity Diff Format
```json
{
  "message": "Created agent 'code_master'",
  "diff": {
    "name": "code_master",
    "role": "developer",
    "capabilities": ["code", "debug", "review"]
  }
}
```

#### Assignment Activity Diff
```json
{
  "message": "Assigned task 'Fix bug' to agent 'code_master'",
  "diff": {
    "taskId": "uuid-123",
    "taskTitle": "Fix bug",
    "agentId": "uuid-456",
    "agentName": "code_master",
    "previousAssignee": null
  }
}
```

#### Activity Correlation
- [ ] Each activity has unique ID
- [ ] Multiple activities can reference same entity
- [ ] Activities ordered by created_at DESC
- [ ] Activities can be filtered by entity_type and entity_id

#### Activity Display
- [ ] Team page shows recent activities (last 10 per agent)
- [ ] Agent detail modal shows activity history
- [ ] Office ticker shows latest activity message
- [ ] Activities show timestamp (e.g., "5 minutes ago")

---

### 10. Concurrency & Idempotency

#### Assignment Idempotency
- [ ] Assigning same task to same agent twice is idempotent
- [ ] First assignment: task assigned, agent set to busy
- [ ] Second assignment: no-op (task already assigned to that agent)
- [ ] Server returns success on both calls

#### Concurrency Safety
- [ ] Using database transactions for assignment
- [ ] Lock task and agent rows (SELECT ... FOR UPDATE)
- [ ] Check current assignment before updating
- [ ] Prevents race conditions (two users assign task at same time)

#### Transaction Isolation Level
- [ ] READ COMMITTED isolation level
- [ ] Serializable or Repeatable Read for transactions
- [ ] Prevents lost updates and anomalies

#### Lock Timeout
- [ ] Lock timeout: 5 seconds (configurable)
- [ ] Returns error if lock cannot be acquired
- [ ] User gets error message: "Could not acquire lock. Please try again."

---

### 11. UI/UX Requirements

#### Responsive Design
- [ ] Team view: Single column on mobile, 2 columns on tablet, 3 columns on desktop
- [ ] Office view: Grid adapts to screen size (2/3/4 columns)
- [ ] Cards maintain minimum width on mobile

#### Loading States
- [ ] Skeleton loaders for agent cards (shimmer effect)
- [ ] Loading indicators for assign operations
- [ ] Spinner for office polling (dots animation)

#### Error States
- [ ] Toast notifications for all errors
- [ ] Error messages are user-friendly
- [ ] Retry button for failed operations
- [ ] Validation errors shown inline

#### Empty States
- [ ] Empty states for all lists (agents, tasks, activities)
- [ ] Call-to-action (CTA) to create first item
- - [ ] Friendly messages explaining what to do

#### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Focus states are visible
- [ ] ARIA labels for screen readers
- [ ] Color contrast meets WCAG AA standards

#### Animations
- [ ] Smooth transitions for expand/collapse
- [ ] Hover effects on agent cards
- [ ] Status badge color transitions
- [ ] Pulse animation for latest activity

---

## Technical Implementation

### Stack
- Frontend: Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS
- Backend: Next.js Server Actions, Prisma ORM, PostgreSQL 16
- State Management: React useState + Server Actions
- Styling: Tailwind CSS + class-variance-authority

### File Structure
```
src/
├── app/
│   ├── team/
│   │   ├── actions.ts (Server Actions)
│   │   └── page.tsx (Team Page)
│   └── api/
│       ├── agents/
│       │   ├── route.ts (GET list, POST create)
│       │   └── [id]/route.ts (GET detail, POST update/delete/assign)
└── components/
    └── team/
        ├── agent-card.tsx
        ├── agent-role-group.tsx
        ├── agent-office-grid.tsx
        ├── create-agent-dialog.tsx
        ├── assign-task-dialog.tsx
        └── quick-assign-to-agent.tsx
```

### Database Schema
```prisma
model Agent {
  id              String   @id @default(uuid())
  name            String   @unique
  status          String   @default("idle")
  config          Json?    // { role, capabilities, notes, ... }
  artifacts       Json?    // { metadata, ... }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  assignedTasks  Task[]
  executedRuns   Run[]
  taskMemories  Memory[]  @relation("MemoriesForTask")
}

model Task {
  // ...
  assignedToAgentId String?
  assignedToUserId  String?
  // ...
}

model Run {
  // ...
  executedByAgentId String?
  // ...
}

model Memory {
  // ...
  taskSourceRefId String?
  runSourceRefId  String?
  // ...
}

model Activity {
  id          String   @id @default(uuid())
  entityType  String
  entityId    String
  action      String
  changes     Json?
  performedBy String
  createdAt DateTime @default(now())
}
```

### Server Actions
- `createAgent(data)` - Create agent with activity
- `updateAgent(id, data, performedBy)` - Update agent with activity
- `deleteAgent(id, performedBy)` - Delete agent with activity
- `getAgents(filters?)` - Get agents with filters and includes
- `getAgentWithActivities(id)` - Get agent details
- `getAgentActivities(id, limit)` - Get agent activity history
- `assignTaskToAgent(taskId, agentId, performedBy)` - Assign task (transactional)
- `quickAssignTask(taskId, agentId, performedBy)` - Quick assign wrapper
- `getAgentsGroupedByRole()` - Group agents by role
- `getAgentOfficeStatus()` - Get office grid data

### API Routes
- `GET /api/agents` - List agents (query params: role, status)
- `POST /api/agents` - Create agent (body: {action, performedBy, ...data})
- `GET /api/agents/[id]` - Get agent detail
- `POST /api/agents/[id]` - Update/Delete/GetActivities/Assign

### React Components
- `AgentCard` - Individual agent card with tasks/runs
- `AgentRoleGroup` - Collapsible role group
- `AgentOfficeGrid` - Real-time office view
- `CreateAgentDialog` - Form to create agent
- `AssignTaskDialog` - Full assign dialog
- `QuickAssignToAgent` - Dropdown for quick assign

### Pages
- `/team` - Team management page with grouped agents
- Office modal - Real-time agent status grid

---

## How to Verify Locally

### Setup
1. Run database migrations: `npm run db:push`
2. Generate Prisma Client: `npm run db:generate`
3. Seed agents: `npm run db:seed-agents`
4. Start dev server: `npm run dev`

### Manual Testing Steps

#### Test 1: Create Agent
1. Navigate to `/team`
2. Click "Create Agent" button
3. Fill form:
   - Name: "test_agent"
   - Role: "Developer"
   - Capabilities: "Code", "Debug"
4. Click "Create Agent"
5. **Expected**: Agent appears in developer group
6. **Verify**: Check database `agents` table
7. **Verify**: Check `activity` table for `agent.created` row

#### Test 2: Agent CRUD
1. Find "test_agent" card
2. Click edit icon (...)
3. Update name to "updated_agent"
4. Click "Save"
5. **Expected**: Agent name updates, activity logged
6. **Verify**: Activity row `agent.updated` exists

#### Test 3: Role Grouping
1. Create multiple agents with different roles
2. **Expected**: Agents appear in role groups
3. **Verify**: Count badges correct
4. **Verify**: Status badges correct

#### Test 4: Office View Polling
1. Navigate to `/team`
2. Click "Office" button
3. Wait 30 seconds
4. Create/update agent in another tab
5. **Expected**: Office view updates automatically
6. **Verify**: Latest activity ticker updates

#### Test 5: Task Assignment
1. Navigate to `/tasks`
2. Click "Assign to Agent" on a task
3. Select an agent from dropdown
4. **Expected**: Task assigned to agent
5. **Verify**: `tasks` table `assigned_to_agent_id` updated
6. **Verify**: `agents` table `status` = 'busy'
7. **Verify**: `activity` table has `agent.task_assigned` and `task.assigned` rows

#### Test 6: Recent Tasks/Runs
1. Create agent
2. Assign 3 tasks to agent
3. Mark 2 tasks as done
4. Execute 2 runs as agent
5. **Expected**: Agent card shows correct recent tasks/runs
6. **Verify**: Only last 3 non-done tasks shown
7. **Verify**: Only last 5 runs shown

#### Test 7: Empty States
1. Delete all agents
2. **Expected**: Team page shows empty state
3. **Expected**: Office view shows empty state
4. **Verify**: CTAs display correctly

#### Test 8: Activity Logging
1. Check `activity` table
2. **Expected**: All agent operations logged
3. **Expected**: All task assignments logged
4. **Verify**: Actions are standardized
5. **Verify**: Diff structure is consistent

#### Test 9: Concurrency
1. Open two browser tabs
2. Try to assign same task to same agent in both tabs
3. **Expected**: First assign succeeds
4. **Expected**: Second assign either fails or is idempotent
5. **Verify**: Database state is consistent

---

## Implementation Status

### Phase 0 - Definition of Done ✅
- [x] Created comprehensive definition document
- [x] All acceptance criteria documented
- [x] Technical implementation details documented
- [x] Manual testing steps documented

### Remaining Phases
- [ ] Phase 1 - Data consistency & DB constraints
- [ ] Phase 2 - Security & permissions
- [ ] Phase 3 - Observability & activity standardization
- [ ] Phase 4 - Automated tests
- [ ] Phase 5 - Performance & UX hardening

---

## Notes
- All files have been created in previous iteration
- Focus on quality, correctness, and verifiability
- No scope changes to Team module
- Improvements only (better quality, more production-ready)
