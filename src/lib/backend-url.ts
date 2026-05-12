export const PUBLIC_BACKEND_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');
