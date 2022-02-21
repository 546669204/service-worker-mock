//@ts-ignore
const swUrl = require("!!file-loader!./sw.js");

declare interface Window {
  mockJs: {
    mock: (url: string | RegExp, handler: Function | Object) => void
    match: (options: any) => Rule | null
  }
}
declare type Rule = [RegExp, Function]
var rules: Rule[] = [];

window.mockJs = {
  mock(path, handler) {
    if (typeof path == "string") {
      path = new RegExp(path);
    }
    if (typeof handler != "function") {
      let value = handler;
      handler = () => value;
    }
    rules.push([path, handler as Function]);
  },
  match(options) {
    return rules.find(rule => rule[0].test(options.url))
  }
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(swUrl, {
      scope: "/",
    })
    .then(function (registration) {
      let controller = navigator.serviceWorker.controller;
      controller.postMessage({
        type: "ready",
      });
      navigator.serviceWorker.onmessage = (event) => {
        const data = event.data;
        if (data.type == "fetch") {
          const hitRule = window.mockJs.match(data.payload);

          controller.postMessage({
            type: "fetch_response",
            ids: data.ids,
            payload: hitRule ? hitRule[1](data.payload) : null
          });
        }
      };
    })
    .catch(function (error) { });
} else {
  // 浏览器不支持 serviceWorker
}
