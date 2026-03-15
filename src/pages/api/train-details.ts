import type { ResponseDto, TrainRealtimeDetails } from "@/types/types";
import type { APIContext } from "astro";
import {
  getStationInfo,
  fetchTrainDetails,
} from "../../services/viaggiatreno.service";

/**
 * GET endpoint to retrieve real time train stops
 */
export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const trainNumber = url.searchParams.get("trainNumber");
  const stationInfo = await getStationInfo(trainNumber);

  // If station info are not present, return 404
  if (!stationInfo) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "No station found",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const realtimeDetails = await fetchTrainDetails(
      stationInfo.id,
      trainNumber!,
      stationInfo.timestamp,
    );

    const responseDto: ResponseDto<TrainRealtimeDetails> = {
      success: true,
      data: realtimeDetails,
    };

    return new Response(JSON.stringify(responseDto), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=10, s-maxage=10",
      },
    });
  } catch (e) {
    console.error("Error during catching train details:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Connection Error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
