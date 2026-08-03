import { describe, expect, it } from "vitest";

import { canAdmin } from "@/lib/auth/access";

describe("workspace role access", () => {
  it("allows admins to administer the workspace", () => {
    expect(canAdmin("admin")).toBe(true);
  });

  it("does not allow members to administer the workspace", () => {
    expect(canAdmin("member")).toBe(false);
  });
});
