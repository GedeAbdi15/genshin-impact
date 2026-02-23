import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const revalidate = 3600;

type CharacterDetailResponse = {
  result?: {
    voice_actors?: Array<{
      English?: string;
    }>;
  };
};

const getApiBase = () => {
  return (process.env.API_BASE_URL || "https://gsi.fly.dev/").replace(
    /\/+$/,
    "",
  );
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json(
      { message: "Invalid character id" },
      { status: 400 },
    );
  }

  try {
    const baseUrl = getApiBase();
    const detailRes = await fetch(`${baseUrl}/characters/${numericId}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(7000),
    });

    if (!detailRes.ok) {
      return NextResponse.json(
        { message: "Character detail not found" },
        { status: 404 },
      );
    }

    const detailData = (await detailRes.json()) as CharacterDetailResponse;
    const voice =
      detailData.result?.voice_actors?.[0]?.English || "Unknown voice actor";

    return NextResponse.json({ voice }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch character voice actor" },
      { status: 500 },
    );
  }
}
