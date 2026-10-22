// Constants shared by the proxy and the session code (no server-only code, so importable anywhere).

const isProd = process.env.NODE_ENV === "production";

// In production the "__Host-" prefix forces Secure + path=/ + no domain, which makes the cookie harder to steal or overwrite.
export const SESSION_COOKIE = isProd ? "__Host-fcg_session" : "fcg_session";

export const ADMIN_PATH = "/admin";
export const LOGIN_PATH = "/admin/login";
export const SETUP_PATH = "/admin/setup";
