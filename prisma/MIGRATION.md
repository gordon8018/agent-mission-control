# PostgreSQL Schema Migration Guide

This directory contains the enhanced PostgreSQL schema for Mission Control with UUID primary keys, enums, constraints, and full-text search.

## Changes from v0.2.0

### UUID Primary Keys
- All primary keys now use `@default(uuid())` instead of cuid()
- All foreign keys reference UUIDs
- Better for distributed systems and replication

### Enums
- `TaskPriority`: LOW, MEDIUM, HIGH, URGENT
- `TaskStatus`: OPEN, IN_PROGRESS, DONE, BLOCKED
- `EventType`: ONE_TIME, RECURRING
- `RunStatus`: PENDING, RUNNING, SUCCESS, FAILED, CANCELLED

### CHECK Constraints
- `tasks_assignee_check`: Ensures XOR constraint on assignee_user_id and assignee_agent_id
  - Only one can be set at a time
  - Or both can be NULL (unassigned)

### Full-Text Search
- Memories table now has `search_vector` column (tsvector)
- Automatically updated via trigger when title/content changes
- Uses English language for stemming
- GIN index for fast full-text search
- Trigram indexes for partial/fuzzy matching

### Indexes
Composite and single-column indexes for:
- `tasks(column_id, status)` - Filter by column and status
- `tasks(assigned_to_user_id)` - Filter by user assignee
- `tasks(assigned_to_agent_id)` - Filter by agent assignee
- `tasks(due_date)` - Filter by due date
- `activity(createdAt)` - Sort by timestamp
- `runs(event_id, started_at)` - Filter by event and start time
- `events(event_type, start_at)` - Filter by type and start time
- `memories(search_vector)` - Full-text search (GIN)
- `agents(status)` - Filter by agent status
- `task_columns(position)` - Sort columns

### JSONb for Artifacts
- Tasks: `artifacts` - Task artifacts (files, outputs, etc.)
- Agents: `artifacts` - Agent artifacts (logs, outputs, etc.)
- Events: `artifacts` - Event artifacts (recurrence data, etc.)
- Memories: `artifacts` - Memory artifacts (attachments, etc.)
- Runs: `artifacts` - Run artifacts (logs, metrics, etc.)
- Activity: `changes` - Now uses JSONb instead of JSON

## Migration Steps

### 1. Apply the SQL Migration
```bash
cd /Users/gordonyang/.openclaw/workspace-code/mission-control

# Apply the custom SQL migration
psql -h localhost -U hft_user -d hft_trading -f prisma/migrations/20250221_full_text_search_constraints.sql
```

### 2. Push Schema Changes
```bash
npm run db:push
```

### 3. Regenerate Prisma Client
```bash
npm run db:generate
```

### 4. Run Seed Script
```bash
npm run db:seed
```

## Full-Text Search Usage

### Example Query with Prisma
```typescript
// Search memories using tsquery
const results = await prisma.$queryRaw`
  SELECT id, title, content, tags,
         ts_rank(search_vector, to_tsquery('english', ${query})) as rank
  FROM memories
  WHERE search_vector @@ to_tsquery('english', ${query})
  ORDER BY rank DESC
  LIMIT 10
`;
```

### Example with Trigram Matching
```typescript
// Partial/fuzzy search
const results = await prisma.$queryRaw`
  SELECT id, title, content
  FROM memories
  WHERE title % ${query}
     OR content % ${query}
  ORDER BY similarity(title, ${query}) DESC
  LIMIT 10
`;
```

### Example with Combined Search
```typescript
const results = await prisma.$queryRaw`
  SELECT id, title, content, tags,
         ts_rank(search_vector, to_tsquery('english', ${query})) as rank,
         similarity(title, ${query}) as similarity
  FROM memories
  WHERE search_vector @@ to_tsquery('english', ${query})
     OR title % ${query}
  ORDER BY rank DESC, similarity DESC
  LIMIT 10
`;
```

## CHECK Constraint Enforcement

The XOR constraint on task assignees is enforced at the database level:

```sql
-- Valid scenarios:
assigned_to_user_id IS NULL AND assigned_to_agent_id IS NULL    -- Unassigned
assigned_to_user_id IS NOT NULL AND assigned_to_agent_id IS NULL  -- User assigned
assigned_to_user_id IS NULL AND assigned_to_agent_id IS NOT NULL  -- Agent assigned

-- Invalid scenarios (will be rejected):
assigned_to_user_id IS NOT NULL AND assigned_to_agent_id IS NOT NULL  -- Both assigned
```

## Performance Considerations

### GIN Indexes
- Best for full-text search
- Slightly slower INSERT/UPDATE than B-tree
- Faster SELECT for large datasets

### Trigram Indexes
- Good for partial matches and fuzzy search
- Larger index size
- Use judiciously (e.g., only on title)

### Composite Indexes
- Follow the leading column rule: `column_id` first, then `status`
- Works well for queries that filter on both columns
- Less effective if queries filter only on `status`

## Rollback

If you need to rollback to the previous schema:

```bash
# Drop the SQL migration changes
psql -h localhost -U hft_user -d hft_tration_control <<EOF
DROP TRIGGER IF EXISTS memories_search_vector_trigger ON memories;
DROP FUNCTION IF EXISTS memories_update_search_vector();
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_check;
DROP INDEX IF EXISTS idx_tasks_column_status;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_assignee_user;
DROP INDEX IF EXISTS idx_tasks_assignee_agent;
DROP INDEX IF EXISTS idx_activity_created_at;
DROP INDEX IF EXISTS idx_runs_event_started_at;
DROP INDEX IF EXISTS idx_events_type_start_at;
DROP INDEX IF EXISTS idx_memories_search_vector;
DROP INDEX IF EXISTS idx_memories_title_trgm;
DROP INDEX IF EXISTS idx_memories_content_trgm;
DROP INDEX IF EXISTS idx_agents_status;
DROP INDEX IF EXISTS idx_task_columns_position;
DROP EXTENSION IF EXISTS pg_trgm;
EOF

# Then use git to revert schema.prisma and seed.js
git checkout HEAD -- prisma/schema.prisma prisma/seed.js

# Push the reverted schema
npm run db:push
```
