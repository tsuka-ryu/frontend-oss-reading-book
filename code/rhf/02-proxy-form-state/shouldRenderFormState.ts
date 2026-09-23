// 本物：src/logic/shouldRenderFormState.ts
import type { FormState, ProxyFormState } from "./createFormControl.ts";

export default function shouldRenderFormState(
  changed: Partial<FormState>,
  proxyFormState: ProxyFormState,
) {
  const keys = Object.keys(changed) as (keyof ProxyFormState)[];
  return keys.length === 0 || keys.some((key) => proxyFormState[key]);
}
