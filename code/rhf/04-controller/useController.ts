// 本物：src/useController.ts
import { useEffect, useState } from "react";
import type { createFormControl } from "./createFormControl.ts";

type Control = ReturnType<typeof createFormControl>["control"];

export function useController(props: { control: Control; name: string }) {
  const { control, name } = props;
  // control.controller(name).onChange は値そのものを受け取る。
  // <input onChange={...}> に渡す field.onChange はDOMのイベントを受け取り、
  // ここでvalueだけ取り出してから橋渡しする
  const { onChange: controllerOnChange } = control.controller(name);
  const [value, setValue] = useState(() => control._formValues[name] ?? "");

  useEffect(() => control._subscribe({
    name,
    formState: { values: true }, // isDirty・errorsを読んでいなくても通知を受ける
    callback: () => setValue(control._formValues[name]),
  }), [control, name]);

  const onChange = (event: { target: { value: string } }) =>
    controllerOnChange(event.target.value);

  return { field: { name, value, onChange } };
}
