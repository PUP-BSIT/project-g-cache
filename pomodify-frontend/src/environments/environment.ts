// Development environment - auto-detect backend
export const environment = {
  production: false,
  apiUrl: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8081' 
    : `http://${window.location.hostname}:8081`,
  useMockBackend: false, // Will be set to true if real backend is unreachable
};
