const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
export const API_BASE = isLocalhost
	? "http://localhost:3000/api"
	: "https://operait.onrender.com/api";