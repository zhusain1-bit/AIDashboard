import FeedView from "@/components/FeedView";
import { normalizeUserDailyUsage } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { parseStoredSectors } from "@/lib/sectors";

export default async function FeedPage() {
  const user = await ensurePublicUser();

  const normalizedUser = await normalizeUserDailyUsage(user);

  const firstName = (normalizedUser.name ?? "there").split(" ")[0];
  const userInitials = (normalizedUser.name ?? "SD")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <main className="min-h-screen">
      <FeedView
        firstName={firstName}
        userInitials={userInitials}
        initialSectors={parseStoredSectors(normalizedUser.sectors)}
        isPro={normalizedUser.isPro}
        initialBriefsToday={normalizedUser.briefsToday}
      />
    </main>
  );
}
