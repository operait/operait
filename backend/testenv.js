import "dotenv/config";

console.log("OPENAI:", process.env.OPENAI_API_KEY?.slice(0, 5));
console.log("URL:", process.env.SUPABASE_URL);
console.log("SERVICE:", process.env.SUPABASE_SERVICE_KEY?.slice(0, 10));
