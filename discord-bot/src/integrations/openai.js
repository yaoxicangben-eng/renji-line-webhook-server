import OpenAI from "openai";

let client;

function getClient(config) {
  if (!config.openai.apiKey) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}

export async function generateText(config, messages) {
  const openai = getClient(config);
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 0.4,
    messages,
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}
