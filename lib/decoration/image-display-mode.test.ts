import * as assert from "node:assert/strict";
import { test } from "node:test";
import {
  decorationImageFitClass,
  normalizeDecorationImageDisplayMode,
} from "./image-display-mode";

test("legacy decoration images default to cover", () => {
  assert.equal(normalizeDecorationImageDisplayMode(undefined), "COVER");
  assert.equal(decorationImageFitClass(undefined), "object-cover");
});

test("legacy custom decoration images can default to contain", () => {
  assert.equal(
    decorationImageFitClass(undefined, "CONTAIN"),
    "object-contain",
  );
});

test("full decoration images use contain", () => {
  assert.equal(normalizeDecorationImageDisplayMode("CONTAIN"), "CONTAIN");
  assert.equal(decorationImageFitClass("CONTAIN"), "object-contain");
});

test("invalid cached values safely default to cover", () => {
  assert.equal(normalizeDecorationImageDisplayMode("STRETCH"), "COVER");
});
