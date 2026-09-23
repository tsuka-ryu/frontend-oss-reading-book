// 本物：src/logic/createFormControl.ts。react は import しない。
import createSubject from "./createSubject.ts";
import shouldRenderFormState from "./shouldRenderFormState.ts";

export type FormState = {
  isDirty: boolean;
  errors: Record<string, string>;
};
export type ProxyFormState = { isDirty: boolean; errors: boolean };
type Values = Record<string, string>;
type FieldEvent = { target: { name: string; value: string } };

export function createFormControl(
  props: { defaultValues?: Values } = {},
) {
  const _defaultValues: Values = { ...props.defaultValues };
  const _formValues: Values = { ..._defaultValues };
  let _formState: FormState = { isDirty: false, errors: {} };
  // どのキーが読まれたか。読まれていないキーは false のまま
  const _proxyFormState: ProxyFormState = { isDirty: false, errors: false };
  const _subjects = { state: createSubject<Partial<FormState>>() };
  // 通知された差分は、読まれたかどうかに関係なく _formState へ写す
  _subjects.state.subscribe({
    next: (s) => (_formState = { ..._formState, ...s }),
  });

  const _subscribe = (props: { callback: () => void }) =>
    _subjects.state.subscribe({
      next: (diff) => {
        if (shouldRenderFormState(diff, _proxyFormState)) {
          props.callback();
        }
      },
    }).unsubscribe;

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
    register, _subscribe, _subjects, _formValues, _proxyFormState,
    get _formState() { return _formState; },
  };
  return { control, register, setError };
}
