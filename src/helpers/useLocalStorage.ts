import { useEffect, useState } from "react"

export const useLocalStorage = (
  key: string,
  initialValue: string
): [string, (value: string) => void] => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    const storedValue = localStorage.getItem(key)
    if (storedValue) {
      setValue(storedValue)
    }
  }, [key])

  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])

  return [value, setValue]
}
