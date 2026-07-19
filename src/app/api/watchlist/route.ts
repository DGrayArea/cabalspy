import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { createRouteLimiter } from "@/lib/rateLimit";

const readGuard = createRouteLimiter(60);
const writeGuard = createRouteLimiter(30);

export async function GET(req: NextRequest) {
  const limited = await readGuard(req);
  if (limited) return limited;

  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchlist = await db.watchlist.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(watchlist);
  } catch (error) {
    logger.error("Failed to fetch watchlist:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const limited = await writeGuard(req);
  if (limited) return limited;

  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mint, symbol, name, image, network } = body;

    if (!mint) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Upsert to handle potential duplicates gracefully
    const watchlistItem = await db.watchlist.upsert({
      where: {
        userId_mint: {
          userId: session.userId,
          mint,
        },
      },
      update: {
        symbol,
        name,
        image,
        network: network || "solana",
      },
      create: {
        userId: session.userId,
        mint,
        symbol,
        name,
        image,
        network: network || "solana",
      },
    });

    return NextResponse.json(watchlistItem);
  } catch (error) {
    logger.error("Failed to add to watchlist:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await writeGuard(req);
  if (limited) return limited;

  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mint = searchParams.get("mint");

    if (!mint) {
      return NextResponse.json(
        { error: "Missing mint parameter" },
        { status: 400 },
      );
    }

    await db.watchlist.delete({
      where: {
        userId_mint: {
          userId: session.userId,
          mint,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      // Record to delete does not exist, which is fine
      return NextResponse.json({ success: true });
    }
    logger.error("Failed to remove from watchlist:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
