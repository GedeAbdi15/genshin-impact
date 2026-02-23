"use client";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Carousel, Spin } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Character = {
  id: number;
  name: string;
  subtitle: string;
  rarity: number;
  weapon: string;
  vision: string;
  voice: string[];
  image: string;
  region: string;
};

type RegionGroup = {
  region: string;
  characters: Character[];
};

const REGION_BACKGROUNDS: Record<string, string> = {
  Mondstadt: "/mondstadt.jpg",
  Liyue: "/liyue.jpg",
  Inazuma: "/inazuma.jpg",
  Snezhnaya: "/snezhnaya.jpg",
};

const HomeClient = () => {
  const carouselRef = useRef<CarouselRef | null>(null);
  const regionTransitionTimer = useRef<NodeJS.Timeout | null>(null);
  const [regions, setRegions] = useState<RegionGroup[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRegionSwitching, setIsRegionSwitching] = useState(false);
  const [voiceById, setVoiceById] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/carousel-characters");
        if (!res.ok) {
          throw new Error("Failed to load character data");
        }

        const data = (await res.json()) as { regions: RegionGroup[] };
        setRegions(data.regions);
        setSelectedRegion(data.regions[0]?.region ?? "");
      } catch {
        setError("Data karakter gagal dimuat.");
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const currentCharacters = useMemo(() => {
    return (
      regions.find((item) => item.region === selectedRegion)?.characters ?? []
    );
  }, [regions, selectedRegion]);

  const safeActiveIndex = currentCharacters.length
    ? activeIndex % currentCharacters.length
    : 0;
  const currentCharacter = currentCharacters[safeActiveIndex];
  const currentVoice =
    (currentCharacter ? voiceById[currentCharacter.id] : undefined) ||
    currentCharacter?.voice ||
    "Unknown voice actor";
  const mainBackground = useMemo(() => {
    const imagePath = REGION_BACKGROUNDS[selectedRegion];
    if (!imagePath) {
      return "radial-gradient(circle at top,#24324a,#0b1020 40%,#070b14)";
    }

    return `linear-gradient(rgba(7, 11, 20, 0.65), rgba(7, 11, 20, 0.82)), url('${imagePath}')`;
  }, [selectedRegion]);

  useEffect(() => {
    if (!currentCharacters.length) {
      return;
    }

    currentCharacters.forEach((character) => {
      const image = new window.Image();
      image.src = character.image;
      image.decoding = "async";
    });
  }, [currentCharacters]);

  useEffect(() => {
    if (!currentCharacters.length) {
      return;
    }

    const next =
      currentCharacters[(safeActiveIndex + 1) % currentCharacters.length];
    const prev =
      currentCharacters[
        (safeActiveIndex - 1 + currentCharacters.length) %
          currentCharacters.length
      ];

    [next, prev].forEach((character) => {
      const image = new window.Image();
      image.src = character.image;
      image.decoding = "async";
    });
  }, [currentCharacters, safeActiveIndex]);

  useEffect(() => {
    return () => {
      if (regionTransitionTimer.current) {
        clearTimeout(regionTransitionTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    carouselRef.current?.goTo(0, true);
  }, [selectedRegion]);

  useEffect(() => {
    if (!currentCharacter || voiceById[currentCharacter.id]) {
      return;
    }

    const controller = new AbortController();
    const fetchVoiceActor = async () => {
      try {
        const res = await fetch(`/api/character-voice/${currentCharacter.id}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as { voice?: string };
        if (!data.voice) {
          return;
        }

        setVoiceById((prev) => ({
          ...prev,
          [currentCharacter.id]: data.voice!,
        }));
      } catch {
        // Keep default voice label when detail fetch fails.
      }
    };

    fetchVoiceActor();
    return () => controller.abort();
  }, [currentCharacter, voiceById]);

  const changeSlide = (direction: "next" | "prev") => {
    if (!currentCharacters.length) {
      return;
    }

    if (direction === "next") {
      carouselRef.current?.next();
      return;
    }

    carouselRef.current?.prev();
  };

  const changeRegion = (region: string) => {
    if (region === selectedRegion || isRegionSwitching) {
      return;
    }

    setIsRegionSwitching(true);
    if (regionTransitionTimer.current) {
      clearTimeout(regionTransitionTimer.current);
    }

    regionTransitionTimer.current = setTimeout(() => {
      setSelectedRegion(region);
      regionTransitionTimer.current = setTimeout(() => {
        setIsRegionSwitching(false);
      }, 140);
    }, 140);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#24324a,#0b1020_40%,#070b14)] text-slate-100">
        <Spin size="large" description="Loading characters..." />
      </main>
    );
  }

  if (error || !currentCharacter) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#24324a,#0b1020_40%,#070b14)] text-slate-100">
        <p className="text-lg">{error || "Data karakter tidak tersedia."}</p>
      </main>
    );
  }

  return (
    <main
      className="flex md:h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-4 text-slate-100 transition-[background-image] duration-500 md:px-10 md:py-6"
      style={{ backgroundImage: mainBackground }}
    >
      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 rounded-3xl border border-slate-300/20 bg-slate-900/50 p-4 shadow-2xl backdrop-blur-sm md:h-[calc(100vh-3rem)] md:grid-cols-[260px_1fr] md:gap-8 md:p-8">
        <aside className="space-y-4 overflow-y-auto pr-1">
          <h1 className="text-center text-2xl font-semibold tracking-wide">
            Select Region
          </h1>
          {regions.map((group) => (
            <button
              key={group.region}
              type="button"
              onClick={() => changeRegion(group.region)}
              className={`block w-full rounded-xl border px-4 py-5 text-left transition-all duration-300 ${
                selectedRegion === group.region
                  ? "border-amber-300 bg-amber-200/10 shadow-lg shadow-amber-300/20"
                  : "border-slate-300/30 bg-slate-900/40 hover:border-slate-100/60 hover:bg-slate-100/10"
              }`}
            >
              <p className="text-lg font-semibold">{group.region}</p>
              <p className="text-sm text-slate-300">
                {group.characters.length} characters
              </p>
            </button>
          ))}
        </aside>

        <Spin
          spinning={isRegionSwitching}
          description="Loading region..."
          className="h-full"
        >
          <article
            className={`relative h-full overflow-hidden rounded-2xl border-4 border-slate-200/70 bg-slate-950/30 transition-opacity duration-300 ${
              isRegionSwitching ? "opacity-70" : "opacity-100"
            }`}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-2 md:px-4">
              <Button
                shape="circle"
                icon={<LeftOutlined />}
                onClick={() => changeSlide("prev")}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center border border-slate-200/60 bg-slate-900/80 text-base text-white transition hover:bg-slate-700 md:h-12 md:w-12 md:text-lg"
                aria-label="Previous character"
              />

              <Button
                shape="circle"
                icon={<RightOutlined />}
                onClick={() => changeSlide("next")}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center border border-slate-200/60 bg-slate-900/80 text-base text-white transition hover:bg-slate-700 md:h-12 md:w-12 md:text-lg"
                aria-label="Next character"
              />
            </div>

            <div className="grid h-full grid-cols-1 items-center gap-4 p-4 md:grid-cols-[1fr_1.05fr] md:p-8">
              <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-100/20 bg-slate-800/40 md:h-full">
                <Carousel
                  ref={carouselRef}
                  dots={false}
                  speed={420}
                  adaptiveHeight={false}
                  afterChange={setActiveIndex}
                >
                  {currentCharacters.map((character) => (
                    <div key={character.id}>
                      <Image
                        src={character.image}
                        alt={character.name}
                        width={500}
                        height={500}
                        className="h-80 w-full object-cover object-top md:h-[calc(100vh-11rem)]"
                        unoptimized
                      />
                    </div>
                  ))}
                </Carousel>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200/20 bg-slate-900/55 p-5 md:p-8">
                <p className="text-center md:text-left text-sm uppercase tracking-[0.2em] text-amber-200">
                  {selectedRegion}
                </p>
                <h2 className="text-center md:text-left text-3xl font-bold md:text-5xl text-white">
                  {currentCharacter.name}
                </h2>
                <p className="text-center md:text-left text-slate-300">
                  {currentCharacter.subtitle}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm md:text-base">
                  <div className="rounded-lg border border-slate-400/30 bg-slate-800/40 p-3">
                    <p className="text-slate-300">Rarity</p>
                    <p className="font-semibold text-amber-200">
                      {"*".repeat(currentCharacter.rarity)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-400/30 bg-slate-800/40 p-3">
                    <p className="text-slate-300">Weapon</p>
                    <p className="font-semibold text-white">
                      {currentCharacter.weapon}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-400/30 bg-slate-800/40 p-3">
                    <p className="text-slate-300">Vision</p>
                    <p className="font-semibold text-white">
                      {currentCharacter.vision}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-400/30 bg-slate-800/40 p-3">
                    <p className="text-slate-300">Voice Actor</p>
                    <p className="font-semibold text-white">{currentVoice}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-3 inset-x-3 z-20 md:bottom-4 md:inset-x-8">
              <div className="mx-auto flex w-full justify-center gap-1 px-1 py-1 md:gap-2">
                {currentCharacters.map((character, index) => (
                  <button
                    key={character.id}
                    type="button"
                    aria-label={`Slide ${index + 1}`}
                    onClick={() => carouselRef.current?.goTo(index)}
                    className={`h-1.5 w-3 rounded-full transition-all md:h-2.5 md:w-8 ${
                      index === safeActiveIndex
                        ? "bg-amber-300"
                        : "bg-slate-200/40 hover:bg-slate-200/70"
                    }`}
                  />
                ))}
              </div>
            </div>
          </article>
        </Spin>
      </section>
    </main>
  );
};

export default HomeClient;
