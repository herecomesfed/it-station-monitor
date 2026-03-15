import { describe, it, expect } from "vitest";
import { extractStops } from "./rfi.service";

describe("extractStops", () => {
  it("should return empty array for undefined input", () => {
    expect(extractStops(undefined)).toEqual([]);
  });

  it("should return empty array for empty string", () => {
    expect(extractStops("")).toEqual([]);
  });

  it("should parse a single stop with dot-formatted time", () => {
    const result = extractStops("FERMA A: ROMA TERMINI (14.30)");
    expect(result).toEqual([
      { stop: "ROMA TERMINI", hour: "14:30" },
    ]);
  });

  it("should parse a single stop with colon-formatted time", () => {
    const result = extractStops("FERMA A: MILANO CENTRALE (08:15)");
    expect(result).toEqual([
      { stop: "MILANO CENTRALE", hour: "08:15" },
    ]);
  });

  it("should parse multiple stops separated by dashes", () => {
    const result = extractStops(
      "FERMA A: FIRENZE S.M.N. (10.00) - BOLOGNA CENTRALE (11.30) - MILANO CENTRALE (13.05)",
    );
    expect(result).toEqual([
      { stop: "FIRENZE S.M.N.", hour: "10:00" },
      { stop: "BOLOGNA CENTRALE", hour: "11:30" },
      { stop: "MILANO CENTRALE", hour: "13:05" },
    ]);
  });

  it("should handle extra whitespace in the text", () => {
    const result = extractStops(
      "FERMA A:   NAPOLI   CENTRALE   (09.45)  -   SALERNO  (10.30)",
    );
    expect(result).toEqual([
      { stop: "NAPOLI CENTRALE", hour: "09:45" },
      { stop: "SALERNO", hour: "10:30" },
    ]);
  });

  it("should handle case-insensitive FERMA A prefix", () => {
    const result = extractStops("ferma a: ROMA TERMINI (14.30)");
    expect(result).toEqual([
      { stop: "ROMA TERMINI", hour: "14:30" },
    ]);
  });

  it("should skip stops without valid time format", () => {
    const result = extractStops(
      "FERMA A: VALIDA (10.00) - NON VALIDA SENZA ORARIO - ALTRA VALIDA (11.00)",
    );
    expect(result).toEqual([
      { stop: "VALIDA", hour: "10:00" },
      { stop: "ALTRA VALIDA", hour: "11:00" },
    ]);
  });

  it("should handle text without FERMA A prefix", () => {
    const result = extractStops("ROMA TERMINI (14.30) - NAPOLI (16.00)");
    expect(result).toEqual([
      { stop: "ROMA TERMINI", hour: "14:30" },
      { stop: "NAPOLI", hour: "16:00" },
    ]);
  });
});
