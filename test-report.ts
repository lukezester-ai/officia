import { db } from "./src/lib/db/db";
import { ReportEngine } from "./src/lib/accounting/report-engine";
import { users } from "./src/lib/db/schema/users";

async function run() {
  try {
    const userList = await db.select().from(users).limit(1);
    if (!userList.length) {
       console.log("No users found");
       return;
    }
    const tenantId = userList[0].tenantId;
    if (!tenantId) {
       console.log("User has no tenantId");
       return;
    }
    console.log("Found tenantId:", tenantId);
    const report = await ReportEngine.generateBalanceSheet(tenantId, new Date());
    console.log("Success", Object.keys(report));
  } catch (e) {
    console.error("Error generating report:", e);
  }
  process.exit(0);
}
run();
