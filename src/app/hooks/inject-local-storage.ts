import {effect, signal, WritableSignal} from "@angular/core";

export function injectLocalStorage<T>(key: string, defaultValue: T | null = null): WritableSignal<T> {
    const storedValue = localStorage.getItem(key)
    const dataSignal = signal(storedValue ? JSON.parse(storedValue) : defaultValue)
    effect(() => localStorage.setItem(key, JSON.stringify(dataSignal())))
    return dataSignal
}
