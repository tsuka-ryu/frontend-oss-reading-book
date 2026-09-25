import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "./useForm.ts";
import { useController } from "./useController.ts";

const window = new Window();
Object.assign(globalThis, {
  window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true,
});

// name ごとの useController を1つずつ描画し、フィールドごとの再描画回数を数える
function mountTwoFields() {
  const renders = { volume: 0, balance: 0 };
  const fields = {} as Record<
    "volume" | "balance", ReturnType<typeof useController>["field"]
  >;
  function Field({ name }: { name: "volume" | "balance" }) {
    renders[name]++;
    const { field } = useController({ control, name });
    fields[name] = field;
    return null;
  }
  let control!: ReturnType<typeof useForm>["control"];
  function App() {
    control = useForm().control;
    return createElement(
      "div", null,
      createElement(Field, { name: "volume" }),
      createElement(Field, { name: "balance" }),
    );
  }
  const root = createRoot(window.document.createElement("div") as never);
  act(() => root.render(createElement(App)));
  return { renders, fields, get control() { return control; } };
}

test("controller の onChange を呼ぶと、その名前のフィールドだけ再描画する", () => {
  const { renders, fields } = mountTwoFields();
  const before = { ...renders };
  act(() => fields.volume.onChange({ target: { value: "80" } }));
  assert.equal(renders.volume, before.volume + 1);
  assert.equal(renders.balance, before.balance); // 別の名前は再描画しない
});

test("value は、onChange のあとの最新値を返す", () => {
  const { fields } = mountTwoFields();
  act(() => fields.volume.onChange({ target: { value: "80" } }));
  assert.equal(fields.volume.value, "80");
});

test("useForm本体（isDirtyを読む）は、controllerの変化でも再描画する", () => {
  const log = { renders: 0, isDirty: false };
  let controllerField: ReturnType<typeof useController>["field"];
  function Field({ control }: { control: ReturnType<typeof useForm>["control"] }) {
    controllerField = useController({ control, name: "volume" }).field;
    return null;
  }
  function App() {
    const form = useForm();
    log.renders++;
    log.isDirty = form.formState.isDirty; // isDirtyを読む
    return createElement(Field, { control: form.control });
  }
  const root = createRoot(window.document.createElement("div") as never);
  act(() => root.render(createElement(App)));
  const before = log.renders;
  act(() => controllerField.onChange({ target: { value: "80" } }));
  assert.equal(log.renders, before + 1);
  assert.equal(log.isDirty, true);
});
