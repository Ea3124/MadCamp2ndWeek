// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL;

export const API = {
  base: BASE_URL,
  users: `${BASE_URL}/api/users`,
  userScore: `${BASE_URL}/api/users/score`,
};

export const SOCKET_URL = BASE_URL;
