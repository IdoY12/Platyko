-- Emails are now normalised (trimmed, lower-cased) on every write; align rows created before that.
UPDATE "User" SET "email" = lower(trim("email"));
UPDATE "PendingRegistration" SET "email" = lower(trim("email"));
