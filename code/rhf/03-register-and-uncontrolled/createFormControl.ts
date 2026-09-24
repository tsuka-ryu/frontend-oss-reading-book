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
// register の ref が受け取る先。本物のDOMノードは必ずこの形を持つ
type FieldRef = { value: string };

export function createFormControl(
  props: { defaultValues?: Values } = {},
) {
  const _defaultValues: Values = { ...props.defaultValues };
  const _formValues: Values = { ..._defaultValues };
  // register(name).ref に渡された実際のDOMノード。書き込み先はここにしかない
  const _fields: Record<string, FieldRef> = {};
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

  const _updateIsDirty = () => {
    const isDirty = Object.keys(_formValues).some(
      (k) => _formValues[k] !== (_defaultValues[k] ?? ""),
    );
    if (isDirty !== _formState.isDirty) {
      _subjects.state.next({ isDirty });
    }
  };

  const onChange = (event: FieldEvent) => {
    const { name, value } = event.target;
    _formValues[name] = value;
    _updateIsDirty();
  };
  const register = (name: string) => {
    _formValues[name] ??= "";
    // Reactがこのノードを繋いだ／外したタイミングで呼ばれるコールバック
    const ref = (instance: FieldRef | null) => {
      if (instance) {
        _fields[name] = instance;
        instance.value = _formValues[name]; // 初期値をDOMへ書き込む
      } else {
        delete _fields[name]; // アンマウント：書き込み先を手放す
      }
    };
    return { name, onChange, ref };
  };
  const setValue = (name: string, value: string) => {
    _formValues[name] = value;
    const field = _fields[name];
    if (field) {
      field.value = value; // Reactを介さず、DOMノードへ直接書く
    }
    _updateIsDirty();
  };
  const setError = (name: string, message: string) =>
    _subjects.state.next({
      errors: { ..._formState.errors, [name]: message },
    });

  const control = {
    register, _subscribe, _subjects, _formValues, _fields, _proxyFormState,
    get _formState() { return _formState; },
  };
  return { control, register, setValue, setError };
}
