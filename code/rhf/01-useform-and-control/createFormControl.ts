// 本物：src/logic/createFormControl.ts。react は import しない。
import createSubject from "./createSubject.ts";

export type FormState = {
  isDirty: boolean;
  errors: Record<string, string>;
};
type Values = Record<string, string>;
type FieldEvent = { target: { name: string; value: string } };

export function createFormControl(
  props: { defaultValues?: Values } = {},
) {
  const _defaultValues: Values = { ...props.defaultValues };
  const _formValues: Values = { ..._defaultValues };
  let _formState: FormState = { isDirty: false, errors: {} };
  const _subjects = { state: createSubject<Partial<FormState>>() };
  // 通知された差分を、ほかの購読者より先に _formState へ写す
  _subjects.state.subscribe({
    next: (s) => (_formState = { ..._formState, ...s }),
  });

  const _subscribe = (props: { callback: () => void }) =>
    _subjects.state.subscribe({ next: () => props.callback() })
      .unsubscribe;

  const onChange = (event: FieldEvent) => {
    const { name, value } = event.target;
    _formValues[name] = value;
    const isDirty = Object.keys(_formValues).some(
      (k) => _formValues[k] !== (_defaultValues[k] ?? ""),
    );
    if (isDirty !== _formState.isDirty) {
      _subjects.state.next({ isDirty });
    }
  };
  const register = (name: string) => {
    _formValues[name] ??= "";
    return { name, onChange };
  };
  const setError = (name: string, message: string) =>
    _subjects.state.next({
      errors: { ..._formState.errors, [name]: message },
    });

  const control = {
    register, _subscribe, _subjects, _formValues,
    get _formState() { return _formState; },
  };
  return { control, register, setError };
}
