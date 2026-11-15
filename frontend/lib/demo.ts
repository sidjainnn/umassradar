import { api, ApiError, type Me } from "./api";

function temporaryConnectionError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof ApiError && error.status >= 500);
}

async function readDemoSession(): Promise<Me> {
  const me = await api<Me>("/me");
  if (!me.demo) throw new Error("The demo session wasn't created. Please try the demo button again.");
  return me;
}

async function readWithRetry(): Promise<Me> {
  try { return await readDemoSession(); }
  catch (error) {
    if (!temporaryConnectionError(error)) throw error;
    return readDemoSession();
  }
}

export async function enterDemo(): Promise<Me> {
  try { await api("/demo/load", { method: "POST" }); }
  catch (error) {
    if (!temporaryConnectionError(error)) throw error;
    // A dropped response can still leave a valid session. Check it before asking for another demo.
    try { return await readWithRetry(); } catch { throw error; }
  }
  return readWithRetry();
}
