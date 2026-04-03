import { NextRequest, NextResponse } from "next/server";
import { getBriefsForSector, getBriefsForQuery } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { getSectorById } from "@/lib/sectors";

export async function GET(request: NextRequest) {
  const queryParam = request.nextUrl.searchParams.get("query");
  const sectorId = request.nextUrl.searchParams.get("sector") ?? "";

  const user = await ensurePublicUser();

  try {
    if (queryParam) {
      const result = await getBriefsForQuery({ query: queryParam, userId: user.id });
      return NextResponse.json(result);
    }

    if (!getSectorById(sectorId)) {
      return NextResponse.json({ error: "Invalid sector" }, { status: 400 });
    }

    const result = await getBriefsForSector({ sectorId, userId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load briefs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
