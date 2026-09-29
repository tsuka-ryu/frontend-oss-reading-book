// 本物：src/logic/shouldSubscribeByName.ts。
// 本物の既定は "." の境界を見ない startsWith の双方向。
// ミニ実装は境界を見る（本物では exact を渡したときの一方向に近い）。
const isAncestor = (parent: string, child: string) =>
  parent === child || child.startsWith(parent + ".");

export default function shouldSubscribeByName(
  name: string | undefined,
  signalName: string | undefined,
) {
  return (
    !name ||
    !signalName ||
    isAncestor(name, signalName) ||
    isAncestor(signalName, name)
  );
}
