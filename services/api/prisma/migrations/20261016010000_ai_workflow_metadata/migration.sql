ALTER TABLE "ai_prompt_definitions"
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "owningFeature" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "callsite" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "inputSchemaJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "outputDestination" TEXT NOT NULL DEFAULT 'product',
  ADD COLUMN "nextHops" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "ai_prompt_revisions" ADD COLUMN "definitionSnapshot" JSONB;

UPDATE "ai_prompt_definitions" SET
  "purpose" = CASE "id"
    WHEN 'brain-chat' THEN 'Respond to a user request in the KELEDON Brain.'
    WHEN 'browser-planner' THEN 'Produce bounded browser interaction steps for an authorized local workflow.'
    WHEN 'voice-reply' THEN 'Produce a concise spoken response for a call session.'
    WHEN 'decision-engine' THEN 'Select the next safe response or UI action for a call workflow.'
    ELSE "purpose" END,
  "owningFeature" = "id",
  "callsite" = CASE "id"
    WHEN 'brain-chat' THEN 'POST /api/brain/chat'
    WHEN 'browser-planner' THEN 'POST /api/planner/execute'
    WHEN 'voice-reply' THEN 'POST /api/brain/chat (voiceMode)'
    WHEN 'decision-engine' THEN 'DecisionEngineService.evaluate'
    ELSE "callsite" END,
  "inputSchemaJson" = '{"type":"object","additionalProperties":false,"required":["context"],"properties":{"context":{"type":"string","maxLength":250000,"source":"authenticated product request","sensitivity":"user-content"}}}'::jsonb,
  "outputDestination" = CASE "id"
    WHEN 'brain-chat' THEN 'Brain response UI'
    WHEN 'browser-planner' THEN 'Browser Commands service; requires user approval before execution'
    WHEN 'voice-reply' THEN 'Call session audio response'
    WHEN 'decision-engine' THEN 'Call orchestration state machine'
    ELSE "outputDestination" END
WHERE "id" IN ('brain-chat','browser-planner','voice-reply','decision-engine');
