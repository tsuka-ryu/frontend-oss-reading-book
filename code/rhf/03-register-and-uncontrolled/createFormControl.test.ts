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

test("_proxyFormState で読んだと記録したキーの変化だけ callback が呼ばれる", () => {
  const { control, setError } = createFormControl();
  control._proxyFormState.errors = true; // errors を読んだことにする
  let notified = 0;
  control._subscribe({ callback: () => notified++ });
  setError("email", "required"); // errors が変わる
  assert.equal(notified, 1);
});

test("読んでいないキーの変化では callback が呼ばれない", () => {
  const { control, register } = createFormControl();
  // _proxyFormState は初期状態で isDirty も errors も false（未読）
  let notified = 0;
  control._subscribe({ callback: () => notified++ });
  register("email").onChange(type("email", "a")); // isDirty が変わる
  assert.equal(notified, 0);
  assert.equal(control._formState.isDirty, true); // 内部の状態は更新されている
});

test("購読を解除すると通知されない", () => {
  const { control, setError } = createFormControl();
  control._proxyFormState.errors = true;
  let notified = 0;
  const unsubscribe =
    control._subscribe({ callback: () => notified++ });
  unsubscribe();
  setError("email", "required");
  assert.equal(notified, 0);
});

test("register の ref は、DOMノードに初期値を書き込む", () => {
  const { register, control } = createFormControl({
    defaultValues: { email: "a@b" },
  });
  const node = { value: "" };
  register("email").ref(node);
  assert.equal(node.value, "a@b");
  assert.equal(control._fields.email, node);
});

test("ref に null を渡すと control から参照が外れる（アンマウント）", () => {
  const { register, control } = createFormControl();
  const node = { value: "" };
  const { ref } = register("email");
  ref(node);
  assert.equal(control._fields.email, node);
  ref(null);
  assert.equal(control._fields.email, undefined);
});

test("setValue は register されたDOMノードの value を直接書き換える", () => {
  const { register, setValue, control } = createFormControl();
  const node = { value: "" };
  register("email").ref(node);
  setValue("email", "prefilled@example.com");
  assert.equal(node.value, "prefilled@example.com");
  assert.equal(control._formValues.email, "prefilled@example.com");
});

test("足りないもの：DOMノードへの参照がない項目には setValue が書き込めない", () => {
  const { register, setValue, control } = createFormControl();
  register("volume"); // refをどこにも渡していない（例：refを転送しないカスタムコンポーネント）
  setValue("volume", "80");
  assert.equal(control._formValues.volume, "80"); // 内部のキャッシュは更新される
  assert.equal(control._fields.volume, undefined); // が、書き込み先のDOMノードがない
});
