export { default } from "next-auth/middleware";

export const config = {
    // Protect all routes except the auth pages and api/auth
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|auth).*)"],
};
