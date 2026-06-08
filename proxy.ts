import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Run middleware on all routes except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
