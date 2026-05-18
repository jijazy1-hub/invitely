#!/bin/bash
cat > /workspaces/invitely/invitely/src/middleware.ts << 'EOF'
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/events(.*)",
  "/guests(.*)",
  "/templates(.*)",
  "/billing(.*)",
  "/settings(.*)",
  "/api/events(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
EOF
echo "Done"