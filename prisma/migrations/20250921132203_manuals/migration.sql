/*
  Warnings:

  - You are about to drop the column `file_type` on the `Manual` table. All the data in the column will be lost.
  - You are about to drop the column `name_file` on the `Manual` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Manual` table. All the data in the column will be lost.
  - You are about to drop the column `url_file` on the `Manual` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `Manual` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Manual` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Manual" DROP COLUMN "file_type",
DROP COLUMN "name_file",
DROP COLUMN "size",
DROP COLUMN "url_file",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;
