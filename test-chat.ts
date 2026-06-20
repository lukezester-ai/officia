import { processAIRequest } from "./src/lib/ai/assistant";

async function run() {
  try {
    const res = await processAIRequest({
      tenantId: "e13ecdca-b801-427d-a714-eee9a9715766",
      userId: "test-user",
      message: "???????",
      history: []
    });
    console.log("Success:", res.message);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
run();
