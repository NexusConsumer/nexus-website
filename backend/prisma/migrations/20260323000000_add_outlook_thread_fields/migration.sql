-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "outlookConversationId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "outlookLastMessageId" TEXT;
