import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStationInfo, fetchTrainDetails } from "./viaggiatreno.service";
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
  it("should return null for null train number", async () => {
    expect(await getStationInfo(null)).toBeNull();
  });

  it("should return null for undefined train number", async () => {
    expect(await getStationInfo(undefined)).toBeNull();
  });

  it("should return null for empty string train number", async () => {
    expect(await getStationInfo("")).toBeNull();
  });

  it("should parse valid ViaggiaTreno response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        "2064 - ROMA TERMINI - Sat Mar 15 2026|2064-S08409-1710500400000\n",
    });

    const result = await getStationInfo("2064");
    expect(result).toEqual({
      id: "S08409",
      timestamp: "1710500400000",
    });
  });

  it("should return null for empty API response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "",
    });

    expect(await getStationInfo("9999")).toBeNull();
  });

  it("should return null for HTTP error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    expect(await getStationInfo("2064")).toBeNull();
  });

  it("should return null for malformed response without pipe", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "malformed response without pipe separator",
    });

    expect(await getStationInfo("2064")).toBeNull();
  });

  it("should return null if station info has too few parts", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => "2064 - info|incomplete",
    });

    expect(await getStationInfo("2064")).toBeNull();
  });
});

// ─── fetchTrainDetails — Stop State Logic ────────────────────────

describe("fetchTrainDetails", () => {
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
});
