import { GoogleGenAI } from "@google/genai";
import type { APIRoute } from "astro";
import { AI_SYSTEM_PROMPT } from "../../data/ai-profile";
import {
  MAX_ASSISTANT_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_REQUEST,
  MAX_OUTPUT_TOKENS,
  MAX_REQUEST_BYTES,
  MAX_USER_MESSAGE_LENGTH,
  MODEL,
} from "../../lib/ai-config";
import { checkRateLimit } from "../../lib/rate-limit";

export const prerender = false;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const encoder = new TextEncoder();

function jsonError(
  status: number,
  message: string,
  extraHeaders?: HeadersInit,
) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function getClientId(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function validateMessages(value: unknown): ChatMessage[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_MESSAGES_PER_REQUEST
  ) {
    return null;
  }

  const messages: ChatMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const role = Reflect.get(item, "role");
    const rawContent = Reflect.get(item, "content");

    if (
      (role !== "user" && role !== "assistant") ||
      typeof rawContent !== "string"
    ) {
      return null;
    }

    const content = rawContent.trim();
    const maxLength =
      role === "user" ? MAX_USER_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH;

    if (content.length === 0 || content.length > maxLength) return null;
    messages.push({ role, content });
  }

  if (messages[0]?.role !== "user" || messages.at(-1)?.role !== "user")
    return null;

  for (let index = 1; index < messages.length; index += 1) {
    if (messages[index]?.role === messages[index - 1]?.role) return null;
  }

  return messages;
}

function toInteractionSteps(messages: ChatMessage[]) {
  return messages.map((message) => ({
    type:
      message.role === "user"
        ? ("user_input" as const)
        : ("model_output" as const),
    content: [{ type: "text" as const, text: message.content }],
  }));
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return 503;
  const status = Reflect.get(error, "status");
  const message = Reflect.get(error, "message");

  if (
    status === 429 ||
    (typeof message === "string" &&
      (message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")))
  ) {
    return 429;
  }

  return 503;
}

export const POST: APIRoute = async ({ request }) => {
  const requestOrigin = request.headers.get("origin");
  const endpointOrigin = new URL(request.url).origin;

  if (requestOrigin && requestOrigin !== endpointOrigin) {
    return jsonError(403, "This request is not allowed.");
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return jsonError(415, "Send a JSON request.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return jsonError(
      413,
      "That conversation is too long. Please clear it and try again.",
    );
  }

  const rateLimit = checkRateLimit(getClientId(request));
  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "Too many questions. Please wait a moment and try again.",
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Remaining": "0",
      },
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError(400, "I couldn't read that question.");
  }

  if (encoder.encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return jsonError(
      413,
      "That conversation is too long. Please clear it and try again.",
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonError(400, "I couldn't read that question.");
  }

  const messages = validateMessages(
    payload && typeof payload === "object"
      ? Reflect.get(payload, "messages")
      : undefined,
  );

  if (!messages) {
    return jsonError(400, "That conversation format isn't valid.");
  }

  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured.");
    return jsonError(
      503,
      "I couldn't answer that right now. Please try again shortly.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let geminiStream;
  try {
    geminiStream = await ai.interactions.create({
      model: MODEL,
      input: toInteractionSteps(messages),
      system_instruction: AI_SYSTEM_PROMPT,
      stream: true,
      store: false,
      generation_config: {
        max_output_tokens: MAX_OUTPUT_TOKENS,
        thinking_level: "low",
      },
    });
  } catch (error) {
    const status = getErrorStatus(error);
    console.error(`Gemini request failed before streaming (${status}).`);
    return jsonError(
      status,
      "I couldn't answer that right now. Please try again shortly.",
    );
  }

  const responseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of geminiStream) {
          if (
            event.event_type === "step.delta" &&
            event.delta.type === "text"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch {
        console.error("Gemini response stream was interrupted.");
        controller.error(new Error("Response stream interrupted"));
      }
    },
  });

  return new Response(responseBody, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
      "X-RateLimit-Remaining": String(rateLimit.remaining),
    },
  });
};

export const ALL: APIRoute = () =>
  jsonError(405, "Method not allowed.", { Allow: "POST" });
