import { NextResponse } from 'next/server';

/**
 * A centralized error handler for API routes.
 * Logs the error to the console and returns a standardized JSON response.
 * @param error - The error object, preferably an instance of Error.
 * @returns A NextResponse object with a 500 status code and JSON error message.
 */
export function errorHandler(error: unknown) {
  // Log the full error to the server console for debugging
  console.error("API Route Error:", error);

  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected internal server error occurred.';

  return new NextResponse(
    JSON.stringify({
      error: {
        message: message,
      },
    }),
    { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

