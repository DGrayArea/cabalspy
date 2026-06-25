import "dotenv/config";
import { db } from "./src/lib/db";

async function demote() {
    try {
        const user = await db.user.update({
            where: { email: "alexodey79@gmail.com" },
            data: { accessLevel: "user" }
        });
        console.log("SUCCESS: User demoted to 'user' level. Discord verification now required.", user.id);
        process.exit(0);
    } catch (error) {
        console.error("FAILED to demote user:", error);
        process.exit(1);
    }
}

demote();
