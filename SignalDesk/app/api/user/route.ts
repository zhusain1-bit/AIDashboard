import { NextResponse } from "next/server";
import { normalizeUserDailyUsage } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { parseStoredSectors } from "@/lib/sectors";

export async function GET() {
  const user = await ensurePublicUser();
  const normalizedUser = await normalizeUserDailyUsage(user);

  return NextResponse.json({
    id: normalizedUser.id,
    email: normalizedUser.email,
    name: normalizedUser.name,
    isPro: normalizedUser.isPro,
    sectors: parseStoredSectors(normalizedUser.sectors),
    briefsToday: normalizedUser.briefsToday,
    dailyLimit: normalizedUser.isPro ? null : 3
  });
}
