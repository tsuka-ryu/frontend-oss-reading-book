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

test("setValue は、非制御の <input> の value をReactを介さず書き換える", () => {
  const log = { form: {} as ReturnType<typeof useForm> };
  function App() {
    log.form = useForm();
    // valueプロパティは渡さない。渡せば制御コンポーネントに戻ってしまう
    return createElement("input", { ...log.form.register("email") });
  }
  const container = window.document.createElement("div");
  const root = createRoot(container as never);
  act(() => root.render(createElement(App)));

  act(() => log.form.setValue("email", "prefilled@example.com"));

  const input =
    container.querySelector("input") as unknown as { value: string };
  // 前章まで足りなかった書き戻しが、DOMノードへの直接書き込みで動くようになった
  assert.equal(input.value, "prefilled@example.com");
});
