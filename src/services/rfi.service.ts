import { parse } from "node-html-parser";
import type { BoardData, Train, NextStop } from "../types/types";
import { ApiError } from "../lib/api-error";

/**
 * Fetches and parses the station board from RFI
 * @param placeId the station place id
 * @param isArrivals whether to fetch arrivals or departures
 * @returns BoardData with parsed trains
 */
export async function fetchBoard(
  placeId: string,
  isArrivals: boolean,
): Promise<BoardData> {
  const now = Date.now();
  const rfiParam = isArrivals ? "true" : "false";
  const targetUrl = `https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${placeId}&arrivals=${rfiParam}&_t=${now}`;

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Home",
    },
  });

  if (!response.ok) {
    throw ApiError.badGateway(`RFI HTTP ${response.status}`);
  }

  const html = await response.text();
  const root = parse(html);
  const trains: Train[] = [];
  const rows = root.querySelectorAll('tr[name="treno"]');

  for (const row of rows) {
    const trainNumber = row.querySelector("td#RTreno")?.textContent?.trim();
    const stationName = row
      .querySelector("td#RStazione div")
      ?.textContent?.trim();
    const time = row.querySelector("td#ROrario")?.textContent?.trim();

    if (!trainNumber || !stationName || !time) continue;

    const operator = row
      .querySelector("td#RVettore img")
      ?.getAttribute("alt")
      ?.trim();
    const category = row
      .querySelector("td#RCategoria img")
      ?.getAttribute("alt")
      ?.replace("Categoria ", "")
      .trim();
    const delay =
      row.querySelector("td#RRitardo")?.textContent?.trim() || null;
    const platform =
      row.querySelector("td#RBinario div")?.textContent?.trim() || "N.D";
    const infoText = row
      .querySelector(".testoinfoaggiuntive")
      ?.textContent?.replace(/\s+/g, " ")
      .trim();

    trains.push({
      id: `${trainNumber}-${time}-${isArrivals ? "ARR" : "DEP"}`,
      trainNumber,
      operator,
      category,
      time,
      delay,
      platform,
      nextStops: extractStops(infoText),
      station: stationName,
      type: isArrivals ? "ARRIVAL" : "DEPARTURE",
    });
  }

  return {
    stationId: placeId,
    type: isArrivals ? "ARRIVALS" : "DEPARTURES",
    lastUpdate: new Date().toISOString(),
    trains,
  };
}

/**
 * Extracts next stops from the info modal text
 * @param text the modal content
 * @returns parsed stops array
 */
export function extractStops(text: string | undefined): NextStop[] {
  if (!text) return [];

  // The next stop modal always starts with "FERMA A"
  const cleanText = text
    .replace(/FERMA A:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // All the stops are separated by a "-"
  const stopsRaw = cleanText.split("-");
  const nextStops: NextStop[] = [];

  // Regex to catch "Nome Stazione (Orario)"
  const regex = /(.+?)\s*\(([\d\.\:]+)\)/;

  for (const stop of stopsRaw) {
    const match = stop.trim().match(regex);
    if (match) {
      nextStops.push({
        stop: match[1].trim(),
        // Normalize hour format
        hour: match[2].replace(".", ":").trim(),
      });
    }
  }

  return nextStops;
}
