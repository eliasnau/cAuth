import express from "express";
import { login } from "../../controllers/authentication.controller";
import { rateLimiter, RateLimiterRule } from "../../middleware/rateLimiter";

const router = express.Router();

const AUTH_RATE_LIMITER_RULE: RateLimiterRule = {
  endpoint: "auth",
  rate_limit: {
    time: 60,
    limit: 3,
  },
};

router.post("/login", rateLimiter(AUTH_RATE_LIMITER_RULE), login);

export default router;
