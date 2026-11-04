import { execSync } from "node:child_process";

/** Browser tests start from the known demo data, so toggling things by hand in the app cannot make them fail. */
export default function globalSetup() {
  execSync("npx prisma db seed", { stdio: "ignore", env: { ...process.env, NODE_ENV: "development" } });
}
