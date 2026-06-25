import { config } from "dotenv";
config();
import { db } from "./src/lib/db";
async function run() {
  await db.user.updateMany({
    where: { email: "" },
    data: { accessLevel: "user" },
  });
  console.log("Demoted");
}
run();
