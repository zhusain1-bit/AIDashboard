import { NextResponse } from "next/server";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

export async function GET() {
  if (isServerlessSqliteRuntime()) {
    return NextResponse.json([]);
  }

  const user = await ensurePublicUser();

  const searches = await prisma.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const seen = new Set<string>();
  const history = searches
    .filter((s) => {
      if (seen.has(s.query)) return false;
      seen.add(s.query);
      return true;
    })
    .slice(0, 10)
    .map((s) => s.query);

  return NextResponse.json(history);
}
