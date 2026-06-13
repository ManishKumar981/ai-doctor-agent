import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/shared/OpenAiModel";
import { PrismaClient } from "@/lib/generated/prisma";

declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) global.prisma = new PrismaClient();
  prisma = global.prisma;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messages, doctorSpecialist, doctorName } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    // Build a readable transcript string for the AI to summarize
    const transcript = messages
      .map((m: { role: string; content: string }) => {
        const speaker = m.role === "assistant"
          ? `Dr. ${doctorName || doctorSpecialist || "AI Doctor"}`
          : "Patient";
        return `${speaker}: ${m.content}`;
      })
      .join("\n\n");

    // Ask AI to generate a structured medical report
    const summaryPrompt = `You are a medical documentation assistant. Based on the following conversation between a doctor and patient, generate a professional medical consultation report.

CONVERSATION:
${transcript}

Generate a report with these exact sections:
1. **Patient Complaint** – What the patient described as their main issue
2. **Symptoms Discussed** – All symptoms mentioned during the conversation
3. **Doctor's Assessment** – The doctor's analysis and observations
4. **Recommendations & Advice** – Any advice, lifestyle changes, or next steps suggested
5. **Medications / Treatments Mentioned** – Any medications or treatments discussed (write "None mentioned" if not applicable)
6. **Follow-up Required** – Whether the doctor recommended follow-up (Yes/No and details)

Keep it professional, concise, and factual. Only include information from the conversation.`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const summary = response.choices[0]?.message?.content || "Summary could not be generated.";

    // Save both conversation and report to the session in DB
    if (sessionId) {
      await prisma.session.update({
        where: { sessionId },
        data: {
          conversation: messages,
          report: { summary, generatedAt: new Date().toISOString() },
        },
      });
    }

    return NextResponse.json({ summary, transcript });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
