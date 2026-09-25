// 本物：src/logic/createFormControl.ts。react は import しない。
import createSubject from "./createSubject.ts";
import shouldRenderFormState from "./shouldRenderFormState.ts";
import shouldSubscribeByName from "./shouldSubscribeByName.ts";

export type FormState = {
  isDirty: boolean;
  errors: Record<string, string>;
};
export type ProxyFormState = { isDirty: boolean; errors: boolean };
// 購読者が「読んだ」ことにするキー。isDirty・errors は formState 経由、
// values はControllerのように名前だけを頼りに直接申告する
export type ReadState = Partial<ProxyFormState & { values: boolean }>;
export type Values = Record<string, string>;
type FieldEvent = { target: { name: string; value: string } };
// register の ref が受け取る先。本物のDOMノードは必ずこの形を持つ
type FieldRef = { value: string };
// _subjects.state に流れる通知。name はあて先の絞り込み、
// values はControllerが読み直すためのスナップショット
type StateDiff = Partial<FormState> & { name?: string; values?: Values };

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
  const _subjects = { state: createSubject<StateDiff>() };
  // 通知された差分は、読まれたかどうかに関係なく _formState へ写す
  _subjects.state.subscribe({
    next: (s) => (_formState = { ..._formState, ...s }),
  });

  // formState を渡さない呼び出し（useForm本体）は _proxyFormState を見る。
  // Controllerのように名前だけで絞り込みたい購読者は formState で上書きする
  const _subscribe = (props: {
    name?: string;
    formState?: ReadState;
    callback: (diff: StateDiff) => void;
  }) =>
    _subjects.state.subscribe({
      next: (diff) => {
        if (
          shouldSubscribeByName(props.name, diff.name) &&
          shouldRenderFormState(diff, props.formState ?? _proxyFormState)
        ) {
          props.callback(diff);
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
  // register のControlled版。DOMノードを持たないため、
  // 値の変化を _subjects.state に name 付きで流し、読み直しを促す
  const controller = (name: string) => {
    _formValues[name] ??= "";
    const onChange = (value: string) => {
      _formValues[name] = value;
      _subjects.state.next({ name, values: { ..._formValues } });
      _updateIsDirty();
    };
    return { name, onChange };
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
    register, controller, _subscribe, _subjects,
    _formValues, _fields, _proxyFormState,
    get _formState() { return _formState; },
  };
  return { control, register, controller, setValue, setError };
}
