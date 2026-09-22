import "@/lib/decoration/image-crop-test-dom.mjs";
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
const require = createRequire(import.meta.url);
require.extensions[".css"] = (module) => {
  module.exports = {};
};
const { InvoiceNumberingSettingsCard } =
  require("./invoice-numbering-settings") as typeof import("./invoice-numbering-settings");
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});
const initial = {
  config: {
    format: "PREFIX_YEAR_NUMBER",
    prefix: "LB",
    minimumDigits: 5,
    yearStyle: "SHORT",
    resetAnnually: true,
    startingNumber: 1,
  },
  financialYear: "2026-27",
  revision: 0,
  nextNumber: 1,
  legacy: true,
  preview: ["LB/2026-27/00001", "LB/2026-27/00002", "LB/2026-27/00003"],
};
const reply = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { status: 200 });

test("loads legacy settings, previews 12/full-year and saves the versioned restaurant settings", async () => {
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "PATCH") {
      const input = JSON.parse(String(init.body));
      requests.push(input);
      return reply({
        ...initial,
        config: input,
        nextNumber: 12,
        revision: 1,
        legacy: false,
        preview: ["12/2026-2027", "13/2026-2027", "14/2026-2027"],
      });
    }
    return reply(initial);
  };
  render(
    <ToastProvider>
      <InvoiceNumberingSettingsCard accessToken="test-token" />
    </ToastProvider>,
  );
  await screen.findByLabelText("Next sequence number");
  assert.equal(
    (screen.getByLabelText("Next sequence number") as HTMLInputElement).value,
    "1",
  );
  fireEvent.change(screen.getByLabelText("Number format"), {
    target: { value: "NUMBER_YEAR" },
  });
  fireEvent.change(screen.getByLabelText("Financial year display"), {
    target: { value: "FULL" },
  });
  fireEvent.change(screen.getByLabelText("Minimum digits"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Next sequence number"), {
    target: { value: "12" },
  });
  assert.ok(screen.getByText("12/2026-2027"));
  assert.equal(
    requests.length,
    0,
    "Editing and previewing must not allocate or save",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save numbering settings" }),
  );
  await waitFor(() => assert.equal(requests.length, 1));
  assert.equal(requests[0].nextNumber, 12);
  assert.equal(requests[0].revision, 0);
  assert.equal(requests[0].financialYear, "2026-27");
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("button", {
          name: "Save numbering settings",
        }) as HTMLButtonElement
      ).disabled,
      true,
    ),
  );
});

test("failed save keeps edited values and provides an explicit reload", async () => {
  globalThis.fetch = async (_input, init) =>
    init?.method === "PATCH"
      ? new Response(
          JSON.stringify({
            success: false,
            message:
              "Invoice numbering changed. Reload settings before saving.",
          }),
          { status: 409 },
        )
      : reply(initial);
  render(
    <ToastProvider>
      <InvoiceNumberingSettingsCard accessToken="test-token" />
    </ToastProvider>,
  );
  await screen.findByLabelText("Next sequence number");
  fireEvent.change(screen.getByLabelText("Next sequence number"), {
    target: { value: "20" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save numbering settings" }),
  );
  await waitFor(() =>
    assert.match(screen.getByRole("alert").textContent ?? "", /changed/),
  );
  assert.equal(
    (screen.getByLabelText("Next sequence number") as HTMLInputElement).value,
    "20",
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Reload saved settings/ }),
  );
  await waitFor(() =>
    assert.equal(
      (screen.getByLabelText("Next sequence number") as HTMLInputElement).value,
      "1",
    ),
  );
});

test("blocks backward sequences and a reset without a financial year", async () => {
  globalThis.fetch = async () => reply({ ...initial, nextNumber: 12 });
  render(
    <ToastProvider>
      <InvoiceNumberingSettingsCard accessToken="test-token" />
    </ToastProvider>,
  );
  await screen.findByLabelText("Next sequence number");
  fireEvent.change(screen.getByLabelText("Next sequence number"), {
    target: { value: "11" },
  });
  assert.ok(
    (
      screen.getByRole("button", {
        name: "Save numbering settings",
      }) as HTMLButtonElement
    ).disabled,
  );
  fireEvent.change(screen.getByLabelText("Next sequence number"), {
    target: { value: "12" },
  });
  fireEvent.change(screen.getByLabelText("Number format"), {
    target: { value: "PREFIX_NUMBER" },
  });
  assert.ok(
    (
      screen.getByRole("button", {
        name: "Save numbering settings",
      }) as HTMLButtonElement
    ).disabled,
  );
});
