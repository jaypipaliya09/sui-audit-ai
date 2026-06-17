-- AlterEnum: Add new project track values for the 9-track hackathon set.
-- Old values (INSTITUTIONS_CAPITAL_MARKETS, AI, DEFI, GAMING, PAYMENTS) are
-- preserved so existing rows remain valid.
ALTER TYPE "ProjectTrack" ADD VALUE IF NOT EXISTS 'INFRA';
ALTER TYPE "ProjectTrack" ADD VALUE IF NOT EXISTS 'CRYPTO';
ALTER TYPE "ProjectTrack" ADD VALUE IF NOT EXISTS 'ENTERTAINMENT';
ALTER TYPE "ProjectTrack" ADD VALUE IF NOT EXISTS 'STORAGE';
ALTER TYPE "ProjectTrack" ADD VALUE IF NOT EXISTS 'EXPLORATIONS';
ALTER TYPE "ProjectTrack" ADD VALUE IF NOT EXISTS 'DEGEN';
