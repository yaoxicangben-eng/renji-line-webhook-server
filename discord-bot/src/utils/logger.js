export function createLogger(scope) {
  function write(level, message) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level, scope, message }));
  }

  return {
    info: (message) => write("info", message),
    warn: (message) => write("warn", message),
    error: (message) => write("error", message),
  };
}
