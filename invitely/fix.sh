#!/bin/bash
BASE="/workspaces/invitely/invitely/src/app/api"

# Add force-dynamic to every API route that doesn't have it
for f in $(find $BASE -name "route.ts" -o -name "route.tsx"); do
  if ! grep -q "force-dynamic" "$f"; then
    echo 'export const dynamic = "force-dynamic";' | cat - "$f" > /tmp/tmp_route && mv /tmp/tmp_route "$f"
    echo "Fixed: $f"
  fi
done

echo "All done!"