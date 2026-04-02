import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await prisma.waitlist.upsert({
      where: { email },
      update: {},
      create: { email }
    });

    const count = await prisma.waitlist.count();
    return NextResponse.json({ success: true, count });
  } catch {
    return NextResponse.json({ error: "Unable to join the waitlist." }, { status: 500 });
  }
}
