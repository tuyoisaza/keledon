-- Keep edits staged until a superadmin explicitly publishes a reviewed revision.
ALTER TABLE "ai_prompt_definitions"
  ADD COLUMN "publishedRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "publishedDefinition" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "ai_prompt_revisions"
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishedBy" TEXT;

UPDATE "ai_prompt_definitions" AS definition
SET "publishedRevision" = definition."revision",
    "publishedDefinition" = jsonb_build_object(
      'id', definition."id",
      'name', definition."name",
      'personalityPrompt', definition."personalityPrompt",
      'executionPrompt', definition."executionPrompt",
      'outputSchemaJson', definition."outputSchemaJson",
      'enabled', definition."enabled",
      'purpose', definition."purpose",
      'owningFeature', definition."owningFeature",
      'callsite', definition."callsite",
      'inputSchemaJson', definition."inputSchemaJson",
      'outputDestination', definition."outputDestination",
      'nextHops', definition."nextHops",
      'revision', definition."revision",
      'updatedBy', definition."updatedBy"
    );

UPDATE "ai_prompt_revisions" AS revision
SET "publishedAt" = definition."updatedAt",
    "publishedBy" = revision."actorId",
    "definitionSnapshot" = definition."publishedDefinition"
FROM "ai_prompt_definitions" AS definition
WHERE revision."promptId" = definition."id"
  AND revision."toRevision" = definition."revision";
