/**
 * Grant or revoke access levels from the command line.
 *
 * Look users up by email, wallet address, Discord ID or Telegram ID — you
 * rarely have the internal user id to hand.
 *
 * Usage:
 *   pnpm tsx scripts/set-access.ts <identifier> <user|holder|admin>
 *   pnpm tsx scripts/set-access.ts <identifier>            # inspect only
 *   pnpm tsx scripts/set-access.ts --list-admins
 *
 * Examples:
 *   pnpm tsx scripts/set-access.ts someone@gmail.com admin
 *   pnpm tsx scripts/set-access.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU holder
 *   pnpm tsx scripts/set-access.ts 762720209529864212 user
 *
 * The super admin (SUPER_ADMIN_EMAIL) can never be demoted here — the same
 * rule the API enforces, so a stray command can't lock you out of /admin.
 */

import { db } from "../src/lib/db";
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from "../src/lib/adminAuth";

const VALID_LEVELS = ["user", "holder", "admin"] as const;
type Level = (typeof VALID_LEVELS)[number];

async function findUser(identifier: string) {
  // Wallet addresses live on a separate table, so try that too.
  const wallet = await db.wallet.findFirst({
    where: { address: identifier },
    select: { userId: true },
  });

  return db.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { discordId: identifier },
        { telegramId: identifier },
        { id: identifier },
        ...(wallet ? [{ id: wallet.userId }] : []),
      ],
    },
    include: { wallets: { select: { network: true, address: true } } },
  });
}

function describe(u: {
  id: string; name: string; email: string | null; accessLevel: string;
  discordId: string | null; telegramId: string | null;
  wallets: { network: string; address: string }[];
}) {
  const sol = u.wallets.find((w) => w.network === "solana")?.address;
  return [
    `  name    : ${u.name}`,
    `  email   : ${u.email ?? "—"}`,
    `  level   : ${u.accessLevel}${isSuperAdmin(u) ? "  (SUPER ADMIN)" : ""}`,
    `  discord : ${u.discordId ?? "—"}`,
    `  telegram: ${u.telegramId ?? "—"}`,
    `  solana  : ${sol ?? "—"}`,
    `  id      : ${u.id}`,
  ].join("\n");
}

async function main() {
  const [identifier, level] = process.argv.slice(2);

  if (identifier === "--list-admins") {
    const admins = await db.user.findMany({
      where: { accessLevel: "admin" },
      include: { wallets: { select: { network: true, address: true } } },
      orderBy: { createdAt: "asc" },
    });
    console.log(`\n${admins.length} admin(s) — super admin is ${SUPER_ADMIN_EMAIL}\n`);
    admins.forEach((a) => console.log(describe(a) + "\n"));
    return;
  }

  if (!identifier) {
    console.error("Usage: pnpm tsx scripts/set-access.ts <email|wallet|discordId|telegramId> [user|holder|admin]");
    process.exitCode = 1;
    return;
  }

  const user = await findUser(identifier);
  if (!user) {
    console.error(`No user matches "${identifier}" (tried email, wallet address, Discord id, Telegram id, user id).`);
    process.exitCode = 1;
    return;
  }

  // No level given — just report.
  if (!level) {
    console.log(`\nFound user:\n${describe(user)}\n`);
    return;
  }

  if (!VALID_LEVELS.includes(level as Level)) {
    console.error(`Invalid level "${level}". Expected one of: ${VALID_LEVELS.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  if (isSuperAdmin(user) && level !== "admin") {
    console.error(`Refusing to demote the super admin (${SUPER_ADMIN_EMAIL}).`);
    process.exitCode = 1;
    return;
  }

  if (user.accessLevel === level) {
    console.log(`\nNo change — already "${level}":\n${describe(user)}\n`);
    return;
  }

  const before = user.accessLevel;
  await db.user.update({ where: { id: user.id }, data: { accessLevel: level } });
  const after = await findUser(identifier);

  console.log(`\n${before} -> ${level}\n${after ? describe(after) : ""}\n`);
}

main()
  .catch((err) => {
    console.error("Failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
