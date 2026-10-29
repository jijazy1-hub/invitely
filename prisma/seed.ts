import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding system templates...");

  const templates = [
    {
      id: "classic-ivory-wedding",
      name: "Classic Ivory Wedding",
      description: "Elegant ivory and gold design, perfect for formal weddings",
      category: "WEDDING" as const,
      isPublic: true,
      config: { primaryColor: "#0A2810", secondaryColor: "#B8860B", accentColor: "#F8F4E3" },
    },
    {
      id: "modern-birthday",
      name: "Modern Birthday",
      description: "Vibrant and modern design for birthday celebrations",
      category: "BIRTHDAY" as const,
      isPublic: true,
      config: { primaryColor: "#7C3AED", secondaryColor: "#F59E0B", accentColor: "#FDF4FF" },
    },
    {
      id: "corporate-conference",
      name: "Corporate Conference",
      description: "Professional navy and silver for corporate events",
      category: "CONFERENCE" as const,
      isPublic: true,
      config: { primaryColor: "#1E3A5F", secondaryColor: "#94A3B8", accentColor: "#F8FAFC" },
    },
    {
      id: "vip-night",
      name: "VIP Night",
      description: "Black and gold luxury design for exclusive events",
      category: "VIP_PARTY" as const,
      isPublic: true,
      config: { primaryColor: "#111111", secondaryColor: "#D4A843", accentColor: "#1A1A1A" },
    },
    {
      id: "church-program",
      name: "Church Program",
      description: "Serene purple and white for church events",
      category: "CHURCH" as const,
      isPublic: true,
      config: { primaryColor: "#4C1D95", secondaryColor: "#C4B5FD", accentColor: "#FAF5FF" },
    },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: {},
      create: t,
    });
  }

  console.log("Done seeding templates.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
