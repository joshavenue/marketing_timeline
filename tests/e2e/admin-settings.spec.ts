import { expect, test } from "@playwright/test";

const skill = `# X API

\`\`\`connector-manifest
{
  "apiFamily": "x",
  "version": 1,
  "operations": [
    {
      "key": "x.post.metrics",
      "method": "GET",
      "host": "api.x.com",
      "path": "/2/tweets",
      "allowedQueryParameters": ["ids", "tweet.fields"],
      "allowedResponseFields": ["data.id", "data.public_metrics"]
    }
  ]
}
\`\`\`

Only use the owned post metrics operation.`;

test("member mutations are forbidden and admin settings are audited", async ({
  browser,
  page,
}) => {
  const member = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    storageState: "test-results/member.json",
  });
  const forbidden = await member.request.post("/api/settings/connections", {
    data: {
      connectorKey: "notion",
      name: "Forbidden",
      credential: "secret",
      hardCapMicros: 0,
    },
  });
  expect(forbidden.status()).toBe(403);
  await member.close();

  await page.goto("/settings/connections");
  await page.getByLabel("Connector").selectOption("x_post");
  await page.getByLabel("Connection name").fill("CMO owned posts");
  await page.getByLabel("Credential JSON").fill(
    JSON.stringify({ userAccessToken: "never-render-this-token" }),
  );
  await page.getByLabel("Confirm credential rotation").check();
  await page.getByRole("button", { name: "Save connection" }).click();
  await expect(
    page.getByRole("cell", { name: "CMO owned posts" }),
  ).toBeVisible();
  await expect(page.getByText("never-render-this-token")).toHaveCount(0);
  await page.getByLabel("Connector").selectOption("notion");
  await page.getByLabel("Connection name").fill("CMO Notion");
  await page.getByLabel("Credential JSON").fill("never-render-this-notion-token");
  await page.getByLabel("Confirm credential rotation").check();
  await page.getByRole("button", { name: "Save connection" }).click();
  await expect(page.getByRole("cell", { name: "CMO Notion" })).toBeVisible();
  await expect(page.getByText("never-render-this-notion-token")).toHaveCount(0);

  await page.getByLabel("API family").fill("x");
  await page.getByLabel("Skill version").fill("1");
  await page.getByLabel("SKILL.md").fill(skill);
  await page.getByRole("button", { name: "Activate skill" }).click();
  await expect(page.getByText(/Version 1.*checksum/i)).toBeVisible();

  await page.getByLabel("Hard cap in micros").fill("500000");
  await page.getByLabel("Confirm cap change").check();
  await page.getByRole("button", { name: "Update cap" }).click();
  await expect(page.getByText("500000 μ")).toBeVisible();

  await page.goto("/settings/audit");
  await expect(page.getByText("connection.created")).toHaveCount(2);
  await expect(page.getByText("connector_skill.activated")).toBeVisible();
  await expect(page.getByText("connection.cap_changed")).toBeVisible();
});
