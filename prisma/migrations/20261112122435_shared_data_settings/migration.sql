-- CreateTable
CREATE TABLE "SharedDataSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "app" "App" NOT NULL,
    "contacts" BOOLEAN NOT NULL,
    "clients" BOOLEAN NOT NULL,
    "projects" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedDataSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedDataSetting_organizationId_app_key" ON "SharedDataSetting"("organizationId", "app");

-- AddForeignKey
ALTER TABLE "SharedDataSetting" ADD CONSTRAINT "SharedDataSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
