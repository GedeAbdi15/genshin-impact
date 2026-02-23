import { NextResponse } from "next/server";

export const revalidate = 3600;

type CharacterSearchItem = {
  id: number;
  name: string;
  rarity: string;
  weapon: string;
  vision: string;
  voice_actor: string[];
  region?: string[];
};

type CharacterSearchResponse = {
  page?: number;
  total_pages?: number;
  results: CharacterSearchItem[];
};

const REGION_CANDIDATES = ["Mondstadt", "Liyue", "Inazuma", "Sumeru"];

const SLUG_OVERRIDES: Record<string, string> = {
  Ayaka: "ayaka",
  Ayato: "ayato",
  Itto: "arataki-itto",
  Kazuha: "kazuha",
  Kokomi: "kokomi",
  Kuki: "kuki-shinobu",
  Sara: "sara",
  "Raiden Shogun": "raiden",
  "Hu Tao": "hu-tao",
  Yae: "yae-miko",
  "Traveller (male)": "traveler",
  "Traveller (female)": "traveler",
};

const IMAGE_TYPE_OVERRIDES: Record<string, "card" | "portrait"> = {
  // Some characters don't have card in specific datasets.
  thoma: "portrait",
};

const getApiBase = () => {
  return (process.env.API_BASE_URL || "https://gsi.fly.dev/").replace(
    /\/+$/,
    "",
  );
};

const toSlug = (name: string) => {
  if (SLUG_OVERRIDES[name]) {
    return SLUG_OVERRIDES[name];
  }
  return name
    .toLowerCase()
    .replace(/[()']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getCharacterImage = (name: string) => {
  const slug = toSlug(name);
  const imageType = IMAGE_TYPE_OVERRIDES[slug] || "card";
  return `https://genshin.jmp.blue/characters/${slug}/${imageType}`;
};

export async function GET() {
  const baseUrl = getApiBase();

  try {
    const regionPayload = await Promise.all(
      REGION_CANDIDATES.map(async (region) => {
        let searchRes: Response;
        try {
          searchRes = await fetch(
            `${baseUrl}/characters/search?region=${encodeURIComponent(region)}&limit=50&page=1`,
            {
              next: { revalidate: 3600 },
              signal: AbortSignal.timeout(7000),
            },
          );
        } catch {
          return { region, characters: [] as unknown[] };
        }

        if (!searchRes.ok) {
          return { region, characters: [] as unknown[] };
        }

        const searchData = (await searchRes.json()) as CharacterSearchResponse;
        const totalPages = Math.max(1, searchData.total_pages ?? 1);
        const allResults = [...searchData.results];

        if (totalPages > 1) {
          const pageResponses = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) => {
              const page = index + 2;
              return fetch(
                `${baseUrl}/characters/search?region=${encodeURIComponent(region)}&limit=50&page=${page}`,
                {
                  next: { revalidate: 3600 },
                  signal: AbortSignal.timeout(7000),
                },
              )
                .then(async (res) => {
                  if (!res.ok) {
                    return [] as CharacterSearchItem[];
                  }
                  const pageData =
                    (await res.json()) as CharacterSearchResponse;
                  return pageData.results ?? [];
                })
                .catch(() => [] as CharacterSearchItem[]);
            }),
          );

          pageResponses.forEach((list) => {
            allResults.push(...list);
          });
        }

        const uniqueResults = Array.from(
          new Map(allResults.map((item) => [item.id, item])).values(),
        );

        const detailList = uniqueResults.map((item) => ({
          id: item.id,
          name: item.name,
          subtitle: "Playable Character",
          rarity: Number(item.rarity.split("_")[0]) || 4,
          weapon: item.weapon,
          vision: item.vision,
          voice: item.voice_actor ?? "Unknown voice actor",
          image: getCharacterImage(item.name),
          region,
        }));

        return {
          region,
          characters: detailList,
        };
      }),
    );

    const regions = regionPayload.filter(
      (entry) => entry.characters.length > 0,
    );
    return NextResponse.json({ regions }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch carousel characters" },
      { status: 500 },
    );
  }
}
