-- CreateTable
CREATE TABLE "TechnicianExperience" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "manualId" TEXT,
    "manualName" TEXT,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "symptoms" TEXT,
    "cause" TEXT,
    "solution" TEXT,
    "tags" TEXT,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TechnicianExperience_projectId_idx" ON "TechnicianExperience"("projectId");

-- CreateIndex
CREATE INDEX "TechnicianExperience_manualId_idx" ON "TechnicianExperience"("manualId");

-- CreateIndex
CREATE INDEX "TechnicianExperience_createdAt_idx" ON "TechnicianExperience"("createdAt");

-- AddForeignKey
ALTER TABLE "TechnicianExperience" ADD CONSTRAINT "TechnicianExperience_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
