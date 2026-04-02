export function isServerlessSqliteRuntime() {
  return process.env.VERCEL === "1";
}
