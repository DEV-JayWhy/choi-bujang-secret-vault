import { authHandler } from '../../src/server-auth.mjs';
import { operationsHandler } from '../../src/operations-handler.mjs';
const session = authHandler('session');
const operations = operationsHandler();
export function isOperationsView(request) {
  const path = request.url?.split('?')[0];
  return path === '/api/checks' || (path === '/api/auth/session'
    && new URLSearchParams(request.url?.split('?')[1] ?? '').get('view') === 'operations');
}
export default function handler(request, response) {
  return (isOperationsView(request) ? operations : session)(request, response);
}
