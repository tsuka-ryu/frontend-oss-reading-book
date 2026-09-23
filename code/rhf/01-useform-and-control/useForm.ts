// 本物：src/useForm.ts
import { useLayoutEffect, useRef, useState } from "react";
import { createFormControl } from "./createFormControl.ts";
import type { FormState } from "./createFormControl.ts";

type Props = Parameters<typeof createFormControl>[0];
type FormControl = ReturnType<typeof createFormControl>;

export function useForm(props: Props = {}) {
  const _formControl = useRef<FormControl>(undefined);
  const [formState, updateFormState] = useState<FormState>(
    { isDirty: false, errors: {} });

  if (!_formControl.current) {
    _formControl.current = createFormControl(props);
  }
  const control = _formControl.current.control;

  useLayoutEffect(() => control._subscribe({
    callback: () =>
      updateFormState({ ...control._formState }),
  }), [control]);

  return { ..._formControl.current, formState };
}
