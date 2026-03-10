import type { APIContext } from "astro";
import { createChallenge } from "altcha-lib";

export async function GET({ request }: APIContext): Promise<Response> {
  try {
    const hmacKey = import.meta.env.ALTCHA_HMAC_KEY;

    const challenge = await createChallenge({
      hmacKey: hmacKey,
      maxNumber: 50000,
      expires: new Date(Date.now() + 1000 * 60 * 3),
    });

    return new Response(JSON.stringify(challenge), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Errore during Altcha challenge creation:", error);
    return new Response(
      JSON.stringify({ error: "Cannot generate the challenge" }),
      { status: 500 },
    );
  }
}
