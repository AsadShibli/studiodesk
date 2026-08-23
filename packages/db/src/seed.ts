import "dotenv/config";
import bcrypt from "bcryptjs";
import { Plan, Role } from "@prisma/client";
import { prisma } from "./client";

const DEMO_PASSWORD = "demo1234";

async function upsertUser(email: string, name: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash },
  });
}

async function main() {
  const owner = await upsertUser("owner@demo", "Ava Owner");
  const manager = await upsertUser("manager@demo", "Max Manager");
  const staff = await upsertUser("staff@demo", "Sam Staff");
  const clientUser = await upsertUser("client@demo", "Casey Client");

  const org = await prisma.org.upsert({
    where: { slug: "northshore" },
    update: { name: "Northshore Studio", plan: Plan.free },
    create: { name: "Northshore Studio", slug: "northshore", plan: Plan.free },
  });

  const members: { userId: string; role: Role }[] = [
    { userId: owner.id, role: Role.owner },
    { userId: manager.id, role: Role.manager },
    { userId: staff.id, role: Role.staff },
    { userId: clientUser.id, role: Role.client },
  ];

  for (const m of members) {
    await prisma.membership.upsert({
      where: { userId_orgId: { userId: m.userId, orgId: org.id } },
      update: { role: m.role },
      create: { userId: m.userId, orgId: org.id, role: m.role },
    });
  }

  const casey = await prisma.client.upsert({
    where: { orgId_email: { orgId: org.id, email: "casey@example.com" } },
    update: { userId: clientUser.id, name: "Casey Client" },
    create: {
      orgId: org.id,
      name: "Casey Client",
      email: "casey@example.com",
      notes: "Portal user from seed.",
      userId: clientUser.id,
    },
  });

  const existing = await prisma.booking.findFirst({
    where: { orgId: org.id, clientId: casey.id },
  });
  if (!existing) {
    const start = new Date();
    start.setDate(start.getDate() + 2);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);
    await prisma.booking.create({
      data: {
        orgId: org.id,
        clientId: casey.id,
        staffId: staff.id,
        startAt: start,
        endAt: end,
        title: "Intro session",
      },
    });
  }

  // Second studio: owner can switch orgs. Harbor is Pro so invoicing
  // appears after switch — the flag follows the org, not the user.
  const harbor = await prisma.org.upsert({
    where: { slug: "harbor" },
    update: { name: "Harbor Atelier" },
    create: { name: "Harbor Atelier", slug: "harbor", plan: Plan.pro },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: owner.id, orgId: harbor.id } },
    update: { role: Role.owner },
    create: { userId: owner.id, orgId: harbor.id, role: Role.owner },
  });
  await prisma.client.upsert({
    where: { orgId_email: { orgId: harbor.id, email: "lin@harbor.example" } },
    update: { name: "Lin Park" },
    create: {
      orgId: harbor.id,
      name: "Lin Park",
      email: "lin@harbor.example",
      notes: "Only in Harbor — switching studios must not show Northshore clients.",
    },
  });

  console.log("Seeded Northshore (Free) + Harbor (Pro). Password: demo1234");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
