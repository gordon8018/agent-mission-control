-- Full-Text Search Examples for Mission Control
-- PostgreSQL queries demonstrating the enhanced schema features

-- ========================================
-- Full-Text Search on Memories
-- ========================================

-- Basic full-text search
SELECT id, title, content, tags,
       ts_rank(search_vector, to_tsquery('english', 'task')) as rank
FROM memories
WHERE search_vector @@ to_tsquery('english', 'task')
ORDER BY rank DESC
LIMIT 10;

-- Search with multiple terms
SELECT id, title, content, tags,
       ts_rank(search_vector, to_tsquery('english', 'task & management')) as rank
FROM memories
WHERE search_vector @@ to_tsquery('english', 'task & management')
ORDER BY rank DESC
LIMIT 10;

-- Search with phrase matching
SELECT id, title, content, tags,
       ts_rank(search_vector, phraseto_tsquery('english', 'task management')) as rank
FROM memories
WHERE search_vector @@ phraseto_tsquery('english', 'task management')
ORDER BY rank DESC
LIMIT 10;

-- Search with OR logic
SELECT id, title, content, tags,
       ts_rank(search_vector, to_tsquery('english', 'task | project')) as rank
FROM memories
WHERE search_vector @@ to_tsquery('english', 'task | project')
ORDER BY rank DESC
LIMIT 10;

-- Search with NOT logic
SELECT id, title, content, tags,
       ts_rank(search_vector, to_tsquery('english', 'task & !management')) as rank
FROM memories
WHERE search_vector @@ to_tsquery('english', 'task & !management')
ORDER BY rank DESC
LIMIT 10;

-- ========================================
-- Trigram (Fuzzy/Partial) Search
-- ========================================

-- Partial match on title
SELECT id, title, content,
       similarity(title, 'task') as similarity
FROM memories
WHERE title % 'task'
ORDER BY similarity DESC
LIMIT 10;

-- Partial match on content
SELECT id, title, content,
       similarity(content, 'management') as similarity
FROM memories
WHERE content % 'management'
ORDER BY similarity DESC
LIMIT 10;

-- Fuzzy search (close matches)
SELECT id, title, content,
       similarity(title, 'tsk') as similarity
FROM memories
WHERE similarity(title, 'tsk') > 0.3
ORDER BY similarity DESC
LIMIT 10;

-- ========================================
-- Combined Full-Text + Trigram Search
-- ========================================

-- Best of both worlds
SELECT id, title, content, tags,
       ts_rank(search_vector, to_tsquery('english', 'task')) as rank,
       similarity(title, 'task') as similarity
FROM memories
WHERE search_vector @@ to_tsquery('english', 'task')
   OR title % 'task'
ORDER BY rank DESC, similarity DESC
LIMIT 10;

-- Weighted search (title matches rank higher)
SELECT id, title, content, tags,
       (ts_rank(search_vector, to_tsquery('english', 'task')) * 2.0 +
        similarity(title, 'task')) as combined_score
FROM memories
WHERE search_vector @@ to_tsquery('english', 'task')
   OR title % 'task'
ORDER BY combined_score DESC
LIMIT 10;

-- ========================================
-- Task Queries with New Indexes
-- ========================================

-- Filter by column and status (uses composite index)
SELECT t.*, tc.name as column_name
FROM tasks t
JOIN task_columns tc ON t.column_id = tc.id
WHERE t.column_id = 'uuid-here' AND t.status = 'OPEN'
ORDER BY t.position ASC;

-- Filter by user assignee (uses partial index)
SELECT t.*, u.name as assignee_name
FROM tasks t
JOIN users u ON t.assigned_to_user_id = u.id
WHERE t.assigned_to_user_id = 'user-uuid-here'
ORDER BY t.due_date ASC NULLS LAST;

-- Filter by agent assignee (uses partial index)
SELECT t.*, a.name as assignee_name
FROM tasks t
JOIN agents a ON t.assigned_to_agent_id = a.id
WHERE t.assigned_to_agent_id = 'agent-uuid-here'
ORDER BY t.position ASC;

-- Filter by priority enum
SELECT t.*, tc.name as column_name
FROM tasks t
JOIN task_columns tc ON t.column_id = tc.id
WHERE t.priority = 'HIGH'
ORDER BY t.position ASC;

-- Filter by due date (uses index)
SELECT t.*, tc.name as column_name
FROM tasks t
JOIN task_columns tc ON t.column_id = tc.id
WHERE t.due_date >= NOW()
  AND t.due_date <= NOW() + INTERVAL '7 days'
ORDER BY t.due_date ASC;

-- Overdue tasks
SELECT t.*, tc.name as column_name,
       t.due_date - NOW() as overdue_by
FROM tasks t
JOIN task_columns tc ON t.column_id = tc.id
WHERE t.due_date < NOW()
  AND t.status != 'DONE'
ORDER BY t.due_date ASC;

-- ========================================
-- Activity Log Queries
-- ========================================

-- Recent activity for specific entity
SELECT a.*, u.name as performer_name
FROM activity a
JOIN users u ON a.performed_by = u.id
WHERE a.entity_type = 'task'
  AND a.entity_id = 'task-uuid-here'
ORDER BY a.created_at DESC;

-- Recent activity by user (uses index)
SELECT a.*, u.name as performer_name
FROM activity a
JOIN users u ON a.performed_by = u.id
WHERE a.performed_by = 'user-uuid-here'
ORDER BY a.created_at DESC
LIMIT 20;

-- Activity timeline for tasks
SELECT
  a.*,
  u.name as performer_name,
  t.title as task_title
FROM activity a
JOIN users u ON a.performed_by = u.id
LEFT JOIN tasks t ON a.entity_id = t.id
WHERE a.entity_type = 'task'
ORDER BY a.created_at DESC
LIMIT 50;

-- ========================================
-- Run History Queries
-- ========================================

-- Recent runs for event (uses composite index)
SELECT r.*, e.title as event_title
FROM runs r
JOIN events e ON r.event_id = e.id
WHERE r.event_id = 'event-uuid-here'
ORDER BY r.started_at DESC
LIMIT 10;

-- Failed runs
SELECT r.*, e.title as event_title, a.name as agent_name
FROM runs r
JOIN events e ON r.event_id = e.id
LEFT JOIN agents a ON r.executed_by_agent_id = a.id
WHERE r.status = 'FAILED'
ORDER BY r.started_at DESC
LIMIT 20;

-- Runs by status
SELECT
  r.status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at))) as avg_duration_seconds
FROM runs r
WHERE r.started_at >= NOW() - INTERVAL '30 days'
GROUP BY r.status;

-- ========================================
-- Agent Status Queries
-- ========================================

-- Agents with status (uses index)
SELECT a.id, a.name, a.status,
       COUNT(t.id) as assigned_tasks_count
FROM agents a
LEFT JOIN tasks t ON a.id = t.assigned_to_agent_id
WHERE a.status = 'idle'
GROUP BY a.id, a.name, a.status;

-- Agent performance metrics
SELECT
  a.id, a.name,
  COUNT(r.id) as total_runs,
  COUNT(CASE WHEN r.status = 'SUCCESS' THEN 1 END) as successful_runs,
  COUNT(CASE WHEN r.status = 'FAILED' THEN 1 END) as failed_runs,
  AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at))) FILTER (WHERE r.completed_at IS NOT NULL) as avg_duration_seconds
FROM agents a
LEFT JOIN runs r ON a.id = r.executed_by_agent_id
GROUP BY a.id, a.name;

-- ========================================
-- JSONb Artifact Queries
-- ========================================

-- Search artifacts in tasks
SELECT id, title, artifacts
FROM tasks
WHERE artifacts @> '{"type": "attachment"}'
ORDER BY created_at DESC;

-- Update artifact in task
UPDATE tasks
SET artifacts = jsonb_set(
  COALESCE(artifacts, '{}'::jsonb),
  '{last_viewed}',
  to_jsonb(NOW())
)
WHERE id = 'task-uuid-here';

-- Search by artifact content
SELECT t.id, t.title
FROM tasks t
WHERE t.artifacts->>'file_type' = 'pdf';

-- ========================================
-- XOR Constraint Validation
-- ========================================

-- Valid task assignments
SELECT id, title, assigned_to_user_id, assigned_to_agent_id
FROM tasks
WHERE (assigned_to_user_id IS NOT NULL AND assigned_to_agent_id IS NULL)
   OR (assigned_to_user_id IS NULL AND assigned_to_agent_id IS NOT NULL)
   OR (assigned_to_user_id IS NULL AND assigned_to_agent_id IS NULL);

-- Invalid task assignments (should return empty if constraint works)
SELECT id, title, assigned_to_user_id, assigned_to_agent_id
FROM tasks
WHERE assigned_to_user_id IS NOT NULL AND assigned_to_agent_id IS NOT NULL;

-- ========================================
-- Dashboard Queries
-- ========================================

-- Task statistics by status
SELECT t.status, COUNT(*) as count
FROM tasks t
JOIN task_columns tc ON t.column_id = tc.id
GROUP BY t.status;

-- Task statistics by priority
SELECT t.priority, COUNT(*) as count
FROM tasks t
GROUP BY t.priority;

-- Upcoming events (uses index)
SELECT id, title, event_type, start_at
FROM events
WHERE start_at >= NOW()
  AND start_at <= NOW() + INTERVAL '7 days'
ORDER BY start_at ASC;

-- Recent activity summary
SELECT
  a.entity_type,
  a.action,
  COUNT(*) as count,
  MAX(a.created_at) as last_occurred
FROM activity a
WHERE a.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY a.entity_type, a.action
ORDER BY last_occurred DESC;
