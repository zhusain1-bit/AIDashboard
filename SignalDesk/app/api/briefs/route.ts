import { NextRequest, NextResponse } from "next/server";
import { getBriefsForSector } from "@/lib/briefs";
import { ensurePublicUser } from "@/lib/public-user";
import { getSectorById } from "@/lib/sectors";

export async function GET(request: NextRequest) {
  const sectorId = request.nextUrl.searchParams.get("sector") ?? "";
  if (!getSectorById(sectorId)) {
    return NextResponse.json({ error: "Invalid sector" }, { status: 400 });
  }

  try {
    const user = await ensurePublicUser();
    const result = await getBriefsForSector({
      sectorId,
      userId: user.id
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load briefs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
