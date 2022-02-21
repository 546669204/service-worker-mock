/// <reference lib="webworker" />
export default null;
declare var self: ServiceWorkerGlobalScope;

let readyClients = [];
let ids = 0;
let promiseByIdMap = new Map();
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ready") {
    if (event.source instanceof Client) {
      readyClients.push(event.source.id);
    }
  }
  if (event.data && event.data.type === "fetch_response") {
    const obj = promiseByIdMap.get(event.data.ids);
    if (event.data.payload) {
      obj.resolve(new Response(JSON.stringify(event.data.payload)));
    } else {
      obj.resolve(fetch(obj.event.request));
    }
  }
});

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  let request = event.request;
  event.respondWith(
    new Promise(async (resolve) => {
      if (readyClients.includes(event.clientId) || !event.clientId) {
        const client = await self.clients.get(event.clientId);
        if (!client) {
          return resolve(fetch(request))
        }
        let data = {};
        if (request.method != "GET") {
          data = await request.clone().text();
        }
        let headers = {};
        request.headers.forEach((value, key) => {
          headers[key] = value;
        })
        client.postMessage({
          type: "fetch",
          ids: ++ids,
          payload: {
            ...["cache", "credentials", "destination", "integrity", "keepalive", "method", "mode", "redirect", "referrer", "referrerPolicy", "url"].reduce((obj, item) => (obj[item] = request[item], obj), {}),
            headers,
            data,
          },
        });
        promiseByIdMap.set(ids, { event, resolve });
      } else {
        return resolve(fetch(request))
      }
    })
  );
});
