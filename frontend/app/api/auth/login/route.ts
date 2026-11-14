import { NextRequest, NextResponse } from "next/server";

const backend = process.env.BACKEND_URL ?? "http://localhost:8000";

function landingError(request: NextRequest, message: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const url = new URL("/", host ? `${protocol}://${host}` : request.nextUrl.origin);
  url.searchParams.set("error", "sign_in_unavailable");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

function copyLoginCookie(source: Response, target: NextResponse) {
  const cookie = source.headers.get("set-cookie");
  if (cookie) target.headers.set("set-cookie", cookie);
}

async function backendMessage(response: Response) {
  try {
    const body = await response.clone().json() as { detail?: unknown; message?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (typeof body.message === "string") return body.message;
  } catch {
    const text = await response.text().catch(() => "");
    if (text.trim() && !text.trim().startsWith("<")) return text.trim();
  }
  return null;
}

/**
 * Starts OAuth without ever leaving the user on a raw backend JSON response.
 * Successful backend responses are redirects to Google; anything else becomes
 * a readable notice on the signed-out homepage.
 */
export async function GET(request: NextRequest) {
  const target = new URL("/auth/login", backend);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  let response: Response;
  try {
    response = await fetch(target, {
      cache: "no-store",
      headers: request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : undefined,
      redirect: "manual",
    });
  } catch {
    return landingError(request, "Google sign-in is temporarily unavailable because the Radar server is not responding.");
  }

  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    const redirect = NextResponse.redirect(new URL(location, target), response.status);
    copyLoginCookie(response, redirect);
    return redirect;
  }

  const backendDetail = await backendMessage(response);
  const message = response.status === 503 || backendDetail?.includes("GOOGLE_CLIENT")
    ? "Google sign-in is not configured for this preview yet. You can still explore the sample dashboard."
    : backendDetail;
  return landingError(
    request,
    message ?? "Google sign-in is not configured for this preview yet. You can still explore the sample dashboard.",
  );
}
