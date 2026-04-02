import { NextRequest, NextResponse } from "next/server";
import { ensurePublicUser } from "@/lib/public-user";
import { prisma } from "@/lib/prisma";
import { getSectorById, parseStoredSectors, serializeSectors } from "@/lib/sectors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { sectors?: string[] };
    const sectors = Array.isArray(body.sectors) ? Array.from(new Set(body.sectors)) : [];

    if (sectors.length === 0 || sectors.some((sectorId) => !getSectorById(sectorId))) {
      return NextResponse.json({ error: "Invalid sectors" }, { status: 400 });
    }

    const user = await ensurePublicUser();

    if (!user.isPro && sectors.length > 2) {
      return NextResponse.json(
        {
          error: "upgrade",
          message: "Free users can track up to 2 sectors. Upgrade to Pro to unlock all 8."
        },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        sectors: serializeSectors(sectors)
      }
    });

    return NextResponse.json({
      success: true,
      sectors: parseStoredSectors(updated.sectors)
    });
  } catch {
    return NextResponse.json({ error: "Unable to update sectors" }, { status: 500 });
  }
}
