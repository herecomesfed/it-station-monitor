import type { ResponseDto, TrainRealtimeDetails } from "@/types/types";
import type { APIContext } from "astro";
import {
  getStationInfo,
  fetchTrainDetails,
} from "../../services/viaggiatreno.service";
import { ApiError } from "../../lib/api-error";

/**
 * GET endpoint to retrieve real time train stops
 */
export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const trainNumber = url.searchParams.get("trainNumber");

  if (!trainNumber) {
    return ApiError.badRequest("Missing trainNumber parameter").toResponse();
  }

  const stationInfo = await getStationInfo(trainNumber);

  if (!stationInfo) {
    return ApiError.notFound("Train not found").toResponse();
  }

  try {
    const realtimeDetails = await fetchTrainDetails(
      stationInfo.id,
      trainNumber,
      stationInfo.timestamp,
    );

    if (!realtimeDetails) {
      return ApiError.notFound("No real-time data available").toResponse();
    }

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
    if (e instanceof ApiError) return e.toResponse();

    console.error("Error during catching train details:", e);
    return ApiError.badGateway("ViaggiaTreno service unavailable").toResponse();
  }
}
