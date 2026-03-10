import { parse } from "node-html-parser";
import type { APIContext } from "astro";
import type {
  BoardData,
  ResponseDto,
  Train,
  NextStop,
} from "../../types/types";
import { verifySolution } from "altcha-lib";

export async function GET({ request, locals }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId") || "2416";

  const arrivalsRaw = url.searchParams.get("arrivals");
  const isArrivals = String(arrivalsRaw).toLowerCase() === "true";

  const altchaPayload = request.headers.get("X-Altcha-Payload");

  if (!altchaPayload) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Access Denied",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const cfEnv = (locals as any)?.runtime?.env || {};
    const hmacKey = cfEnv.ALTCHA_HMAC_KEY || import.meta.env.ALTCHA_HMAC_KEY;

    const isValid = await verifySolution(altchaPayload, hmacKey);

    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed Verify" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Altcha Validation Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const now = Date.now();

  const rfiParam = isArrivals ? "true" : "false";
  const targetUrl = `https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Monitor?placeId=${placeId}&arrivals=${rfiParam}&_t=${now}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://iechub.rfi.it/ArriviPartenze/ArrivalsDepartures/Home",
      },
    });

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

    const responseDto: ResponseDto<BoardData> = {
      success: true,
      data: {
        stationId: placeId,
        type: isArrivals ? "ARRIVALS" : "DEPARTURES",
        lastUpdate: new Date().toISOString(),
        trains: trains,
      },
    };

    return new Response(JSON.stringify(responseDto), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    });
  } catch (e) {
    console.error("Fetch error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "RFI Error" }),
      { status: 500 },
    );
  }
}

/**
 * This metod extracts next stops from the info modal
 * @param text the modal content
 * @returns the single stop
 */
function extractStops(text: string | undefined): NextStop[] {
  if (!text) return [];

  // The next stop modal always starts with "FERMA A"
  let cleanText = text
    .replace(/FERMA A:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // All the steps are separated by a "-"
  const stopsRaw = cleanText.split("-");
  const nextStops: NextStop[] = [];

  // 3. Regex to catch "Nome Stazione (Orario)"
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
