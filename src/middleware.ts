import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/events(.*)",
  "/guests(.*)",
  "/templates(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/analytics(.*)",
  "/admin(.*)",
  "/api/events(.*)",
  "/api/admin(.*)",
  "/api/billing/checkout(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
