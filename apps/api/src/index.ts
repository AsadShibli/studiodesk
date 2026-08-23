import "dotenv/config";
import { createApp } from "./app";
import { env } from "./env";

const app = createApp();
app.listen(env.apiPort, () => {
  console.log(`StudioDesk API on http://localhost:${env.apiPort}`);
});
