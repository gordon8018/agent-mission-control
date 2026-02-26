-- PR3: Definition-of-Done evaluation settings

ALTER TABLE "orchestrator_settings"
  ADD COLUMN IF NOT EXISTS "screenshotRequired" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiredReviews" jsonb NOT NULL DEFAULT '{"codex":true,"gemini":false,"claude":false}'::jsonb;
