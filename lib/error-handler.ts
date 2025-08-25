import { toast } from "@/hooks/use-toast"

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function handleError(error: unknown, context?: string) {
  console.error(`[${context || "App"}] Error:`, error)

  if (error instanceof AppError) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    })
    return
  }

  if (error instanceof Error) {
    toast({
      title: "Error inesperado",
      description: error.message,
      variant: "destructive",
    })
    return
  }

  toast({
    title: "Error",
    description: "Ha ocurrido un error inesperado",
    variant: "destructive",
  })
}

export function createAsyncHandler<T extends any[], R>(fn: (...args: T) => Promise<R>, context?: string) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, context)
      return undefined
    }
  }
}
