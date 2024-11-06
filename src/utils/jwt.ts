import jwt from "jsonwebtoken";
import { env } from "../env";

interface TokenPayload {
  userId: string;
  sessionId: string;
  sessionToken?: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    {
      userId: payload.userId,
      sessionId: payload.sessionId,
    },
    env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    {
      userId: payload.userId,
      sessionId: payload.sessionId,
      sessionToken: payload.sessionToken,
    },
    env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as TokenPayload;
};
