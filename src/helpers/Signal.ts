import { useEffect, useState } from "react"

export class Signal<T> {
  private listeners: ((value: T) => void)[] = []
  private _isAborted = false

  public get isAborted() {
    return this._isAborted
  }

  public subscribe(listener: (value: T) => void) {
    this.listeners.push(listener)
    return () => this.unsubscribe(listener)
  }

  public unsubscribe(listener: (value: T) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  public destroy() {
    this.listeners = []
    this._isAborted = true
  }

  public abort() {
    this._isAborted = true
  }

  public emit(value: T) {
    this.listeners.forEach((listener) => listener(value))
  }
}

export const useSignal = <T>(signal: Signal<T>) => {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => signal.subscribe(setValue), [signal])

  return value
}
