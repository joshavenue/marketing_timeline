"use client";

import { useState } from "react";

export function GrowthRail() {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-black/10 bg-white/70">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>Company growth context</span>
        <span className="text-black/45">{open ? "Hide" : "Compare"}</span>
      </button>
      {open ? (
        <div className="border-t border-black/10 px-6 py-8">
          <div className="flex h-24 items-end gap-1" aria-label="No growth data">
            <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-black/15 text-sm text-black/45">
              Select a Notion-defined growth metric when observations are
              available.
            </div>
          </div>
          <p className="mt-3 text-xs text-black/45">
            Timing alignment supports human interpretation and does not prove
            causation.
          </p>
        </div>
      ) : null}
    </section>
  );
}
