-- CreateTable
CREATE TABLE "AiTechnician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "brands" TEXT,
    "productTypes" TEXT,
    "instructions" TEXT NOT NULL,
    "responseStyle" TEXT NOT NULL DEFAULT 'diagnostic',
    "webEnabled" BOOLEAN NOT NULL DEFAULT true,
    "experienceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTechnicianManual" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "vectorStoreId" TEXT NOT NULL,
    "manualId" TEXT NOT NULL,
    "manualName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTechnicianManual_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "TechnicianExperience" ADD COLUMN "technicianId" TEXT;

-- CreateIndex
CREATE INDEX "AiTechnician_domain_idx" ON "AiTechnician"("domain");

-- CreateIndex
CREATE INDEX "AiTechnician_active_idx" ON "AiTechnician"("active");

-- CreateIndex
CREATE INDEX "AiTechnician_createdAt_idx" ON "AiTechnician"("createdAt");

-- CreateIndex
CREATE INDEX "AiTechnicianManual_projectId_idx" ON "AiTechnicianManual"("projectId");

-- CreateIndex
CREATE INDEX "AiTechnicianManual_manualId_idx" ON "AiTechnicianManual"("manualId");

-- CreateIndex
CREATE UNIQUE INDEX "AiTechnicianManual_technicianId_projectId_manualId_key" ON "AiTechnicianManual"("technicianId", "projectId", "manualId");

-- CreateIndex
CREATE INDEX "TechnicianExperience_technicianId_idx" ON "TechnicianExperience"("technicianId");

-- AddForeignKey
ALTER TABLE "AiTechnician" ADD CONSTRAINT "AiTechnician_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTechnicianManual" ADD CONSTRAINT "AiTechnicianManual_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "AiTechnician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianExperience" ADD CONSTRAINT "TechnicianExperience_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "AiTechnician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
