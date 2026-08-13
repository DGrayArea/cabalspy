import { db } from "../src/lib/db";
import { randomBytes } from "crypto";
async function main() {
  const u = await db.user.findFirst({ where: { email: "alexodey79@gmail.com" } });
  const token = "cctest-" + randomBytes(20).toString("hex");
  await db.session.create({ data: { userId: u!.id, token, expiresAt: new Date(Date.now() + 7200_000) } });
  console.log("TOKEN:" + token);
  await db.$disconnect();
}
main();
