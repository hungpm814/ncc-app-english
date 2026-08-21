import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "ASSEMBLYAI_API_KEY is not configured.",
      },
      {
        status: 503,
      },
    );
  }

  try {
    const response = await fetch("https://streaming.assemblyai.com/v3/token", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_in: 180,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await response.text();
    let data: { token?: string; error?: string } = {};

    try {
      data = JSON.parse(responseText) as typeof data;
    } catch {
      console.error("[AssemblyAI Token] Non-JSON response:", responseText);
    }

    console.log("[AssemblyAI Token]", {
      status: response.status,
      ok: response.ok,
      hasToken: Boolean(data.token),
    });

    if (!response.ok || !data.token) {
      console.error("[AssemblyAI Token] Upstream request rejected:", {
        status: response.status,
        error: data.error || responseText || "Unknown AssemblyAI error",
      });

      return NextResponse.json(
        {
          success: false,
          error:
            response.status === 401 || response.status === 403
              ? "AssemblyAI rejected the API key. Check ASSEMBLYAI_API_KEY on the server."
              : "AssemblyAI could not create an STT session.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      success: true,
      token: data.token,
    });
  } catch (error) {
    console.error("[GET /api/ielts/stt-token] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not create STT session.",
      },
      {
        status: 500,
      },
    );
  }
}
