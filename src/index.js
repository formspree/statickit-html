const ready = require("./ready");
const forms = require("./forms");
const logger = require("./logger")("main");
const queue = window.sk ? window.sk.q : [];

const api = {
  form: (...args) => {
    return forms.init(...args);
  }
};

const call = (methodName, ...args) => {
  const method = api[methodName];

  if (!method) {
    logger.log("Method `" + handler + "` does not exist");
    return;
  }

  return method.apply(this, args);
};

ready(() => {
  window.sk = call;
  queue.forEach(([...args]) => call(...args));
});
