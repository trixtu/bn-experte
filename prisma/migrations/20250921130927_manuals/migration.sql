-- CreateTable
CREATE TABLE "public"."Manual" (
    "id" TEXT NOT NULL,
    "name_file" TEXT NOT NULL,
    "url_file" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "Manual_pkey" PRIMARY KEY ("id")
);
