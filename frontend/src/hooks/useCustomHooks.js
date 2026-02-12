import { useState, useEffect, useCallback } from "react";

/**
 * Debounce hook - delays value updates to reduce re-renders
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds (default 300)
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * LocalStorage hook with automatic sync
 * @param {string} key - Storage key
 * @param {any} initialValue - Initial/default value
 * @returns {[any, Function]} [value, setValue]
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.error(`Error reading localStorage key "${key}":`, e);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (e) {
      console.error(`Error setting localStorage key "${key}":`, e);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * Online status hook - detects network connectivity
 * @returns {boolean} isOnline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Keyboard shortcut hook
 * @param {string} key - Key to listen for
 * @param {Function} callback - Function to call
 * @param {Object} opts - Options { ctrl, shift, alt }
 */
export function useKeyboardShortcut(key, callback, opts = {}) {
  useEffect(() => {
    const handler = (e) => {
      const { ctrl = false, shift = false, alt = false } = opts;
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === ctrl &&
        e.shiftKey === shift &&
        e.altKey === alt
      ) {
        e.preventDefault();
        callback(e);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, opts]);
}
