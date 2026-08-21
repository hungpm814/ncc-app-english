import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "ASSEMBLYAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch("https://streaming.assemblyai.com/v3/token", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expires_in: 120 }),
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok || !data.token) {
      console.error("[AssemblyAI Token] Error:", data);
      return NextResponse.json(
        { success: false, error: "Could not create STT session." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, token: data.token });
  } catch (error) {
    console.error("[GET /api/ielts/stt-token] Error:", error);
    return NextResponse.json(
      { success: false, error: "Could not create STT session." },
      { status: 500 },
    );
  }
}
