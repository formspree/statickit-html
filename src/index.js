import StaticKit from '@statickit/core';
import ready from './ready';
import forms from './forms';
import './polyfills';

const client = StaticKit();
const queue = window.sk ? window.sk.q : [];

const api = {
  form: (method, ...args) => {
    const [props] = args;

    switch (method) {
      case 'init':
        return forms.init(client, props);

      default:
        // To retain backwards compatiblilty with
        // setting `element` selector as the second
        // argument: sk('form', '#myform', { ... })
        props.element = method;
        return forms.init(client, props);
    }
  }
};

const run = (scope, ...args) => {
  const method = api[scope];
  if (!method) throw new Error(`Method \`${scope}\` does not exist`);
  return method.apply(null, args);
};

window.sk =
  window.sk ||
  function() {
    (sk.q = sk.q || []).push(arguments);
  };

ready(() => {
  window.sk = run;
  queue.forEach(args => {
    run.apply(null, args);
  });
});

export default window.sk;
