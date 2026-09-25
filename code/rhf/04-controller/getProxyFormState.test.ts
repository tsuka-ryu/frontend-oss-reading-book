import { test } from "node:test";
import assert from "node:assert/strict";
import getProxyFormState from "./getProxyFormState.ts";
import type { ProxyFormState } from "./createFormControl.ts";

test("読んだキーだけ _proxyFormState が true になる", () => {
  const proxyFormState: ProxyFormState = { isDirty: false, errors: false };
  const wrapped = getProxyFormState(
    { isDirty: true, errors: {} }, proxyFormState);
  void wrapped.isDirty; // 読む
  assert.equal(proxyFormState.isDirty, true);
  assert.equal(proxyFormState.errors, false); // errors は読んでいない
});

test("読んだ値そのものは元の formState と同じ", () => {
  const proxyFormState: ProxyFormState = { isDirty: false, errors: false };
  const errors = { email: "required" };
  const wrapped = getProxyFormState({ isDirty: false, errors }, proxyFormState);
  assert.equal(wrapped.errors, errors);
});
