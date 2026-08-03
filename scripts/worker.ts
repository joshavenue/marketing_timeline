import { runWorkerOnce } from "@/lib/refresh/worker";

const pollMs = 1_000;

async function main() {
  while (true) {
    const result = await runWorkerOnce();
    if (!result) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
