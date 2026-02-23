-- Migration: Add full-text search, constraints, and indexes
-- This migration adds features that Prisma cannot express directly

-- Enable pg_trgm extension for trigram matching (better partial matches)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Add tsvector column to memories table for full-text search
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
) STORED;

-- 2. Create trigger function to update search_vector when title/content changes
CREATE OR REPLACE FUNCTION memories_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Add trigger to automatically update search_vector
DROP TRIGGER IF EXISTS memories_search_vector_trigger ON memories;
CREATE TRIGGER memories_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, content ON memories
FOR EACH ROW
EXECUTE FUNCTION memories_update_search_vector();

-- 4. Add CHECK constraint: assignee_user_id XOR assignee_agent_id
-- Only one can be set at a time, or both can be NULL
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_assignee_check;

ALTER TABLE tasks
ADD CONSTRAINT tasks_assignee_check
CHECK (
  (assignedToUserId IS NULL AND assignedToAgentId IS NULL) OR
  (assignedToUserId IS NULL AND assignedToAgentId IS NOT NULL) OR
  (assignedToUserId IS NOT NULL AND assignedToAgentId IS NULL)
);

-- 5. Create composite indexes for better query performance
-- Tasks: filter by column and status
CREATE INDEX IF NOT EXISTS idx_tasks_column_status ON tasks(column_id, status);

-- Tasks: filter by due date
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Tasks: filter by assignee
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_user ON tasks(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_agent ON tasks(assigned_to_agent_id) WHERE assigned_to_agent_id IS NOT NULL;

-- Activity: sort by timestamp
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);

-- Runs: filter by event and start time
CREATE INDEX IF NOT EXISTS idx_runs_event_started_at ON runs(event_id, started_at);

-- Events: filter by type and start time
CREATE INDEX IF NOT EXISTS idx_events_type_start_at ON events(event_type, start_at);

-- 6. Create GIN index for full-text search (already in schema, but ensure it's there)
DROP INDEX IF EXISTS idx_memories_search_vector;
CREATE INDEX idx_memories_search_vector ON memories USING GIN(search_vector);

-- 7. Create trigram index for partial matching (fuzzy search)
CREATE INDEX IF NOT EXISTS idx_memories_title_trgm ON memories USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_memories_content_trgm ON memories USING GIN(to_tsvector('english', content));

-- 8. Add index for agent status filtering
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 9. Add index for task column ordering
CREATE INDEX IF NOT EXISTS idx_task_columns_position ON task_columns(position);
