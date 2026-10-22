-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "appearance" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "provider" TEXT,
    "model" TEXT,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "unanswered" BOOLEAN NOT NULL DEFAULT false,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "feedback" INTEGER NOT NULL DEFAULT 0,
    "visitorHash" TEXT,
    "origin" TEXT,
    "latencyMs" INTEGER,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatCache" (
    "botId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatCache_pkey" PRIMARY KEY ("botId","key")
);

-- CreateTable
CREATE TABLE "RateHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatLog_botId_createdAt_idx" ON "ChatLog"("botId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatLog_botId_unanswered_handled_idx" ON "ChatLog"("botId", "unanswered", "handled");

-- CreateIndex
CREATE INDEX "ChatCache_createdAt_idx" ON "ChatCache"("createdAt");

-- CreateIndex
CREATE INDEX "RateHit_key_createdAt_idx" ON "RateHit"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatLog" ADD CONSTRAINT "ChatLog_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
