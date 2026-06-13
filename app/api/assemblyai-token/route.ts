import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AssemblyAI API key is not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ token: apiKey });
}