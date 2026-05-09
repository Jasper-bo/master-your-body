import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envFile = resolve(root, ".env.local");
const envExample = resolve(root, ".env.example");

// 1. Create .env.local if missing
if (!existsSync(envFile)) {
  console.log("==> Creating .env.local with secure random secrets...");
  const jwtSecret = randomBytes(32).toString("hex");
  const jwtRefreshSecret = randomBytes(32).toString("hex");

  let content = readFileSync(envExample, "utf-8");
  content = content.replace(
    'JWT_SECRET="replace-with-32-bytes-or-longer-random-secret"',
    `JWT_SECRET="${jwtSecret}"`
  );
  content = content.replace(
    'JWT_REFRESH_SECRET="replace-with-different-32-bytes-or-longer-random-secret"',
    `JWT_REFRESH_SECRET="${jwtRefreshSecret}"`
  );
  writeFileSync(envFile, content, "utf-8");
  console.log("  OK: .env.local created");
} else {
  console.log("==> .env.local already exists, skipping");
}

// 2. Push database schema
console.log("");
console.log("==> Initializing database...");
execSync("npx prisma db push --skip-generate", {
  cwd: root,
  stdio: "inherit",
});

console.log("");
console.log("Setup complete! Run: npm run dev");
