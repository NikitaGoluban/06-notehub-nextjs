const http = require('node:http');
const { randomUUID } = require('node:crypto');
let notes;
let control;
let requests;
function reset() {
  notes = Array.from({ length: 25 }, (_, index) => ({
    id: `seed-${index + 1}`,
    title: `Note ${index + 1}`,
    content: `Content for note ${index + 1}`,
    tag: index % 2 ? 'Work' : 'Todo',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  }));
  control = {};
  requests = [];
}
reset();
async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}
function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(data));
}
http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1:4010');
      if (url.pathname === '/__test/health')
        return json(response, 200, { ready: true });
      if (url.pathname === '/__test/reset') {
        reset();
        return json(response, 200, {});
      }
      if (url.pathname === '/__test/control') {
        const update = await readBody(request);
        if (update.notes) {
          notes = update.notes;
          delete update.notes;
        }
        Object.assign(control, update);
        return json(response, 200, control);
      }
      if (url.pathname === '/__test/requests')
        return json(response, 200, requests);
      requests.push({
        method: request.method,
        path: url.pathname,
        search: url.searchParams.get('search'),
        page: url.searchParams.get('page'),
      });
      const isList = url.pathname === '/api/notes' && request.method === 'GET';
      const isDetails =
        url.pathname.startsWith('/api/notes/') && request.method === 'GET';
      const delay = isList
        ? control.listDelay
        : request.method === 'POST'
          ? control.createDelay
          : request.method === 'DELETE'
            ? control.deleteDelay
            : 0;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const failure = isList
        ? control.listError
        : isDetails
          ? control.detailsError
          : control.mutationError;
      if (failure)
        return json(response, typeof failure === 'number' ? failure : 500, {
          message: 'Simulated API failure',
        });
      if (isList) {
        const search = (url.searchParams.get('search') || '').toLowerCase();
        const filtered = notes.filter((note) =>
          `${note.title} ${note.content}`.toLowerCase().includes(search),
        );
        const perPage = Number(url.searchParams.get('perPage') || 12);
        const page = Number(url.searchParams.get('page') || 1);
        return json(response, 200, {
          notes: filtered.slice((page - 1) * perPage, page * perPage),
          totalPages: Math.ceil(filtered.length / perPage),
        });
      }
      if (url.pathname === '/api/notes' && request.method === 'POST') {
        const input = await readBody(request);
        const note = {
          ...input,
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        notes.unshift(note);
        return json(response, 201, note);
      }
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const note = notes.find((item) => item.id === id);
      if (!note) return json(response, 404, { message: 'Note not found' });
      if (request.method === 'DELETE')
        notes = notes.filter((item) => item.id !== id);
      return json(response, 200, note);
    } catch {
      json(response, 500, { message: 'Mock API request failed' });
    }
  })
  .listen(4010, '127.0.0.1', () =>
    console.log('Test API listening on http://127.0.0.1:4010'),
  );
