import { DependencyList, useEffect, useState } from "react";

type AsyncState<T> = [T | undefined, boolean, Error | undefined];

export const useAsync = <T>(
  fn: () => Promise<T>,
  dependencies?: DependencyList
) => {
  const [state, setState] = useState<AsyncState<T>>([
    undefined,
    true,
    undefined,
  ]);

  useEffect(() => {
    let mounted = true;
    fn()
      .then((value) => mounted && setState([value, false, undefined]))
      .catch((error) => mounted && setState([undefined, false, error]));

    return () => {
      mounted = false;
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
};
