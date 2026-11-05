import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runPaymentRecoveryBatch } from "../src/lib/payment-recovery-batch";

async function main() {
const args = process.argv.slice(2);
if (args.some(arg => !["--once", "--watch"].includes(arg)) || args.length > 1) throw new Error("Use payments:recover [--once|--watch]");
let stop = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let wake: (() => void) | undefined;
const shutdown = () => { stop = true; if (timer) clearTimeout(timer); wake?.(); };
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
try {
  do {
    try {
      console.log(JSON.stringify({ at: new Date().toISOString(), ...await runPaymentRecoveryBatch(prisma) }));
    } catch (error) {
      if (!args.includes("--watch")) throw error;
      console.error("Payment recovery pass interrupted; persisted work will be retried.");
    }
    if (!args.includes("--watch") || stop) break;
    await new Promise<void>(resolve => { wake = resolve; timer = setTimeout(resolve, 30_000); });
  } while (!stop);
} finally { shutdown(); await prisma.$disconnect(); process.off("SIGINT", shutdown); process.off("SIGTERM", shutdown); }

}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
