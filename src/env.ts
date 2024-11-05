import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.string(),
    PORT: z.number().min(1),

    JWT_ACCESS_TOKEN_SECRET: z.string().min(1), //! Change to 32 in production
    JWT_REFRESH_TOKEN_SECRET: z.string().min(1), //! Change to 32 in production

    DATABASE_URL: z.string().min(1),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.number().min(1),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM_EMAIL: z.string().email(),
    SMTP_FROM_NAME: z.string().min(1),
  },

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});
