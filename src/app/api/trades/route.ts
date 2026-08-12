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

    const { searchParams } = new URL(req.url);
    const mint = searchParams.get("mint");

    const whereClause: any = { userId: session.userId };
    if (mint) {
      whereClause.tokenMint = mint;
    }

    const trades = await db.tradeHistory.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
      take: 200, // Limit to recent 200 trades
    });

    return NextResponse.json(trades);
  } catch (error: any) {
    console.error("GET /api/trades error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
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

    // Only verified users may record trades
    const actor = await db.user.findUnique({ where: { id: session.userId } });
    if (!actor || (actor.accessLevel !== "holder" && actor.accessLevel !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      tokenMint,
      symbol,
      direction,
      amount,
      output,
      priceUsd,
      outAmountUsd,
      feesSOL,
      feesBps,
      signature,
      status,
      timestamp,
    } = body;

    if (!tokenMint || !symbol || !direction || !amount || !output || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert to handle potential duplicates gracefuly if client retries
    const tradeItem = await db.tradeHistory.upsert({
      where: { id: id },
      update: {
        tokenMint,
        symbol,
        direction,
        amount,
        output,
        priceUsd: priceUsd || null,
        outAmountUsd: outAmountUsd ?? null,
        feesSOL: feesSOL ?? null,
        feesBps: feesBps ?? null,
        signature: signature || null,
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
      create: {
        id: id,
        userId: session.userId,
        tokenMint,
        symbol,
        direction,
        amount,
        output,
        priceUsd: priceUsd || null,
        outAmountUsd: outAmountUsd ?? null,
        feesSOL: feesSOL ?? null,
        feesBps: feesBps ?? null,
        signature: signature || null,
        status,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    return NextResponse.json(tradeItem);
  } catch (error: any) {
    console.error("POST /api/trades error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    await db.tradeHistory.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      // Record to delete does not exist, which is fine
      return NextResponse.json({ success: true });
    }
    logger.error("Failed to delete trade:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
