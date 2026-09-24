import { test } from "node:test";
import assert from "node:assert/strict";
import shouldRenderFormState from "./shouldRenderFormState.ts";
import type { ProxyFormState } from "./createFormControl.ts";

test("変化したキーが読まれていれば true", () => {
  const proxyFormState: ProxyFormState = { isDirty: true, errors: false };
  assert.equal(shouldRenderFormState({ isDirty: false }, proxyFormState), true);
});

test("変化したキーが読まれていなければ false", () => {
  const proxyFormState: ProxyFormState = { isDirty: false, errors: false };
  assert.equal(shouldRenderFormState({ isDirty: true }, proxyFormState), false);
});

test("キーを一つも含まない差分は true（初期通知などを想定）", () => {
  const proxyFormState: ProxyFormState = { isDirty: false, errors: false };
  assert.equal(shouldRenderFormState({}, proxyFormState), true);
});
