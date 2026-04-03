import { NextResponse } from "next/server";
import { normalizeUserDailyUsage } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { parseStoredSectors } from "@/lib/sectors";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

export async function GET() {
  const user = await ensurePublicUser();
  const normalizedUser = await normalizeUserDailyUsage(user);

  let searchHistory: string[] = [];

  if (!isServerlessSqliteRuntime()) {
    const searches = await prisma.search.findMany({
      where: { userId: normalizedUser.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const seen = new Set<string>();
    searchHistory = searches
      .filter((s) => {
        if (seen.has(s.query)) return false;
        seen.add(s.query);
        return true;
      })
      .slice(0, 5)
      .map((s) => s.query);
  }

  return NextResponse.json({
    id: normalizedUser.id,
    email: normalizedUser.email,
    name: normalizedUser.name,
    isPro: normalizedUser.isPro,
    sectors: parseStoredSectors(normalizedUser.sectors),
    briefsToday: normalizedUser.briefsToday,
    dailyLimit: normalizedUser.isPro ? null : 3,
    searchHistory
  });
}
