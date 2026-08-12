import { bootstrapNotionConnection } from "@/lib/notion/bootstrap";

async function main() {
  const result = await bootstrapNotionConnection();
  console.log(
    `${result.replaced ? "Updated" : "Created"} Notion connection "${result.connectionName}" with ${result.databaseCount} database mappings.`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
