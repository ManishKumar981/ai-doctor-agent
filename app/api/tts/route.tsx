import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';

const doctorIdToVoiceMapping: Record<number, string> = {
  1: "en-US-marcus",
  2: "en-US-arnold",
  3: "en-US-terrell",
  4: "en-US-natalie",
  5: "en-US-sarah",
  6: "en-US-eliza",
  7: "en-US-grace",
  8: "en-US-ken",
  9: "en-US-amara",
  10: "en-US-james",
};

const voiceIdMapping: Record<string, string> = {
  marcus: "en-US-marcus",
  arnold: "en-US-arnold",
  terrell: "en-US-terrell",
  natalie: "en-US-natalie",
  sarah: "en-US-sarah",
  eliza: "en-US-eliza",
  grace: "en-US-grace",
  ken: "en-US-ken",
  amara: "en-US-amara",
  james: "en-US-james",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputText: string = body.text;
    const doctorId: number = body.doctorId;
    const voiceId: string = body.voiceId;

    if (!inputText) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const voice = voiceId
      ? voiceIdMapping[voiceId] || "en-US-marcus"
      : doctorIdToVoiceMapping[doctorId] || "en-US-marcus";

    const murpfApiKey = process.env.MURF_API_KEY;
    const response = await fetch("https://api.murf.ai/v1/speech/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": murpfApiKey || "",
      },
      body: JSON.stringify({
        text: inputText,
        voiceId: voice,
        format: "MP3",
        channelType: "MONO",
        sampleRate: 24000,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ audioUrl: data.audioFile });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
