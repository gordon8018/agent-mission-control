# Team Module - Manual Acceptance Test Plan

**Purpose**: Step-by-step manual testing guide for the Team module to verify all production-ready criteria.

**Status**: 📋 Ready for Testing
**Last Updated**: 2026-02-21

---

## Test Environment Setup

### Prerequisites
1. ✅ Database is running (PostgreSQL)
2. ✅ Schema is up to date (`npm run db:push`)
3. ✅ Seed data is loaded (`npm run db:seed-agents`)
4. ✅ Dev server is running (`npm run dev`)
5. ✅ Access to:
   - http://localhost:3000/team
   - http://localhost:3000/tasks
   - http://localhost:3000/api/agents

### Tools Needed
- Web browser (Chrome, Firefox, or Safari)
- Browser DevTools (for API inspection)
- pgAdmin or Prisma Studio (for database inspection)
- Terminal (for running npm commands)

---

## Phase 1: Agent CRUD Tests

### Test 1.1: Create Agent
**Objective**: Verify agents can be created with correct configuration.

**Steps**:
1. Navigate to http://localhost:3000/team
2. Click "Create Agent" button in the top right
3. Fill in the form:
   - Name: "test_agent_1"
   - Role: Select "Developer"
   - Capabilities: Select "Code" and "Debug"
   - Config Notes: "Test agent for manual testing"
4. Click "Create Agent"

**Expected Outcomes**:
- ✅ Agent appears in "Developer" role group
- ✅ Status badge shows "idle"
- ✅ Avatar displays developer icon
- ✅ Toast notification shows "Agent created successfully"
- ✅ Stats header updates (Total: [N], Idle: [N], Busy: [M])

**Database Verification**:
```sql
SELECT id, name, status, config
FROM agents
WHERE name = 'test_agent_1';
```
Expected result:
- Row exists with status = 'idle'
- config.role = 'developer'
- config.capabilities = ['code', 'debug']
- createdAt is recent (within last minute)

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND action = 'agent.created'
ORDER BY created_at DESC
LIMIT 1;
```
Expected result:
- Row exists with message = "Created agent 'test_agent_1'"
- changes.diff.name = 'test_agent_1'
- changes.diff.role = 'developer'

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 1.2: Create Agent with Different Role
**Objective**: Verify role grouping works for all roles.

**Steps**:
1. Click "Create Agent" button
2. Fill in the form:
   - Name: "review_bot_1"
   - Role: Select "Reviewer"
   - Capabilities: Select "Review" and "Code"
3. Click "Create Agent"

**Expected Outcomes**:
- ✅ Agent appears in "Reviewer" role group
- ✅ Role badge shows purple color
- ✅ Capabilities display review and code icons
- ✅ Group shows correct count (Reviewers: [N])

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 1.3: Update Agent Name
**Objective**: Verify agent name can be updated.

**Steps**:
1. Find "test_agent_1" in Developer group
2. Click edit icon (three dots) on agent card
3. In the detail modal, update name to "test_agent_updated"
4. Click "Save Changes"

**Expected Outcomes**:
- ✅ Agent name updates to "test_agent_updated"
- ✅ Toast notification shows "Agent updated successfully"
- ✅ Agent card shows new name
- ✅ Role group still displays correctly

**Database Verification**:
```sql
SELECT id, name, updated_at
FROM agents
WHERE id = '[test-agent-id]';
```
Expected result:
- name = 'test_agent_updated'
- updated_at > created_at

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND entity_id = '[test-agent-id]'
  AND action = 'agent.updated'
ORDER BY created_at DESC
LIMIT 1;
```
Expected result:
- Row exists with action = 'agent.updated'
- changes.diff.name = { from: 'test_agent_1', to: 'test_agent_updated' }

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 1.4: Update Agent Status
**Objective**: Verify agent status can be changed.

**Steps**:
1. Click edit icon on "test_agent_updated"
2. In the detail modal, find "Status" dropdown
3. Change status from "idle" to "busy"
4. Click "Save Changes"

**Expected Outcomes**:
- ✅ Agent status badge updates to "busy"
- ✅ Avatar color changes to blue
- ✅ Status text shows "Busy"
- ✅ Stats header updates (Busy: [N+1])

**Database Verification**:
```sql
SELECT id, name, status
FROM agents
WHERE id = '[test-agent-id]';
```
Expected result:
- status = 'busy'

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND entity_id = '[test-agent-id]'
  AND action = 'agent.status_changed'
  ORDER BY created_at DESC
LIMIT 1;
```
Expected result:
- Row exists with action = 'agent.status_changed'
- changes.diff.status = { from: 'idle', to: 'busy' }

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 1.5: Delete Agent
**Objective**: Verify agents can be deleted with proper activity logging.

**Steps**:
1. Click edit icon on "test_agent_updated"
2. Click "Delete Agent" button in the modal
3. Confirm deletion in the browser dialog

**Expected Outcomes**:
- ✅ Agent is removed from the UI
- ✅ Toast notification shows "Agent deleted successfully"
- ✅ Stats header updates (Total: [N-1])
- ✅ Agent disappears from role group
- ✅ Recent activities no longer reference deleted agent

**Database Verification**:
```sql
SELECT * FROM agents
WHERE id = '[test-agent-id]';
```
Expected result:
- No rows found (agent is deleted)

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND entity_id = '[test-agent-id]'
  AND action = 'agent.deleted'
ORDER BY created_at DESC
LIMIT 1;
```
Expected result:
- Row exists with action = 'agent.deleted'
- changes.diff.name = 'test_agent_updated'
- changes.diff.role = 'developer'

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 1.6: Invalid Agent Creation
**Objective**: Verify validation works for invalid inputs.

**Steps**:
1. Click "Create Agent" button
2. Try to submit form without name
3. Try to submit form without selecting role
4. Try to submit form without selecting capabilities

**Expected Outcomes**:
- ✅ Submit button is disabled when form is invalid
- ✅ Validation errors show (Name is required, Role is required, etc.)
- ✅ Error messages are user-friendly
- ✅ No database records created

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 2: Task Assignment Tests

### Test 2.1: Quick Assign from Tasks Page
**Objective**: Verify tasks can be quickly assigned to agents.

**Steps**:
1. Navigate to http://localhost:3000/tasks
2. Click "Assign to Agent" button on a task
3. Verify dropdown opens with available agents
4. Select an agent from dropdown
5. Verify task is assigned

**Expected Outcomes**:
- ✅ Dropdown shows available agents (idle/busy)
- ✅ Selected agent shows blue border
- ✅ Click assigns task to agent
- ✅ Task shows agent avatar in Tasks page
- ✅ Toast notification shows "Task assigned successfully"

**Database Verification**:
```sql
SELECT id, title, assigned_to_agent_id, assigned_to_user_id
FROM tasks
WHERE id = '[task-id]';
```
Expected result:
- assigned_to_agent_id = '[agent-id]'
- assigned_to_user_id = NULL (XOR constraint)

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'task'
  AND entity_id = '[task-id]'
  AND action = 'update'
ORDER BY created_at DESC
LIMIT 1;
```
Expected result:
- Row exists with action = 'update'
- changes.diff contains taskId and agentId

**Agent Status Verification**:
```sql
SELECT id, name, status
FROM agents
WHERE id = '[agent-id]';
```
Expected result:
- status = 'busy'

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 2.2: Assign from Office View
**Objective**: Verify tasks can be assigned from Office view.

**Steps**:
1. Click "Office" button in Team page
2. Click on an agent card
3. In agent detail modal, click "Assign Task" button
4. Select a task from the list (TODO - needs task selection dialog)
5. Verify task is assigned

**Expected Outcomes**:
- ✅ Task assignment dialog opens
- ✅ Tasks are listed (TODO - implement)
- ✅ Agent status updates to 'busy'
- ✅ Agent shows current task

**Test Result**: ⏭ SKIPPED (Task selection dialog not yet implemented)

---

### Test 2.3: Re-assign Task
**Objective**: Verify task can be reassigned to different agent.

**Steps**:
1. Assign task to Agent A
2. Re-assign same task to Agent B
3. Verify both agents' statuses

**Expected Outcomes**:
- ✅ Agent A status returns to 'idle'
- ✅ Agent B status becomes 'busy'
- ✅ Task shows Agent B's avatar
- ✅ Activity log created for reassignment

**Database Verification**:
```sql
SELECT id, assigned_to_agent_id, assigned_to_user_id
FROM tasks
WHERE id = '[task-id]';
```
Expected result:
- assigned_to_agent_id = '[agent-b-id]'

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'task'
  AND entity_id = '[task-id]'
  AND action = 'update'
ORDER BY created_at DESC;
```
Expected result:
- Multiple 'update' actions logged

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 2.4: Assign to Offline Agent
**Objective**: Verify offline agents cannot be assigned tasks.

**Steps**:
1. Create agent (test_agent_offline)
2. In agent detail modal, change status to "offline"
3. Try to assign a task to this agent

**Expected Outcomes**:
- ✅ Assignment is rejected by server
- ✅ Error message shows "Cannot assign task to offline agent"
- ✅ Toast notification shows error
- ✅ Agent status remains 'offline'
- ✅ No activity log for failed assignment (or error activity logged)

**Database Verification**:
```sql
SELECT id, name, status
FROM agents
WHERE id = '[offline-agent-id]';
```
Expected result:
- status = 'offline'

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND entity_id = '[offline-agent-id]'
  AND action = 'update'
ORDER BY created_at DESC;
```
Expected result:
- No new 'agent.updated' activity (status change may be logged)

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 2.5: Assign to Busy Agent
**Objective**: Verify busy agents can be assigned tasks (with confirmation).

**Steps**:
1. Assign task to Agent A (status = idle)
2. Immediately assign same task to Agent B (status = busy)
3. Verify assignment succeeds

**Expected Outcomes**:
- ✅ Assignment succeeds
- ✅ Agent B shows as busy (was already busy)
- ✅ Agent shows 2 assigned tasks
- ✅ Activity logs created for both assignments

**Database Verification**:
```sql
SELECT id, name, status
FROM agents
WHERE id = '[agent-b-id]';
```
Expected result:
- status = 'busy'

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 3: Team Screen Grouping Tests

### Test 3.1: Role Grouping
**Objective**: Verify agents are correctly grouped by role.

**Steps**:
1. Navigate to http://localhost:3000/team
2. Verify agent role groups are visible
3. Expand each group and verify agents

**Expected Outcomes**:
- ✅ "Developers" group exists with developer icon
- ✅ "Reviewers" group exists with reviewer icon
- ✅ "Testers" group exists with tester icon
- ✅ "Deployers" group exists with deployer icon
- ✅ "Admins" group exists with admin icon (if any)
- ✅ "Agents" group exists for agents without specific role
- ✅ Each group shows correct agents
- ✅ Group counts are correct

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 3.2: Status Counts
**Objective**: Verify status counts per role group.

**Steps**:
1. For each role group, note the counts
2. Verify "idle" count matches idle agents
3. Verify "busy" count matches busy agents

**Expected Outcomes**:
- ✅ Status badges show correct numbers
- ✅ "Idle: N" badge matches idle agents
- ✅ "Busy: M" badge matches busy agents
- ✅ Badge color coding (green for idle, blue for busy)

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 3.3: Expand/Collapse All
**Objective**: Verify expand/collapse functionality works.

**Steps**:
1. Verify all groups are expanded by default
2. Click "Collapse All" button (if available)
3. Verify all groups collapse
4. Click "Expand All" button (if available)
5. Verify all groups expand
6. Test individual group expand/collapse

**Expected Outcomes**:
- ✅ "Expand All" button collapses all groups
- ✅ Individual groups maintain their state
- ✅ UI is responsive to expand/collapse actions

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 3.4: Empty Role States
**Objective**: Verify empty role states display correctly.

**Steps**:
1. Create all agents in one role (e.g., Developers)
2. Check other roles (Reviewers, Testers, etc.)
3. Verify empty state display

**Expected Outcomes**:
- ✅ Empty roles show "No agents in this role" message
- ✅ Empty roles show icon
- ✅ Empty roles show CTA to create agent
- ✅ Groups maintain correct layout

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 3.5: Search in Team View
**Objective**: Verify search filters agents correctly.

**Steps**:
1. Type in search box: "test"
2. Verify only agents with "test" in name or role are shown
3. Clear search
4. Verify all agents are shown again

**Expected Outcomes**:
- ✅ Non-matching agents are hidden
- ✅ Matching agents remain visible
- ✅ Search is case-insensitive
- ✅ Search filters by both name and role

**Database Verification**:
Query: Count agents before and after search

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 4: Office View Tests

### Test 4.1: Avatar Grid Display
**Objective**: Verify agent avatars display correctly in office grid.

**Steps**:
1. Click "Office" button in Team page
2. Verify grid layout (2/3/4 columns responsive)
3. Verify each card shows agent avatar
4. Verify avatar colors match status

**Expected Outcomes**:
- ✅ Grid layout is responsive
- ✅ Avatars are large (80px)
- ✅ Idle agents show green avatars
- ✅ Busy agents show blue avatars
- ✅ Error agents show red avatars
- ✅ Offline agents show gray avatars

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 4.2: Real-time Status Polling
**Objective**: Verify office view updates in real-time.

**Steps**:
1. Open Team page
2. Open browser DevTools
3. Click "Office" button
4. Change agent status in a different tab (or using Prisma Studio)
5. Wait 30 seconds
6. Verify office view updates

**Expected Outcomes**:
- ✅ Status updates within 30-35 seconds
- ✅ Avatar color changes (e.g., green → blue)
- ✅ Latest activity ticker updates
- ✅ Badge shows new activity type

**Database Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
ORDER BY created_at DESC
LIMIT 1;
```
Expected result:
- New activity row appears after 30s poll

**API Request Verification**:
```bash
# Monitor Network tab in DevTools
# Look for: GET /api/agents/[id]?action=activities&limit=1
```
Expected result:
- Request appears every 30 seconds
- Request returns latest 1 activity

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 4.3: Latest Activity Ticker
**Objective**: Verify latest activity ticker shows correct info.

**Steps**:
1. Create an agent
2. Update the agent status
3. Check office view
4. Verify activity ticker

**Expected Outcomes**:
- ✅ Latest activity shows for each agent
- ✅ Activity message is human-readable
- ✅ Activity badge pulses with blue dot
- ✅ Activity shows timestamp (e.g., "2 minutes ago")

**Activity Types**:
- "Created" - Agent creation
- "Updated" - Agent update
- "Task assigned" - Task assigned to agent

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 4.4: Click Agent Card
**Objective**: Verify clicking agent card opens detail modal.

**Steps**:
1. In office view, click on an agent card
2. Verify detail modal opens

**Expected Outcomes**:
- ✅ Detail modal opens with agent info
- ✅ Modal shows agent configuration
- ✅ Modal shows current task (if any)
- ✅ Modal shows recent activities
- ✅ Modal shows "Edit Agent" and "Delete Agent" buttons

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 4.5: Close Office Modal
**Objective**: Verify office modal can be closed.

**Steps**:
1. Open office modal
2. Click X button in modal header
3. Verify modal closes
4. Verify office button in Team page is still available

**Expected Outcomes**:
- ✅ Modal closes immediately
- ✅ Office overlay disappears
- ✅ Polling stops (or continues in background)
- ✅ No console errors

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 5: Recent Tasks & Runs Tests

### Test 5.1: Agent Recent Tasks Display
**Objective**: Verify agent cards show recent tasks.

**Steps**:
1. Assign tasks to an agent
2. Check agent card in Team view
3. Verify "Current Task" section

**Expected Outcomes**:
- ✅ "Current Task" section appears below status
- ✅ Shows last 3 non-done tasks
- ✅ Each task shows title and status
- ✅ Tasks are ordered by createdAt DESC

**Database Verification**:
```sql
SELECT t.id, t.title, t.status, t.created_at
FROM tasks t
WHERE t.assigned_to_agent_id = '[agent-id]'
  AND t.status != 'DONE'
ORDER BY t.created_at DESC
LIMIT 3;
```
Expected result:
- Returns 3 tasks matching UI

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 5.2: Recent Tasks Click
**Objective**: Verify clicking recent task opens task detail.

**Steps**:
1. Click on a recent task in agent card
2. Verify navigation

**Expected Outcomes**:
- ✅ Navigates to task detail (TODO - implement)
- ✅ Or opens task detail modal (TODO - implement)

**Test Result**: ⏭ SKIPPED (Task detail not yet implemented)

---

### Test 5.3: Agent Recent Runs Display
**Objective**: Verify agent cards show recent runs.

**Steps**:
1. Assign a task to an agent
2. Mark task as done (trigger auto-run)
3. Wait for run to complete
4. Check agent card in Team view

**Expected Outcomes**:
- ✅ "Recent Runs" section appears
- ✅ Shows last 5 runs ordered by started_at DESC
- ✅ Each run shows:
  - Status icon (check for success, alert for failed)
  - Status text (success, failed)
  - Started time
  - Completed time + duration

**Database Verification**:
```sql
SELECT r.id, r.status, r.started_at, r.completed_at
FROM runs r
WHERE r.executed_by_agent_id = '[agent-id]'
ORDER BY r.started_at DESC
LIMIT 5;
```
Expected result:
- Returns 5 runs matching UI

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 6: Empty State Tests

### Test 6.1: No Agents - Team View
**Objective**: Verify empty state when no agents exist.

**Steps**:
1. Delete all agents
2. Refresh Team page

**Expected Outcomes**:
- ✅ Empty state icon (large Bot icon)
- ✅ Message: "No agents found"
- ✅ Subtext: "Click 'Create Agent' to add your first AI team member"
- ✅ CTA button: "Create Your First Agent"
- ✅ No role groups visible

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 6.2: No Agents - Office View
**Objective**: Verify empty state in office view.

**Steps**:
1. Delete all agents
2. Click "Office" button

**Expected Outcomes**:
- ✅ Empty state message: "No agents available"
- ✅ Subtext: "Create agents first to see office status"
- ✅ Shows empty state icon

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 6.3: No Available Agents - Assign Dropdown
**Objective**: Verify assign dropdown when all agents are busy/offline.

**Steps**:
1. Make all agents busy or offline
2. Open Tasks page
3. Click "Assign to Agent" button

**Expected Outcomes**:
- ✅ Dropdown shows "No available agents"
- ✅ No agents are clickable
- ✅ Subtext: "Create an agent first or check agent status"
- ✅ Assign button is disabled

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 7: Security & Permissions Tests

### Test 7.1: Unauthenticated Agent Creation
**Objective**: Verify unauthenticated users cannot create agents.

**Steps**:
1. Sign out of the application
2. Try to create agent via API (Postman/curl)
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "performedBy": "test",
    "name": "unauth_agent",
    "role": "developer"
  }'
```

**Expected Outcomes**:
- ✅ Returns 401 Unauthorized
- ✅ Error message: "Please sign in to access this feature"
- ✅ No agent created in database
- ✅ No activity log created

**Database Verification**:
```sql
SELECT * FROM agents
WHERE name = 'unauth_agent';
```
Expected result:
- No rows found

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 7.2: Regular User Delete Agent
**Objective**: Verify regular users cannot delete agents (if admin-only).

**Steps**:
1. Sign in as regular user
2. Try to delete agent via API
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "action": "delete",
    "performedBy": "user-id",
    "id": "[agent-id]"
  }'
```

**Expected Outcomes**:
- ✅ Returns 403 Forbidden
- ✅ Error message: "You don't have permission to manage agents"
- ✅ Agent not deleted from database
- ✅ Activity log not created

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 7.3: SQL Injection (Prevention)
**Objective**: Verify SQL injection is prevented in agent queries.

**Steps**:
1. Try to inject SQL in search query:
```bash
curl "http://localhost:3000/api/agents?search=test'; DROP TABLE agents; --"
```

**Expected Outcomes**:
- ✅ No SQL is executed
- ✅ Query returns empty results or treats string literally
- ✅ Database is intact
- ✅ Prisma ORM sanitizes inputs

**Database Verification**:
```sql
SELECT * FROM agents;
```
Expected result:
- agents table still exists

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 8: Performance Tests

### Test 8.1: Team Page Query Complexity
**Objective**: Verify Team page query complexity is acceptable.

**Steps**:
1. Navigate to http://localhost:3000/team
2. Open Network tab in DevTools
3. Check the main /api/agents request

**Expected Outcomes**:
- ✅ Single query fetches all agents
- ✅ Query includes tasks (last 3 non-done)
- ✅ Query includes runs (last 5)
- ✅ Query includes activities (last 10 per agent)
- ✅ Response size < 10KB for < 50 agents

**Query Complexity**:
- Level: O(1) for main query
- JOINs: tasks, runs, activities
- N+1 pattern: Avoided (single query, no nested loops)

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 8.2: Office Polling Efficiency
**Objective**: Verify office polling is efficient.

**Steps**:
1. Open Team page
2. Click "Office" button
3. Monitor Network tab in DevTools
4. Wait for 30 seconds

**Expected Outcomes**:
- ✅ Only one request per agent
- ✅ Request URL: /api/agents/[id]?action=activities&limit=1
- ✅ Response size < 1KB per agent
- ✅ Total size for 6 agents < 6KB

**Polling Behavior**:
- Interval: 30 seconds
- Only when office view is open
- Returns minimal data (latest 1 activity)

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 8.3: Concurrent Assignments
**Objective**: Verify concurrent assignments don't cause inconsistency.

**Steps**:
1. Open two browser tabs
2. In both tabs, try to assign same task to different agents
3. Verify database state

**Expected Outcomes**:
- ✅ Only one agent gets the task
- ✅ No double-assignment
- ✅ Both requests return success (idempotent)
- ✅ Task.assigned_to_agent_id is consistent

**Database Verification**:
```sql
SELECT id, assigned_to_agent_id, assigned_to_user_id
FROM tasks
WHERE id = '[task-id]';
```
Expected result:
- assigned_to_agent_id is a single value (not NULL)

**Activity Log Verification**:
```sql
SELECT * FROM activity
WHERE entity_type = 'task'
  AND entity_id = '[task-id]'
  AND action = 'update'
ORDER BY created_at DESC;
```
Expected result:
- Multiple activity rows (one per successful assignment)
- Last activity reflects final state

**Transaction Locking**:
- Uses SELECT ... FOR UPDATE SKIP LOCKED
- Prevents race conditions
- Timeout: 5 seconds

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 9: Activity Log Tests

### Test 9.1: Activity Diff Consistency
**Objective**: Verify activity diffs are consistent and well-structured.

**Steps**:
1. Create an agent
2. Update agent multiple times
3. Check activity logs

**Expected Outcomes**:
- ✅ All agent operations create activity rows
- ✅ Diff structures follow standard format
- ✅ 'from' and 'to' values for field changes
- ✅ Only changed fields are included in diff

**Activity Actions**:
- agent.created: diff includes { name, role, capabilities }
- agent.updated: diff includes { name, role, status, capabilities }
- agent.deleted: diff includes { name, role }
- agent.status_changed: diff includes { from: 'idle', to: 'busy' }

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 9.2: Activity Query Performance
**Objective**: Verify activity queries are efficient.

**Steps**:
1. Check agent detail page
2. Monitor Network tab for activity query
3. Check Team page for activities

**Expected Outcomes**:
- ✅ Activity queries use indexes
- ✅ Activity queries are bounded (LIMIT 10/50)
- ✅ Activity queries are ordered by created_at DESC
- ✅ Response sizes are reasonable

**Indexes Used**:
- INDEX on activity(entity_type, entity_id)
- INDEX on activity(formed_by)
- INDEX on activity(created_at)

**Bounded Queries**:
- Agent activities: LIMIT 10
- Team page activities: LIMIT 50
- Global activities: (future implementation)

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 9.3: Activity Feed Display
**Objective**: Verify activity feed displays correctly.

**Steps**:
1. Check agent detail modal
2. Check Team page (if implemented)
3. Verify activities are ordered chronologically

**Expected Outcomes**:
- ✅ Activities show newest first
- ✅ Timestamps are human-readable (e.g., "5 minutes ago")
- ✅ Activity icons are displayed
- ✅ Activity messages are clear

**Activity Types**:
- Created: User-created entities
- Updated: User-modified entities
- Deleted: User-deleted entities
- Assigned: Task assignments
- Status changed: Status modifications

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 10: UI/UX Tests

### Test 10.1: Responsive Design
**Objective**: Verify Team page is responsive.

**Steps**:
1. Open Team page on desktop (1920x1080)
2. Resize browser window to tablet size (768x1024)
3. Resize browser window to mobile size (375x667)

**Expected Outcomes**:
- ✅ Desktop: Multiple role groups side-by-side (3 columns)
- ✅ Tablet: Role groups in 2 columns
- ✅ Mobile: Single column view
- ✅ Office grid adapts to screen size
- ✅ Agent cards maintain minimum width on mobile

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 10.2: Loading States
**Objective**: Verify loading states are handled gracefully.

**Steps**:
1. Refresh Team page
2. Check loading indicator
3. Create agent
4. Check loading state during creation

**Expected Outcomes**:
- ✅ "Loading agents..." indicator shows initially
- ✅ Skeleton loaders not implemented (but acceptable)
- ✅ Spinner on "Create Agent" button during submission
- ✅ Button text changes to "Creating..."
- ✅ Button is disabled during creation

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 10.3: Error States
**Objective**: Verify error states display user-friendly messages.

**Steps**:
1. Try to create agent with invalid data
2. Try to delete agent while it's busy
3. Try to assign task to offline agent

**Expected Outcomes**:
- ✅ Toast notifications for all errors
- ✅ Error messages are clear and actionable
- ✅ Form validation errors show inline
- ✅ No console errors in production

**Error Types**:
- Validation: "Agent name is required", "Please select a role"
- Permission: "You don't have permission to manage agents"
- Assignment: "Cannot assign task to offline agent"
- API: "Failed to create agent", "Failed to update agent"

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 10.4: Empty States
**Objective**: Verify empty states display correctly.

**Steps**:
1. Delete all agents
2. Refresh Team page
3. Check empty state display

**Expected Outcomes**:
- ✅ Empty state icon (Bot)
- ✅ Empty state message: "No agents found"
- ✅ CTA button: "Create Your First Agent"
- ✅ Subtext explains what to do
- ✅ CTA opens CreateAgentDialog

**Empty State Scenarios**:
- Team page: No agents
- Role group: No agents in role
- Office view: No agents
- Assign dropdown: No available agents

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Phase 11: Accessibility Tests

### Test 11.1: Keyboard Navigation
**Objective**: Verify all interactive elements are keyboard accessible.

**Steps**:
1. Use Tab to navigate to "Create Agent" button
2. Press Enter to submit form
3. Use Tab to navigate between form fields
4. Use Escape to close modals

**Expected Outcomes**:
- ✅ All buttons are reachable via Tab
- ✅ Form fields have visible focus states
- ✅ Enter submits focused form
- ✅ Escape closes open modals
- ✅ Focus trap works in modals

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 11.2: ARIA Labels
**Objective**: Verify ARIA labels for screen readers.

**Steps**:
1. Open DevTools and inspect DOM
2. Check ARIA labels on:
   - Create Agent button
   - Role selection buttons
   - Capability checkboxes
   - Submit button

**Expected Outcomes**:
- ✅ Buttons have aria-label
- ✅ Form inputs have labels
- ✅ Status badges have aria-label
- ✅ Icons have aria-hidden (decorative)

**Test Result**: ⬜ PASS / ❌ FAIL

---

### Test 11.3: Color Contrast
**Objective**: Verify color contrast meets WCAG AA standards.

**Steps**:
1. Use color contrast checker tool
2. Verify all text and background combinations
3. Check status badges
4. Check role group colors

**Expected Outcomes**:
- ✅ All text has contrast ratio >= 4.5:1
- ✅ Status badges meet contrast requirements
- ✅ Error messages are red with white text
- ✅ Success messages are green with white text

**Contrast Requirements**:
- Normal text: Black on white (21:1)
- Status badges:
  - Green (idle): White on green (#166534) - 5.2:1
  - Blue (busy): White on blue (#2563EB) - 4.5:1
  - Red (error): White on red (#DC2626) - 5.2:1
  - Gray (offline): Dark gray on light gray (#374151 on #F3F4F6) - 5.6:1

**Test Result**: ⬜ PASS / ❌ FAIL

---

## Test Results Summary

### Automated Tests (Future)
- [ ] Unit tests (Vitest/Jest)
- [ ] E2E tests (Playwright)

### Manual Tests (Current)
- Phase 1: Agent CRUD - ⬜ PASS / ❌ FAIL
- Phase 2: Task Assignment - ⬜ PASS / ❌ FAIL
- Phase 3: Team Screen - ⬜ PASS / ❌ FAIL
- Phase 4: Office View - ⬜ PASS / ❌ FAIL
- Phase 5: Recent Tasks/Runs - ⬜ PASS / ❌ FAIL
- Phase 6: Empty States - ⬜ PASS / ❌ FAIL
- Phase 7: Security - ⬜ PASS / ❌ FAIL
- Phase 8: Performance - ⬜ PASS / ❌ FAIL
- Phase 9: Activity Logging - ⬜ PASS / ❌ FAIL
- Phase 10: UI/UX - ⬜ PASS / ❌ FAIL
- Phase 11: Accessibility - ⬜ PASS / ❌ FAIL

### Total Tests
- Total Tests: 61
- Passed: 0
- Failed: 0
- Pending: 61

---

## How to Run Tests

### Manual Testing
1. Run through each test step
2. Mark each test as PASS or FAIL
3. Note any issues or bugs
4. Collect database evidence (queries in pgAdmin)
5. Document any deviations from expected outcomes

### Database Inspection
```bash
# Open Prisma Studio
npm run db:studio

# Or use pgAdmin/psql
psql -h localhost -U hft_user -d hft_trading
```

### API Testing
```bash
# Use curl
curl http://localhost:3000/api/agents

# Or use Postman
# Import collection from docs/
```

---

## Notes
- All tests should be run sequentially
- Document any test failures with details
- Take screenshots of failures
- Check browser console for errors
- Check Network tab for failed requests
- Verify database state after each test phase

## Next Steps
After completing all manual tests:
1. Update docs/team/DEFINITION_OF_DONE.md with test results
2. Implement any fixes for failed tests
3. Add automated tests (Phase 4)
4. Implement CI/CD pipelines (Phase 4)
