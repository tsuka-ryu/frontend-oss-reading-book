// 本物：src/utils/createSubject.ts
type Observer<T> = { next: (value: T) => void };

export default function createSubject<T>() {
  let _observers: Observer<T>[] = [];
  const next = (value: T) => {
    for (const observer of _observers) observer.next(value);
  };
  const subscribe = (observer: Observer<T>) => {
    _observers.push(observer);
    const unsubscribe = () => {
      _observers = _observers.filter((o) => o !== observer);
    };
    return { unsubscribe };
  };
  return { next, subscribe };
}
