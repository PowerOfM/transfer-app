import { useEffect, useState } from "react"

export class Signal<T> {
  private listeners: ((value: T) => void)[] = []
  private abortListeners: (() => void)[] = []
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

  public onAbort(listener: () => void) {
    this.abortListeners.push(listener)
    return () => this.unsubscribe(listener)
  }

  public destroy() {
    this.listeners = []
    this.abortListeners = []
    this._isAborted = true
  }

  public abort() {
    this._isAborted = true
    this.abortListeners.forEach((listener) => listener())
  }

  public emit(value: T) {
    this.listeners.forEach((listener) => listener(value))
  }
}

export const useSignal = <T>(signal?: Signal<T>) => {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    if (!signal) return
    const unsubscribe = signal.subscribe(setValue)
    const abortUnsubscribe = signal.onAbort(() => setValue(null))
    return () => {
      unsubscribe()
      abortUnsubscribe()
    }
  }, [signal])

  return value
}
