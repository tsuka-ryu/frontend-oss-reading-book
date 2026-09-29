// 本物：src/logic/getProxyFormState.ts
import type { FormState, ProxyFormState } from "./createFormControl.ts";

export default function getProxyFormState(
  formState: FormState,
  proxyFormState: ProxyFormState,
) {
  const result = {} as FormState;
  for (const key of Object.keys(formState) as (keyof FormState)[]) {
    Object.defineProperty(result, key, {
      enumerable: true,
      get() {
        proxyFormState[key] = true;
        return formState[key];
      },
    });
  }
  return result;
}
