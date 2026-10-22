-- CreateTable
CREATE TABLE "Bot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "publicKey" TEXT NOT NULL,
    "secretKeyHash" TEXT,
    "secretKeyHint" TEXT,
    "allowedOrigins" TEXT[],
    "languages" TEXT[],
    "instructions" TEXT NOT NULL DEFAULT '',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_slug_key" ON "Bot"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_publicKey_key" ON "Bot"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_secretKeyHash_key" ON "Bot"("secretKeyHash");
