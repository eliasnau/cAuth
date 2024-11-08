import dotenv from "dotenv";
dotenv.config();

import express from "express";
import webRoutes from "./routes/web";
import errorHandler from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import adminRouter from "./routes/v1/admin";
import { displayLogo, startServer } from "./utils/serverDisplay";

const app = express();
const PORT = process.env.PORT || 3000;
const startTime = new Date();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/", webRoutes);
app.use("/v1/admin", adminRouter);

// Error Handler
app.use(errorHandler);

if (!process.argv.slice(2).length) {
  console.clear();
  displayLogo();

  app.listen(PORT, async () => {
    await startServer(PORT, startTime);
  });
}

export default app;
