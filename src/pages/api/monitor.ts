import type { APIContext } from "astro";
import type { ResponseDto, BoardData } from "../../types/types";
import { fetchBoard } from "../../services/rfi.service";

export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const placeId = url.searchParams.get("placeId") || "2416";
  const arrivalsRaw = url.searchParams.get("arrivals");
  const isArrivals = String(arrivalsRaw).toLowerCase() === "true";

  try {
    const boardData = await fetchBoard(placeId, isArrivals);

    const responseDto: ResponseDto<BoardData> = {
      success: true,
      data: boardData,
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
