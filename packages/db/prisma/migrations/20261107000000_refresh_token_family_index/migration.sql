-- Refresh grace looks up a token's successor by family.
CREATE INDEX "RefreshToken_family_idx" ON "RefreshToken"("family");
