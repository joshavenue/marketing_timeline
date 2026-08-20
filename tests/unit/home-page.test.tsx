import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("routes root visitors to the timeline", () => {
    HomePage();

    expect(mocks.redirect).toHaveBeenCalledWith("/timeline");
  });
});
