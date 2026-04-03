import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/queryParser";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { isServerlessSqliteRuntime } from "@/lib/runtime";

const FREE_DAILY_SEARCH_LIMIT = 3;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const user = await ensurePublicUser();

    if (!isServerlessSqliteRuntime()) {
      const todayStart = new Date(new Date().toISOString().slice(0, 10));

      const alreadySearchedToday = await prisma.search.findFirst({
        where: { userId: user.id, query, createdAt: { gte: todayStart } }
      });

      if (!alreadySearchedToday) {
        if (!user.isPro) {
          const uniqueSearchesToday = await prisma.search.count({
            where: { userId: user.id, createdAt: { gte: todayStart } }
          });

          if (uniqueSearchesToday >= FREE_DAILY_SEARCH_LIMIT) {
            return NextResponse.json(
              {
                error:
                  "Daily search limit reached. Upgrade to Pro for unlimited searches."
              },
              { status: 429 }
            );
          }
        }

        await prisma.search.create({ data: { userId: user.id, query } });
      }
    }

    const parsed = await parseQuery(query);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse query" }, { status: 500 });
  }
}
