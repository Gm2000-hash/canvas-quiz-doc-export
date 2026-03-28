/**
 * Structured logging wrapper for edge functions.
 * Logs request method, status, duration, and errors as JSON to stdout.
 */
export function withLogging(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    const start = performance.now();
    const method = req.method;

    // Skip logging for preflight requests
    if (method === "OPTIONS") {
      return handler(req);
    }

    let status = 500;
    try {
      const response = await handler(req);
      status = response.status;
      return response;
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          function: functionName,
          method,
          status,
          duration_ms: Math.round(performance.now() - start),
          error: error instanceof Error ? error.message : "Unknown error",
          ts: new Date().toISOString(),
        }),
      );
      throw error;
    } finally {
      const duration = Math.round(performance.now() - start);
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      console.log(
        JSON.stringify({
          level,
          function: functionName,
          method,
          status,
          duration_ms: duration,
          ts: new Date().toISOString(),
        }),
      );
    }
  };
}
