# Activity Actions Standardization

**Purpose**: Define standardized action names and diff formats for all entity types (agents, tasks, events, runs, memories, users).
**Status**: 📋 In Progress
**Last Updated**: 2026-02-21

## Standardized Actions

### Agent Actions
- `agent.created` - When a new agent is created
- `agent.updated` - When agent details are updated
- `agent.deleted` - When an agent is deleted
- `agent.status_changed` - When agent status changes (idle → busy, etc.)
- `agent.task_assigned` - When a task is assigned to agent
- `agent.task_completed` - When assigned task is completed
- `agent.run_started` - When agent starts a run
- `agent.run_finished` - When agent run finishes (success)
- `agent.run_failed` - When agent run fails

### Task Actions
- `task.created` - When a task is created
- `task.updated` - When task details are updated
- `task.deleted` - When a task is deleted
- `task.moved` - When task is moved to different column/position
- `task.assigned` - When task is assigned to user/agent
- `task.unassigned` - When task is unassigned
- `task.status_changed` - When task status changes
- `task.completed` - When task is marked as done

### Event Actions
- `event.created` - When a new event is created
- `event.updated` - When event details are updated
- `event.deleted` - When an event is deleted
- `event.enabled` - When event is enabled/disabled
- `event.cron_triggered` - When cron job is triggered

### Run Actions
- `run.created` - When a run record is created
- `run.started` - When run starts execution
- `run.finished` - When run completes successfully
- `run.failed` - When run fails
- `run.cancelled` - When run is cancelled
- `run.output` - When run output is updated

### Memory Actions
- `memory.created` - When a memory is created
- `memory.updated` - When memory content/details are updated
- `memory.deleted` - When a memory is deleted
- `memory.auto_created` - When memory is auto-generated from task/run

### User Actions
- `user.created` - When a new user is created
- `user.updated` - When user details are updated
- `user.deleted` - When a user is deleted

---

### Planned PR1 Additions (Workflow Gates + OpenClaw Linking)
- `gate.checked` - When a workflow/task gate is evaluated or marked complete
- `task.blocked` - When a task is blocked due to unmet gates/artifacts
- `agent.openclaw_linked` - When an agent is linked to an OpenClaw agent id
- `agent.openclaw_unlinked` - When an OpenClaw link is removed
- `agent.openclaw_relinked` - When an agent mapping changes from one OpenClaw id to another
- `agent.openclaw_validation_succeeded` - When external OpenClaw validation succeeds
- `agent.openclaw_validation_failed` - When external OpenClaw validation fails

---

## Diff Format Standards

### Minimal Diff (for simple updates)
```json
{
  "message": "Updated agent 'code_master'",
  "diff": {
    "name": { "from": "code_master", "to": "code_master_v2" },
    "role": { "from": "developer", "to": "senior_developer" }
  }
}
```

### Extended Diff (for complex operations)
```json
{
  "message": "Assigned task 'Fix bug' to agent 'code_master'",
  "diff": {
    "taskId": "uuid-123",
    "taskTitle": "Fix bug",
    "agentId": "uuid-456",
    "agentName": "code_master",
    "previousAssignee": {
      "type": "user",
      "id": "uuid-789",
      "name": "gordon"
    },
    "newAssignee": {
      "type": "agent",
      "id": "uuid-456",
      "name": "code_master"
    }
  }
}
```

### Diff with Metadata (for future enhancements)
```json
{
  "message": "Created agent 'code_master'",
  "diff": {
    "name": "code_master",
    "role": "developer",
    "capabilities": ["code", "debug", "review"],
    "status": "idle"
  },
  "meta": {
    "requestId": "req_abc123",
    "userId": "user_456",
    "timestamp": "2026-02-21T10:30:00Z",
    "source": "web_ui"
  }
}
```

---

## Diff Format by Action Type

### Create Actions
```json
{
  "message": "Created [entity] '[name]'",
  "diff": {
    "name": "[name]",
    "role": "[role]", // for agents
    "type": "[type]", // for events
    "priority": "[priority]" // for tasks
  }
}
```

### Update Actions
```json
{
  "message": "Updated [entity] '[name]'",
  "diff": {
    "[field1]": { "from": "[old]", "to": "[new]" },
    "[field2]": { "from": "[old]", "to": "[new]" }
  }
}
```

### Delete Actions
```json
{
  "message": "Deleted [entity] '[name]'",
  "diff": {
    "id": "[id]",
    "name": "[name]",
    "[importantField]": "[value]"
  }
}
```

### Move Actions (for tasks)
```json
{
  "message": "Moved task '[title]' to '[column]'",
  "diff": {
    "fromColumn": "[old-column]",
    "toColumn": "[new-column]",
    "fromPosition": [old-position],
    "toPosition": [new-position],
    "fromStatus": "[old-status]",
    "toStatus": "[new-status]"
  }
}
```

### Assignment Actions
```json
{
  "message": "Assigned [task] '[title]' to [agent] '[name]'",
  "diff": {
    "taskId": "[task-id]",
    "taskTitle": "[task-title]",
    "agentId": "[agent-id]",
    "agentName": "[agent-name]",
    "previousAssignee": {
      "type": "user|agent|null",
      "id": "[id]",
      "name": "[name]"
    }
  }
}
```

### Status Change Actions
```json
{
  "message": "[Entity] status changed from '[old]' to '[new]'",
  "diff": {
    "from": "[old-status]",
    "to": "[new-status]"
  }
}
```

---

## Activity Row Query Examples

### Get Activities by Entity
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND entity_id = '[agent-id]'
ORDER BY created_at DESC
LIMIT 20
```

### Get Recent Activities (Global Feed)
```sql
SELECT a.*,
       u.name as performer_name
FROM activity a
LEFT JOIN users u ON a.performed_by = u.id
ORDER BY a.created_at DESC
LIMIT 50
```

### Get Activities by Action Type
```sql
SELECT * FROM activity
WHERE action = 'agent.task_assigned'
ORDER BY created_at DESC
```

### Get Activities with Diff Search
```sql
SELECT * FROM activity
WHERE entity_type = 'agent'
  AND changes @> '{"action": "agent.task_assigned"}'::jsonb
ORDER BY created_at DESC
```

---

## Best Practices

### Message Format
- [ ] Always include what happened (verb + object)
- [ ] Use entity name when available
- [ ] Keep messages short and clear
- [ ] Examples:
  - "Created agent 'code_master'"
  - "Assigned task 'Fix bug' to agent 'code_master'"
  - "Agent status changed from 'idle' to 'busy'"
  - "Deleted agent 'old_agent'"

### Diff Structure
- [ ] Always use `from` and `to` for value changes
- [ ] Include entity IDs for traceability
- [ ] For assignments, include both old and new assignee
- [ ] For moves, include positions and statuses
- [ ] For status changes, only include status field

### Performance Considerations
- [ ] Keep diffs minimal (only changed fields)
- [ ] Avoid large JSON objects in diffs (store in artifacts if needed)
- [ ] Use indexes on entity_type and entity_id
- [ ] Consider archiving old activities (older than 90 days)

---

## Implementation Examples

### Agent Creation
```typescript
await prisma.activity.create({
  data: {
    entityType: 'agent',
    entityId: agent.id,
    action: 'agent.created',
    performedBy: userId,
    changes: {
      message: `Created agent "${agent.name}"`,
      diff: {
        name: agent.name,
        role: (agent.config as any)?.role,
        capabilities: (agent.config as any)?.capabilities,
      },
    },
  },
});
```

### Task Assignment
```typescript
await prisma.activity.create({
  data: {
    entityType: 'task',
    entityId: taskId,
    action: 'task.assigned',
    performedBy: userId,
    changes: {
      message: `Assigned task "${task.title}" to agent "${agent.name}"`,
      diff: {
        taskId,
        taskTitle: task.title,
        agentId: agent.id,
        agentName: agent.name,
        previousAssignee: task.assignedToUserId || task.assignedToAgentId,
      },
    },
  },
});
```

### Agent Status Change
```typescript
await prisma.activity.create({
  data: {
    entityType: 'agent',
    entityId: agentId,
    action: 'agent.status_changed',
    performedBy: 'system-worker', // or userId
    changes: {
      message: `Agent "${agentName}" status changed from "${oldStatus}" to "${newStatus}"`,
      diff: {
        from: oldStatus,
        to: newStatus,
      },
    },
  },
});
```

---

## Migration Checklist

### For Existing Code
- [ ] Update all activity creation calls to use standardized actions
- [ ] Update all diff structures to follow format standards
- [ ] Ensure all mutations create activity rows
- [ ] Add missing activity logs where needed

### For New Features
- [ ] Always create activity row for new mutations
- [ ] Use standardized action names
- [ ] Follow diff format standards
- [ ] Include request ID in activity.meta

---

## Testing Checklist

### Manual Testing
- [ ] Create agent → Verify `agent.created` activity
- [ ] Update agent → Verify `agent.updated` activity
- [ ] Delete agent → Verify `agent.deleted` activity
- [ ] Assign task to agent → Verify `agent.task_assigned` activity
- [ ] Change agent status → Verify `agent.status_changed` activity
- [ ] Query activity by entity → Verify correct activities returned

### Automated Testing
- [ ] Unit tests for activity creation
- [ ] Integration tests for action standardization
- [ ] E2E tests for activity queries
- [ ] Performance tests for activity inserts

---

## Documentation Updates

### Update README
- [ ] Add activity actions section
- [ ] Document diff format standards
- [ ] Provide query examples

### Update API Docs
- [ ] Document activity response formats
- [ ] Add filtering examples

---

## Notes
- All actions are lowercase with underscore separators
- Diff fields use camelCase
- Message strings are user-friendly (not technical)
- Activity logs provide full audit trail
- Indexes enable efficient querying by entity and action

---

## Future Enhancements
- [ ] Add request correlation ID tracking
- [ ] Implement activity feed pagination
- [ ] Add activity search by diff content
- [ ] Create activity summary endpoints
- [ ] Add activity export functionality
