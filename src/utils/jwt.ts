import jwt from "jsonwebtoken";
import { env } from "../env";
import { db } from "../lib/db";
import type { TokenPayload } from "../types/auth";

export const generateTokens = async ({
  userId,
  sessionId,
  sessionToken,
}: Omit<TokenPayload, "tokenVersion">) => {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { tokenVersion: true },
  });

  const tokenVersion = session?.tokenVersion || 1;

  const accessToken = jwt.sign(
    { userId, sessionId, tokenVersion },
    env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId, sessionId, sessionToken },
    env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.JWT_REFRESH_TOKEN_SECRET) as TokenPayload;
};
