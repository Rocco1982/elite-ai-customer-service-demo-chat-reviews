import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Create a thread if none exists
    const thread = await openai.beta.threads.create();

    // Add the latest user message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: messages[messages.length - 1].content,
    });

    // Run the Assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID!,
    });

    // Poll until the run is complete
    let result;
    while (true) {
      result = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (result.status === "completed") break;
      if (result.status === "failed") throw new Error("Assistant run failed");
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Fetch messages
    const messagesRes = await openai.beta.threads.messages.list(thread.id);

    const lastMessage = messagesRes.data[0]?.content[0];
    let output = "";

    if (lastMessage.type === "text") {
      output = lastMessage.text.value;
    }

    return NextResponse.json({ reply: output });
  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
