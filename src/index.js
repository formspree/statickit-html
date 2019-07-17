import ready from './ready';
import forms from './forms';
import logger from './logger';

const queue = window.sk ? window.sk.q : [];

const api = {
  form: (...args) => {
    return forms.init(...args);
  }
};

const call = (methodName, ...args) => {
  const method = api[methodName];

  if (!method) {
    logger('main').log('Method `' + handler + '` does not exist');
    return;
  }

  return method.apply(undefined, args);
};

window.sk =
  window.sk ||
  function() {
    (sk.q = sk.q || []).push(arguments);
  };

ready(() => {
  window.sk = call;
  queue.forEach(([...args]) => call(...args));
});

export default window.sk;
