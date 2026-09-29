// 本物：src/utils/set.ts
export default function set(
  object: Record<string, any>,
  path: string,
  value: unknown,
) {
  const keys = path.split(".");
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      object[key] = value;
      return;
    }
    // 途中の枝がなければ作る。次の鍵が数字なら配列、そうでなければオブジェクト
    object[key] ??= isNaN(+keys[i + 1]) ? {} : [];
    object = object[key];
  });
}
