import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth"; // Assuming this helper exists to get userId from session

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchlist = await db.watchlist.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(watchlist);
  } catch (error) {
    console.error("[WATCHLIST_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mint, symbol, name, image, network } = body;

    if (!mint) {
      return NextResponse.json({ error: "Mint address is required" }, { status: 400 });
    }

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
    console.error("[WATCHLIST_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mint = searchParams.get("mint");

    if (!mint) {
      return NextResponse.json({ error: "Mint address is required" }, { status: 400 });
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
  } catch (error) {
    console.error("[WATCHLIST_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
