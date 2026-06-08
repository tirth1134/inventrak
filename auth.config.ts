import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration (no Node.js-only imports like Prisma or bcrypt).
 * Used by middleware.ts which runs at the Edge.
 */
export const authConfig = {
  useSecureCookies: false,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isAuthRoute = nextUrl.pathname.startsWith("/api/auth");
      const isUploadRoute = nextUrl.pathname.startsWith("/api/uploads");

      // Always allow NextAuth routes
      if (isAuthRoute) return true;

      // Protect all other /api/* routes
      if (isApiRoute && !isLoggedIn) return false;

      // Protect upload serving
      if (isUploadRoute && !isLoggedIn) return false;

      return true;
    },
  },
  providers: [], // Providers are configured in lib/auth.ts (Node.js runtime)
} satisfies NextAuthConfig;
