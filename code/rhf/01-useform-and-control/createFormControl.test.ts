import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createFormControl } from "./createFormControl.ts";

const type = (name: string, value: string) =>
  ({ target: { name, value } });

test("createFormControl は react を import しない", () => {
  const url = new URL("./createFormControl.ts", import.meta.url);
  assert.doesNotMatch(readFileSync(url, "utf8"), /from "react"/);
});

test("入力した値は control の _formValues に入る", () => {
  const { control, register } = createFormControl();
  register("email").onChange(type("email", "a@b"));
  assert.equal(control._formValues.email, "a@b");
});

test("通知は formState が変わったときだけ流れる", () => {
  const { control, register } = createFormControl();
  let notified = 0;
  control._subscribe({ callback: () => notified++ });
  const { onChange } = register("email");
  onChange(type("email", "a")); // isDirty: false -> true
  onChange(type("email", "ab")); // isDirty は true のまま
  onChange(type("email", "abc"));
  assert.equal(notified, 1);
  assert.equal(control._formState.isDirty, true);
});

test("購読を解除すると通知されない", () => {
  const { control, setError } = createFormControl();
  let notified = 0;
  const unsubscribe =
    control._subscribe({ callback: () => notified++ });
  unsubscribe();
  setError("email", "required");
  assert.equal(notified, 0);
});
