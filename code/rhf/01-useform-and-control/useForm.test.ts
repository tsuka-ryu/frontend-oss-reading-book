import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "./useForm.ts";

const window = new Window();
Object.assign(globalThis, {
  window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true,
});
const type = (name: string, value: string) =>
  ({ target: { name, value } });

// useForm を呼ぶコンポーネントを描画し、描画回数と戻り値を記録する
function mount(read: (f: ReturnType<typeof useForm>) => void) {
  const log = { renders: 0, form: {} as ReturnType<typeof useForm> };
  function App() {
    log.renders++;
    log.form = useForm();
    read(log.form);
    return null;
  }
  const root = createRoot(
    window.document.createElement("div") as never);
  act(() => root.render(createElement(App)));
  return log;
}

test("再描画しても control は同じ参照のまま", () => {
  const log = mount(() => {});
  const first = log.form.control;
  act(() => log.form.setError("email", "required"));
  assert.equal(log.renders, 2);
  assert.equal(log.form.control, first);
});

test("入力しても、formState が変わらなければ再描画しない", () => {
  const log = mount(() => {});
  const { onChange } = log.form.register("email");
  act(() => onChange(type("email", "a"))); // isDirty が変わる
  const after = log.renders;
  act(() => onChange(type("email", "ab")));
  act(() => onChange(type("email", "abc")));
  assert.equal(log.renders, after);
  assert.equal(log.form.control._formValues.email, "abc");
});

test("通知が来ると setter が呼ばれ、formState が新しくなる", () => {
  const log = mount(() => {});
  act(() => log.form.setError("email", "required"));
  assert.equal(log.form.formState.errors.email, "required");
});

test("足りないもの：読んでいないキーの変化でも再描画する", () => {
  // errors しか読まないコンポーネント
  const log = mount((f) => void f.formState.errors);
  const { onChange } = log.form.register("email");
  act(() => onChange(type("email", "a"))); // isDirty だけが変わる
  assert.equal(log.renders, 2); // 本物なら再描画しない
});
