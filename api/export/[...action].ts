// Proxy to the main handler for /api/export/* routes
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../[...path]';

export default async function exportHandler(req: VercelRequest, res: VercelResponse) {
  // Get action from query params or parse from URL
  let actionSegments: string[] = [];
  
  const { action } = req.query;
  if (action) {
    actionSegments = Array.isArray(action) ? action : [action];
  } else {
    // Fallback: parse from URL path
    const url = req.url || '';
    const urlPath = url.split('?')[0];
    const match = urlPath.match(/^\/api\/export\/(.+)$/);
    if (match && match[1]) {
      actionSegments = match[1].split('/').filter(Boolean);
    }
  }
  
  // Set path for the main handler
  req.query.path = ['export', ...actionSegments];
  return handler(req, res);
}