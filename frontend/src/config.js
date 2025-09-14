export const API_BASE = import.meta.env.DEV
  ? "https://operait.onrender.com/api" // when running locally → call Render backend directly
  : "/api";                            // when deployed on GitHub Pages → proxy works
