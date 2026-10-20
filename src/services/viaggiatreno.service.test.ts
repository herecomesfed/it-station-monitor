import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getStationInfo,
  fetchTrainDetails,
  findTrainDetails,
} from "./viaggiatreno.service";
import type { TrenitaliaTrainResponse } from "@/types/types";
import { ApiError } from "@/lib/api-error";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── getStationInfo ──────────────────────────────────────────────

describe("getStationInfo", () => {
  it("should return empty list for null train number", async () => {
    expect(await getStationInfo(null)).toEqual([]);
  });

  it("should return empty list for undefined train number", async () => {
    expect(await getStationInfo(undefined)).toEqual([]);
  });

  it("should return empty list for empty string train number", async () => {
    expect(await getStationInfo("")).toEqual([]);
  });

  it("should parse valid ViaggiaTreno response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        "2064 - ROMA TERMINI - Sat Mar 15 2026|2064-S08409-1710500400000\n",
    });

    const result = await getStationInfo("2064");
    expect(result).toEqual([
      {
        id: "S08409",
        timestamp: "1710500400000",
        originName: "ROMA TERMINI",
      },
    ]);
  });

  it("should parse every train when the number is shared", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        "25 - MILANO CADORNA - 20/10/26|25-S01066-1792447200000\n" +
        "25 - CHIASSO - 20/10/26|25-S01301-1792447200000\n",
    });

    const result = await getStationInfo("25");
    expect(result).toEqual([
      { id: "S01066", timestamp: "1792447200000", originName: "MILANO CADORNA" },
      { id: "S01301", timestamp: "1792447200000", originName: "CHIASSO" },
    ]);
  });

  it("should keep dashes inside station names", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        "1234 - ACQUEDOLCI-S.FRATELLO - 20/10/26|1234-S12345-1792447200000",
    });

    const [result] = await getStationInfo("1234");
    expect(result.originName).toBe("ACQUEDOLCI-S.FRATELLO");
  });

  it("should return empty list for empty API response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    expect(await getStationInfo("9999")).toEqual([]);
  });

  it("should throw ApiError on HTTP error instead of reporting not found", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
    });

    await expect(getStationInfo("2064")).rejects.toThrow("ViaggiaTreno HTTP 403");
  });

  it("should throw ApiError on network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getStationInfo("2064")).rejects.toThrow(ApiError);
  });

  it("should throw ApiError for malformed response without pipe", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "malformed response without pipe separator",
    });

    await expect(getStationInfo("2064")).rejects.toThrow(ApiError);
  });

  it("should throw ApiError if station info has too few parts", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "2064 - info|incomplete",
    });

    await expect(getStationInfo("2064")).rejects.toThrow(ApiError);
  });
});

// ─── fetchTrainDetails — Stop State Logic ────────────────────────

describe("fetchTrainDetails", () => {
  // Fixtures use March 2024 timestamps: freeze the clock so the ghost train filter keeps them
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(1710507600000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeFermata(overrides: Record<string, unknown> = {}) {
    return {
      stazione: "TEST STATION",
      partenza_teorica: 1710500400000,
      arrivo_teorico: null,
      programmata: null,
      partenzaReale: null,
      arrivoReale: null,
      ritardoPartenza: 0,
      ritardoArrivo: 0,
      binarioEffettivoPartenzaDescrizione: null,
      binarioEffettivoArrivoDescrizione: null,
      ...overrides,
    };
  }

  function mockTrainResponse(
    fermate: ReturnType<typeof makeFermata>[],
    overrides: Record<string, unknown> = {},
  ) {
    const response: TrenitaliaTrainResponse = {
      ritardo: 0,
      stazioneUltimoRilevamento: null,
      oraUltimoRilevamento: null,
      fermate,
      ...overrides,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(response),
    });
  }

  it("should mark all stops as UPCOMING when no real times exist", async () => {
    mockTrainResponse([
      makeFermata({ stazione: "A" }),
      makeFermata({ stazione: "B" }),
      makeFermata({ stazione: "C" }),
    ]);

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.stops).toHaveLength(3);
    expect(result?.stops.every((s) => s.state === "UPCOMING")).toBe(true);
  });

  it("should mark stops before current as PASSED", async () => {
    mockTrainResponse([
      makeFermata({ stazione: "A", partenzaReale: 1710500400000 }),
      makeFermata({ stazione: "B", partenzaReale: 1710504000000 }),
      makeFermata({ stazione: "C" }),
    ]);

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.stops[0].state).toBe("PASSED");
    expect(result?.stops[1].state).toBe("PASSED");
    expect(result?.stops[2].state).toBe("UPCOMING");
  });

  it("should mark stop as ACTIVE when it has arrivoReale but no partenzaReale and is not last stop", async () => {
    mockTrainResponse([
      makeFermata({ stazione: "A", partenzaReale: 1710500400000 }),
      makeFermata({ stazione: "B", arrivoReale: 1710504000000 }),
      makeFermata({ stazione: "C" }),
    ]);

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.stops[0].state).toBe("PASSED");
    expect(result?.stops[1].state).toBe("ACTIVE");
    expect(result?.stops[2].state).toBe("UPCOMING");
  });

  it("should mark last stop as PASSED when it has arrivoReale", async () => {
    mockTrainResponse([
      makeFermata({ stazione: "A", partenzaReale: 1710500400000 }),
      makeFermata({ stazione: "B", partenzaReale: 1710504000000 }),
      makeFermata({ stazione: "C", arrivoReale: 1710507600000 }),
    ]);

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.stops[0].state).toBe("PASSED");
    expect(result?.stops[1].state).toBe("PASSED");
    expect(result?.stops[2].state).toBe("PASSED");
  });

  it("should extract delay from ritardo field", async () => {
    mockTrainResponse(
      [
        makeFermata({
          stazione: "A",
          ritardoPartenza: 5,
          partenzaReale: 1710500700000,
        }),
      ],
      { ritardo: 5 },
    );

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.totalDelay).toBe(5);
    expect(result?.stops[0].delay).toBe(5);
  });

  it("should extract last detection info", async () => {
    mockTrainResponse([makeFermata()], {
      stazioneUltimoRilevamento: "ROMA TERMINI",
      oraUltimoRilevamento: 1710500400000,
    });

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.lastDetectionStation).toBe("ROMA TERMINI");
    expect(result?.lastDetectionTime).toBe(1710500400000);
  });

  it("should throw ApiError on HTTP error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(
      fetchTrainDetails("S001", "123", "1710500400000"),
    ).rejects.toThrow(ApiError);
  });

  it("should throw ApiError on empty response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    await expect(
      fetchTrainDetails("S001", "123", "1710500400000"),
    ).rejects.toThrow(ApiError);
  });

  it("should throw ApiError on non JSON response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "<html>Access Denied</html>",
    });

    await expect(
      fetchTrainDetails("S001", "123", "1710500400000"),
    ).rejects.toThrow(ApiError);
  });

  it("should treat '--' as no detection", async () => {
    mockTrainResponse([makeFermata()], { stazioneUltimoRilevamento: "--" });

    const result = await fetchTrainDetails("S001", "123", "1710500400000");

    expect(result?.lastDetectionStation).toBeNull();
  });

  it("should discard trains that terminated more than 3 hours ago", async () => {
    vi.setSystemTime(new Date(1710507600000 + 4 * 60 * 60 * 1000));
    mockTrainResponse([
      makeFermata({ stazione: "A", partenzaReale: 1710500400000 }),
      makeFermata({ stazione: "B", arrivoReale: 1710507600000 }),
    ]);

    expect(
      await fetchTrainDetails("S001", "123", "1710500400000"),
    ).toBeNull();
  });
});

// ─── findTrainDetails — Homonym trains ───────────────────────────

describe("findTrainDetails", () => {
  const candidates = [
    { id: "S01066", timestamp: "1792447200000", originName: "MILANO CADORNA" },
    { id: "S01301", timestamp: "1792447200000", originName: "CHIASSO" },
  ];

  function trainBody(stations: string[]) {
    return JSON.stringify({
      ritardo: 0,
      stazioneUltimoRilevamento: null,
      oraUltimoRilevamento: null,
      fermate: stations.map((stazione) => ({
        stazione,
        partenza_teorica: null,
        arrivo_teorico: null,
        programmata: null,
        partenzaReale: null,
        arrivoReale: null,
        ritardoPartenza: 0,
        ritardoArrivo: 0,
        binarioEffettivoPartenzaDescrizione: null,
        binarioEffettivoArrivoDescrizione: null,
      })),
    });
  }

  function mockByOrigin(bodies: Record<string, string>) {
    mockFetch.mockImplementation(async (url: string) => {
      const origin = Object.keys(bodies).find((id) => url.includes(`/${id}/`));
      return origin
        ? { ok: true, text: async () => bodies[origin] }
        : { ok: false, status: 500 };
    });
  }

  it("should use the candidate whose origin matches the hint without fetching the others", async () => {
    mockByOrigin({ S01301: trainBody(["CHIASSO", "COMO S.G."]) });

    const result = await findTrainDetails(candidates, "25", "Chiasso");

    expect(result?.stops[0].station).toBe("CHIASSO");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should pick the candidate that stops at the hinted destination", async () => {
    mockByOrigin({
      S01066: trainBody(["MILANO CADORNA", "SARONNO"]),
      S01301: trainBody(["CHIASSO", "COMO S.G."]),
    });

    const result = await findTrainDetails(candidates, "25", "Saronno");

    expect(result?.stops[0].station).toBe("MILANO CADORNA");
  });

  it("should fall back to the first available candidate", async () => {
    mockByOrigin({ S01301: trainBody(["CHIASSO", "COMO S.G."]) });

    const result = await findTrainDetails(candidates, "25", "Roma Termini");

    expect(result?.stops[0].station).toBe("CHIASSO");
  });

  it("should propagate the upstream error when every candidate fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(findTrainDetails(candidates, "25", null)).rejects.toThrow(
      "ViaggiaTreno HTTP 403",
    );
  });
});
