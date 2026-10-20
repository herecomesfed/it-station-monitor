import type { ResponseDto, TrainRealtimeDetails } from "@/types/types";
import type { APIContext } from "astro";
import {
  getStationInfo,
  findTrainDetails,
} from "../../services/viaggiatreno.service";
import { ApiError } from "../../lib/api-error";

/**
 * GET endpoint to retrieve real time train stops
 */
const TRAIN_NUMBER_REGEX = /^\d{1,6}$/;

export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const trainNumber = url.searchParams.get("trainNumber");
  // Origin or destination shown on the RFI board, used to pick the right train among homonyms
  const station = url.searchParams.get("station");

  if (!trainNumber) {
    return ApiError.badRequest("Missing trainNumber parameter").toResponse();
  }

  if (!TRAIN_NUMBER_REGEX.test(trainNumber)) {
    return ApiError.badRequest("Invalid trainNumber parameter").toResponse();
  }

  try {
    const candidates = await getStationInfo(trainNumber);

    if (candidates.length === 0) {
      return ApiError.notFound("Train not found").toResponse();
    }

    const realtimeDetails = await findTrainDetails(
      candidates,
      trainNumber,
      station,
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
