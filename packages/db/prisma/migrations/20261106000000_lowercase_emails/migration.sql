-- Emails are now normalised (trimmed, lower-cased) on every write; align rows created before that.
-- A database that already holds two rows differing only by case must be reconciled by hand first.
UPDATE "User" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
UPDATE "PendingRegistration" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
