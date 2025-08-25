"use client"

import { useState, useCallback } from "react"

interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAsync<T>() {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null })
    try {
      const data = await asyncFunction()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}
