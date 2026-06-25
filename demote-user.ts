import "dotenv/config";

// pgBouncer (DATABASE_URL) doesn't support Prisma's extended protocol for scripts.
// Use DIRECT_URL (direct Postgres connection) instead.
if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import { db } from "./src/lib/db";

/**
 * Demotes a user to 'user' level (removes admin/holder privileges).
 *
 * Usage:
 *   npx tsx demote-user.ts <email>
 *
 * Example:
 *   npx tsx demote-user.ts someone@example.com
 */
async function demote() {
    const email = process.argv[2];

    if (!email) {
        console.error("Usage: npx tsx demote-user.ts <email>");
        process.exit(1);
    }

    try {
        const user = await db.user.update({
            where: { email },
            data: { accessLevel: "user" },
        });
        console.log(`SUCCESS: ${email} demoted to 'user'. Discord verification now required.`, `(id: ${user.id})`);
        process.exit(0);
    } catch (error: any) {
        if (error?.code === "P2025") {
            console.error(`ERROR: No user found with email "${email}".`);
        } else {
            console.error("FAILED:", error);
        }
        process.exit(1);
    }
}

demote();
