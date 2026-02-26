-- PR3: OpenClaw agent link mapping (many Mission Control agents -> one OpenClaw agent)

DO $$ BEGIN
    CREATE TYPE "OpenClawLinkStatus" AS ENUM ('UNLINKED', 'LINKED', 'INVALID', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "openclawAgentId" TEXT,
  ADD COLUMN IF NOT EXISTS "openclawLinkStatus" "OpenClawLinkStatus" NOT NULL DEFAULT 'UNLINKED';

CREATE INDEX IF NOT EXISTS "agents_openclawAgentId_idx" ON "agents"("openclawAgentId");
