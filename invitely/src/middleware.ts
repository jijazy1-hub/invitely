// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/events(.*)",
  "/guests(.*)",
  "/templates(.*)",
  "/analytics(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/api/events(.*)",
  "/api/webhooks/clerk(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/invite/(.*)",
  "/checkin/(.*)",
  "/api/invite/(.*)",
  "/api/checkin(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
