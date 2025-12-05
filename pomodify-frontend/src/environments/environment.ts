export const environment = {
  production: false,
  // Point to dev proxy to avoid CORS in local dev
  apiUrl: '/api/v1',
  // Enable mock backend in dev to avoid 500s from remote API
  useMockBackend: true,
};
