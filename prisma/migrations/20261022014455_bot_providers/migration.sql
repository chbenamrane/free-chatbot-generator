-- CreateTable
CREATE TABLE "BotProvider" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "keyEnc" TEXT,
    "baseUrl" TEXT,
    "pausedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotProvider_botId_sortOrder_idx" ON "BotProvider"("botId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BotProvider_botId_provider_key" ON "BotProvider"("botId", "provider");

-- AddForeignKey
ALTER TABLE "BotProvider" ADD CONSTRAINT "BotProvider_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
