#!/bin/bash
sed -i 's|import prisma from "@/lib/prisma";|import prisma from "@/lib/prisma";\n\nexport const dynamic = "force-dynamic";|' /workspaces/invitely/invitely/src/app/api/events/\[eventId\]/analytics/route.ts
echo "Done"