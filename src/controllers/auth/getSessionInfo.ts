import { Request, Response } from "express";
import { db } from "../../lib/db";

export const getSessionInfo = async (req: Request, res: Response) => {
  try {
    // Since we're using authMiddleware, we know these properties exist
    const user = (req as any).user;
    const sessionId = (req as any).sessionId;

    // Get current session details
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        createdAt: true,
        lastActive: true,
        userAgent: true,
        //ip: true,
        expires: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
      });
    }

    return res.status(200).json({
      code: "SUCCESS",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImg: user.profileImg,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          riskLevel: user.riskLevel,
        },
        session,
      },
    });
  } catch (error) {
    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "An error occurred while fetching session information",
    });
  }
};
