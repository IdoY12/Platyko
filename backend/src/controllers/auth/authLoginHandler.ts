import type { Request, Response } from "express";
import { prisma } from "@project/db";
import { logError, logInfo, logWarn } from "../../utils/logger.js";
import { unexpectedErrorReply } from "../../utils/dbErrors.js";
import { comparePassword, equalizeCompareTiming } from "../../utils/passwordHashing.js";
import type { LoginBody } from "../../validators/authValidators.js";
import { issueSessionForUser } from "../../services/auth/issueSessionForUser.js";

export async function authLoginHandler(request: Request, response: Response): Promise<void> {
  const { email, password } = request.validatedBody as LoginBody;
  logInfo("[AUTH]", "login:attempt", { email });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await equalizeCompareTiming();
      logWarn("[AUTH]", "login:user-not-found", { email });
      response.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.hashedPassword) {
      await equalizeCompareTiming();
      logWarn("[AUTH]", "login:social-only-account", { userId: user.id });
      response.status(401).json({ error: `Sign in with ${user.googleId ? "Google" : "Apple"} for this account` });
      return;
    }
    const isPasswordValid = await comparePassword(password, user.hashedPassword);

    if (!isPasswordValid) {
      logWarn("[AUTH]", "login:invalid-password", { userId: user.id });
      response.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const session = await issueSessionForUser(user);
    logInfo("[AUTH]", "login:success", { userId: user.id });
    response.json(session);
  } catch (error) {
    logError("[AUTH]", error, { phase: "login" });

    const reply = unexpectedErrorReply(error, "Login failed");

    response.status(reply.status).json(reply.body);
  }
}
