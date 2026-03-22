-- Chat Orchestration + Email Management Migration
-- Adds: WebhookLog, MondayItem, AiSuggestion tables
-- Adds: ChatSession fields (assignedAgentName, modeLockUntil, whatsappGroupId, emailMessageId)
-- Adds: EMAIL value to MessageChannel enum

-- Add EMAIL to MessageChannel enum
ALTER TYPE "MessageChannel" ADD VALUE IF NOT EXISTS 'EMAIL';

-- Add new columns to ChatSession
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "assignedAgentName" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "modeLockUntil" TIMESTAMP(3);
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "whatsappGroupId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "emailMessageId" TEXT;

-- CreateTable: WebhookLog (idempotent webhook processing)
CREATE TABLE IF NOT EXISTS "WebhookLog" (
    "id"          TEXT NOT NULL,
    "externalId"  TEXT NOT NULL,
    "source"      TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookLog_externalId_key" ON "WebhookLog"("externalId");
CREATE INDEX IF NOT EXISTS "WebhookLog_processedAt_idx" ON "WebhookLog"("processedAt");

-- CreateTable: MondayItem (CRM mapping)
CREATE TABLE IF NOT EXISTS "MondayItem" (
    "id"           TEXT NOT NULL,
    "mondayItemId" TEXT NOT NULL,
    "boardId"      TEXT NOT NULL,
    "sessionId"    TEXT,
    "metadata"     JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MondayItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MondayItem_mondayItemId_key" ON "MondayItem"("mondayItemId");
CREATE INDEX IF NOT EXISTS "MondayItem_sessionId_idx" ON "MondayItem"("sessionId");

-- CreateTable: AiSuggestion (background AI suggestions in HUMAN mode)
CREATE TABLE IF NOT EXISTS "AiSuggestion" (
    "id"          TEXT NOT NULL,
    "sessionId"   TEXT NOT NULL,
    "suggestion"  TEXT NOT NULL,
    "sentToAgent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AiSuggestion_sessionId_idx" ON "AiSuggestion"("sessionId");
