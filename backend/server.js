import { createApp } from "./app.js";
import {
  connectDatabases,
  disconnectDatabases,
} from "./shared/config/databases.js";
import { environment, validateEnvironment } from "./shared/config/environment.js";
import { initialiseApplication } from "./startup.js";

let server;
let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  // Allow requests to finish, but do not hang indefinitely during deployment.
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref();
  try {
    if (server?.listening) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await disconnectDatabases();
  } catch (error) {
    console.error("Backend shutdown failed:", error.message);
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}

try {
  validateEnvironment();
  await connectDatabases();
  await initialiseApplication();
  server = createApp().listen(environment.port);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  console.log(`Backend API listening on port ${environment.port}`);
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch (error) {
  console.error("Backend startup failed:", error.message);
  process.exitCode = 1;
  await shutdown();
}
