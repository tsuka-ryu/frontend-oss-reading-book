// 本物：src/logic/shouldSubscribeByName.ts。
// 本物は前方一致で "addresses" と "addresses.0.city" のような
// 入れ子・配列のパスも一致させるが、ミニ実装は完全一致のみ扱う。
export default function shouldSubscribeByName(
  name: string | undefined,
  signalName: string | undefined,
) {
  return !name || !signalName || name === signalName;
}
