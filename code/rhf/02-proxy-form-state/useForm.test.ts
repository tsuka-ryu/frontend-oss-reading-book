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
  const log = mount((f) => void f.formState.errors);
  const first = log.form.control;
  act(() => log.form.setError("email", "required"));
  assert.equal(log.renders, 2);
  assert.equal(log.form.control, first);
});

test("入力しても、formState が変わらなければ再描画しない", () => {
  const log = mount((f) => void f.formState.isDirty);
  const { onChange } = log.form.register("email");
  act(() => onChange(type("email", "a"))); // isDirty が変わる
  const after = log.renders;
  act(() => onChange(type("email", "ab")));
  act(() => onChange(type("email", "abc")));
  assert.equal(log.renders, after);
});

test("通知が来ると setter が呼ばれ、formState が新しくなる", () => {
  const log = mount((f) => void f.formState.errors);
  act(() => log.form.setError("email", "required"));
  assert.equal(log.form.formState.errors.email, "required");
});

test("errors だけを読むコンポーネントは、isDirty が変わっても再描画しない", () => {
  const log = mount((f) => void f.formState.errors); // errors しか読まない
  const { onChange } = log.form.register("email");
  const before = log.renders;
  act(() => onChange(type("email", "a"))); // isDirty が変わる
  assert.equal(log.renders, before); // 読んでいないので再描画しない
});

test("isDirty を読むコンポーネントは、isDirty が変わると再描画する", () => {
  const log = mount((f) => void f.formState.isDirty); // isDirty を読む
  const { onChange } = log.form.register("email");
  const before = log.renders;
  act(() => onChange(type("email", "a"))); // isDirty が変わる
  assert.equal(log.renders, before + 1);
});

test("足りないもの：register はrefを返さないので、値をDOMへ書き戻せない", () => {
  const log = { form: {} as ReturnType<typeof useForm> };
  function App() {
    log.form = useForm();
    return createElement("input", { ...log.form.register("email") });
  }
  const container = window.document.createElement("div");
  const root = createRoot(container as never);
  act(() => root.render(createElement(App)));

  // 値をどこかから書き戻したいとき（reset や setValue が本来やること）
  log.form.control._formValues.email = "prefilled@example.com";

  const input =
    container.querySelector("input") as unknown as { value: string };
  // _formValues を書き換えても、どこにも <input> の value を書く仕組みが
  // ないので、画面には反映されない
  assert.notEqual(input.value, "prefilled@example.com");
});
