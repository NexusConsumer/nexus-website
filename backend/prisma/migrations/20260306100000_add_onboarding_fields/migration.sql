-- AlterTable: User — add phone, jobTitle, onboardingDone
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "phone"          TEXT,
  ADD COLUMN IF NOT EXISTS "jobTitle"       TEXT,
  ADD COLUMN IF NOT EXISTS "onboardingDone" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Account — add websiteUrl, businessDesc, useCases
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "websiteUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "businessDesc" TEXT,
  ADD COLUMN IF NOT EXISTS "useCases"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
