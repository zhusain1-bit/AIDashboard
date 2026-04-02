import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

const PUBLIC_USER_EMAIL = "guest@signaldesk.local";

export async function ensurePublicUser() {
  if (isServerlessSqliteRuntime()) {
    return {
      id: "public-user",
      email: PUBLIC_USER_EMAIL,
      name: "Guest Analyst",
      image: null,
      isPro: false,
      sectors: "Private Credit,IB M&A",
      briefsToday: 0,
      lastBriefDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date()
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: PUBLIC_USER_EMAIL
    }
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      email: PUBLIC_USER_EMAIL,
      name: "Guest Analyst",
      sectors: "Private Credit,IB M&A"
    }
  });
}
