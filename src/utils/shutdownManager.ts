import logger from "./logger";
import { db } from "../lib/db";

let isShuttingDown = false;

export async function gracefulShutdown(signal: string, serverInstance: Server) {
  console.log("");
  if (isShuttingDown) {
    logger.info("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  if (signal === "SIGTERM") {
    logger.warn(`🛑 Received ${signal}. Starting graceful shutdown...`);
  } else {
    logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
  }

  try {
    // Close HTTP server
    logger.info("Closing HTTP server...");
    try {
      await closeHttpServer(serverInstance);
      logger.info("HTTP server closed successfully");
    } catch (error) {
      logger.error("Failed to close HTTP server:", error);
    }

    // Disconnect from database
    logger.info("Closing database connections...");
    try {
      await closeDatabaseConnection();
      logger.info("Database connections closed successfully");
    } catch (error) {
      logger.error("Failed to close database connections:", error);
    }

    // Additional cleanup tasks
    logger.info("Starting additional cleanup tasks...");
    try {
      await performAdditionalCleanup();
      logger.info("Additional cleanup completed successfully");
    } catch (error) {
      logger.error("Failed during additional cleanup:", error);
    }

    logger.info("✓ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Fatal error during shutdown:", error);
    process.exit(1);
  }
}

async function closeDatabaseConnection(): Promise<void> {
  await db.$disconnect();
}

async function performAdditionalCleanup(): Promise<void> {
  // Add any additional cleanup tasks here
  // Example: Clear temporary files
  // await clearTempFiles();
  // Example: Close cache connections
  // await cache.disconnect();
}
