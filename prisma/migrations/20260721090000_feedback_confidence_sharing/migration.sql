-- Feedback loop, confidence indicator, follow-up suggestions, shareable links
ALTER TABLE "Message" ADD COLUMN "followups" JSONB;
ALTER TABLE "Message" ADD COLUMN "confidence" INTEGER;
ALTER TABLE "Message" ADD COLUMN "feedback" INTEGER;

ALTER TABLE "Conversation" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "Conversation_shareToken_key" ON "Conversation"("shareToken");
