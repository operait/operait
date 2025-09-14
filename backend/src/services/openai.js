import OpenAI from "openai";
export function getOpenAI(){
  const apiKey = process.env.OPENAI_API_KEY;
  if(!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}
