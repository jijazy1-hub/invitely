cat > prisma.config.ts << 'EOF'
import path from 'path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter() {
      const { PrismaNeon } = await import('@prisma/adapter-neon')
      const { neon } = await import('@neondatabase/serverless')
      const connectionString = process.env.DIRECT_URL!
      const sql = neon(connectionString)
      return new PrismaNeon(sql)
    },
  },
})
EOF