-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('pending', 'active', 'blocked');

-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'member',
ADD COLUMN     "status" "public"."Status" NOT NULL DEFAULT 'pending';
