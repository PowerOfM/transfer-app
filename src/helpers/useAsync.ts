import { DependencyList, useEffect, useState } from "react"

type AsyncState<T> = [T | undefined, boolean, Error | undefined];

export const useAsync = <T>(
  fn: () => Promise<T>,
  dependencies: DependencyList = [],
  onUnmount?: (value?: T) => void
) => {
  const [state, setState] = useState<AsyncState<T>>([
    undefined,
    true,
    undefined,
  ])

  useEffect(() => {
    let mounted = true
    let value: T | undefined

    fn()
      .then((result) => {
        value = result
        mounted && setState([result, false, undefined])
      })
      .catch((error) => mounted && setState([undefined, false, error]))

    return () => {
      mounted = false
      if (onUnmount) onUnmount(value)
    }
  }, dependencies) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
