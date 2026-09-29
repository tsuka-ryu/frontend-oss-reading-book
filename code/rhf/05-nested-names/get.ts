// 本物：src/utils/get.ts（ミニ実装は "." 区切りだけを扱う）
export default function get(object: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<any>((result, key) => result?.[key], object);
}
