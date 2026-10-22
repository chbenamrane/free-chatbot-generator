-- AlterTable
ALTER TABLE "Bot" ADD COLUMN     "collect" JSONB NOT NULL DEFAULT '{}';


-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT,
    "visitorHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_botId_createdAt_idx" ON "Lead"("botId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_botId_conversationId_key" ON "Lead"("botId", "conversationId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
