// 本物：src/logic/shouldRenderFormState.ts
import type { FormState, ReadState, Values } from "./createFormControl.ts";

export default function shouldRenderFormState(
  changed: Partial<FormState> & { name?: string; values?: Values },
  proxyFormState: ReadState,
) {
  // name は通知のあて先を絞るための情報であり、読んだキーの記録ではない
  const keys = (Object.keys(changed) as (keyof typeof changed)[])
    .filter((key) => key !== "name");
  return keys.length === 0 ||
    keys.some((key) => proxyFormState[key as keyof ReadState]);
}
