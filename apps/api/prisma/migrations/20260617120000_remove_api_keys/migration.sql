-- Drop the unused ApiKey feature. The FlexibleAuthGuard no longer validates
-- `maud_` API keys; only JWT and paid-txDigest auth remain.
DROP TABLE IF EXISTS "ApiKey";
