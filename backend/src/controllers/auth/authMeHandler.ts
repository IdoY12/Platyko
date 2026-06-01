import type { Response } from "express";
import { prisma } from "@project/db";
import type { AuthenticatedRequest } from "../../@types/auth.js";

export async function authMeHandler(request: AuthenticatedRequest, response: Response): Promise<void> {
  try {
    const userId = request.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, avatarUrl: true },
    });

    if (!user) {
      response.status(401).json({ error: "Invalid token" });
      return;
    }
    response.json(user);
  } catch {
    response.status(500).json({ error: "Failed to load profile" });
  }
}
