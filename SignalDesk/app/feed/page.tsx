import FeedView from "@/components/FeedView";
import { normalizeUserDailyUsage } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

export default async function FeedPage() {
  const user = await ensurePublicUser();
  const normalizedUser = await normalizeUserDailyUsage(user);

  const firstName = (normalizedUser.name ?? "there").split(" ")[0];
  const userInitials = (normalizedUser.name ?? "SD")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  let searchHistory: string[] = [];

  if (!isServerlessSqliteRuntime()) {
    const recentSearches = await prisma.search.findMany({
      where: { userId: normalizedUser.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const seen = new Set<string>();
    searchHistory = recentSearches
      .filter((s) => {
        if (seen.has(s.query)) return false;
        seen.add(s.query);
        return true;
      })
      .slice(0, 10)
      .map((s) => s.query);
  }

  return (
    <main className="min-h-screen">
      <FeedView
        firstName={firstName}
        userInitials={userInitials}
        isPro={normalizedUser.isPro}
        initialBriefsToday={normalizedUser.briefsToday}
        initialSearchHistory={searchHistory}
      />
    </main>
  );
}
