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

test("register+setValueだけでは、refを転送しないコンポーネントに書き込めない（この章でcontrollerを足す理由）", () => {
  const { register, setValue, control } = createFormControl();
  register("volume"); // refをどこにも渡していない（例：refを転送しないカスタムコンポーネント）
  setValue("volume", "80");
  assert.equal(control._formValues.volume, "80"); // 内部のキャッシュは更新される
  assert.equal(control._fields.volume, undefined); // が、書き込み先のDOMノードがない
});

test("controller の onChange は、name を付けて通知する", () => {
  const { control, controller } = createFormControl();
  let received: unknown;
  control._subscribe({
    name: "volume",
    formState: { values: true },
    callback: (diff) => (received = diff),
  });
  controller("volume").onChange("80");
  assert.equal(control._formValues.volume, "80");
  assert.deepEqual(received, { name: "volume", values: { volume: "80" } });
});

test("名前を指定した購読は、違う名前の通知では callback が呼ばれない", () => {
  const { control, controller } = createFormControl();
  let notified = 0;
  control._subscribe({
    name: "volume",
    formState: { values: true },
    callback: () => notified++,
  });
  controller("balance").onChange("100"); // 別の名前
  assert.equal(notified, 0);
});

test("formState.values を指定しない購読は、controller の通知だけでは呼ばれない", () => {
  // _proxyFormState はisDirty・errorsしか持たず、valuesを読んだ記録がない
  const { control, controller } = createFormControl();
  let notified = 0;
  control._subscribe({ name: "volume", callback: () => notified++ });
  controller("volume").onChange("80");
  assert.equal(notified, 0); // isDirtyの変化としては別途通知が飛ぶが、ここでは拾わない
});

test("名前を指定しない購読（useForm本体）は、どの名前のcontroller通知でも呼ばれる", () => {
  const { control, controller } = createFormControl();
  control._proxyFormState.isDirty = true; // isDirtyは読んでいる
  let notified = 0;
  control._subscribe({ callback: () => notified++ });
  controller("volume").onChange("80"); // isDirtyが変わる
  assert.equal(notified, 1);
});

test("ドット入りの名前は、入れ子の値として書かれる", () => {
  const { control, register } = createFormControl();
  register("user.email").onChange(type("user.email", "a@b"));
  assert.deepEqual(control._formValues, { user: { email: "a@b" } });
});

test("数字の鍵は配列として作られる", () => {
  const { control, register } = createFormControl();
  register("addresses.0.city").onChange(type("addresses.0.city", "Tokyo"));
  assert.deepEqual(control._formValues, { addresses: [{ city: "Tokyo" }] });
  assert.ok(Array.isArray(control._formValues.addresses));
});

test("入れ子の初期値も、名前で読み書きして isDirty に反映される", () => {
  const { control, register } = createFormControl({
    defaultValues: { user: { email: "a@b" } },
  });
  register("user.email").onChange(type("user.email", "c@d"));
  assert.equal(control._formState.isDirty, true);
});

test("親の名前の購読者に、子の変化が届く", () => {
  const { control, controller } = createFormControl();
  let notified = 0;
  control._subscribe({
    name: "addresses",
    formState: { values: true },
    callback: () => notified++,
  });
  controller("addresses.0.city").onChange("Tokyo");
  assert.equal(notified, 1);
});

test("子の名前の購読者に、親の変化が届く", () => {
  const { control, controller } = createFormControl();
  let notified = 0;
  control._subscribe({
    name: "addresses.0.city",
    formState: { values: true },
    callback: () => notified++,
  });
  controller("addresses").onChange("まとめて");
  assert.equal(notified, 1);
});

test("名前の途中で切れた文字列は親ではない（user と username）", () => {
  const { control, controller } = createFormControl();
  let notified = 0;
  control._subscribe({
    name: "user",
    formState: { values: true },
    callback: () => notified++,
  });
  controller("username").onChange("x");
  assert.equal(notified, 0);
});

test("足りないもの：register の onChange は値の変化を購読者に流さない", () => {
  const { control, register } = createFormControl();
  let notified = 0;
  control._subscribe({
    name: "user.email",
    formState: { values: true },
    callback: () => notified++,
  });
  register("user.email").onChange(type("user.email", "a@b"));
  assert.equal(notified, 0); // 値は入ったが、Appは今の値を知る手段がない
});
