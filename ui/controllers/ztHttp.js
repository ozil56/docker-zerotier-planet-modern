'use strict';
// The controller is local HTTP. Never follow redirects or reuse its closed sockets.
const http = require('node:http');
class HTTPError extends Error {
  constructor(statusCode) { super('Controller HTTP ' + statusCode); this.statusCode = statusCode; }
}
function request(address, options = {}) {
  const url = new URL(address.includes('://') ? address : 'http://' + address);
  if (url.protocol !== 'http:' || url.username || url.password) {
    return Promise.reject(new Error('Invalid controller endpoint'));
  }
  return new Promise((resolve, reject) => {
    const data = options.body === undefined ? undefined : Buffer.from(JSON.stringify(options.body));
    const headers = {...options.headers, Accept: 'application/json'};
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = data.length; }
    const req = http.request(url, {method: options.method || 'GET', agent: false, headers}, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume(); reject(new HTTPError(res.statusCode)); return;
      }
      let size = 0; const chunks = [];
      res.on('data', chunk => {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) { res.destroy(); reject(new Error('Controller response too large')); }
        else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => {
        try { resolve({body: JSON.parse(Buffer.concat(chunks).toString('utf8'))}); }
        catch { reject(new Error('Invalid controller JSON')); }
      });
    });
    const deadline = setTimeout(() => req.destroy(new Error('Controller request timed out')), 5000);
    req.on('close', () => clearTimeout(deadline));
    req.on('error', reject);
    req.end(data);
  });
}
request.HTTPError = HTTPError;
module.exports = request;
