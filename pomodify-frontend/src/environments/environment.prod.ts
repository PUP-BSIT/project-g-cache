// Production environment - use deployed backend
export const environment = {
  production: true,
  apiUrl: typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : 'https://your-deployed-backend.com',
  useMockBackend: false,
};
