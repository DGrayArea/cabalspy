import "dotenv/config";
import { db } from "./src/lib/db";

async function promote() {
    try {
        const user = await db.user.update({
            where: { email: "alexodey79@gmail.com" },
            data: { accessLevel: "admin" }
        });
        console.log("SUCCESS: User promoted to admin!", user.id);
        process.exit(0);
    } catch (error) {
        console.error("FAILED to promote user:", error);
        process.exit(1);
    }
}

promote();
