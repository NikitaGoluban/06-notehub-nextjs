// Loaded only by Playwright's isolated Next.js process, never by the app.
const http = require('node:http');
const https = require('node:https');
const origin = process.env.NOTEHUB_TEST_API_ORIGIN;
if (origin) {
  const destination = new URL(origin);
  if (destination.hostname !== '127.0.0.1') {
    throw new Error('The test API must run on loopback.');
  }
  const originalRequest = https.request;
  https.request = function (options, ...args) {
    if (options.hostname === 'notehub-public.goit.study') {
      return http.request(
        {
          ...options,
          protocol: 'http:',
          hostname: destination.hostname,
          host: destination.host,
          port: destination.port,
        },
        ...args,
      );
    }
    return originalRequest.call(this, options, ...args);
  };
}
