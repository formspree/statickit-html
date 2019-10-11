import StaticKit from '@statickit/core';
import forms from './forms';

const client = StaticKit();

const ready = fn => {
  if (document.readyState != 'loading') {
    fn();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState != 'loading') fn();
    });
  }
};

const api = {
  form: (method, ...args) => {
    const [props] = args;

    if (!props.client) {
      props.client = client;
    }

    switch (method) {
      case 'init':
        return forms.init(props);

      default:
        // To retain backwards compatiblilty with
        // setting `element` selector as the second
        // argument: sk('form', '#myform', { ... })
        props.element = method;
        return forms.init(props);
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
  const queue = window.sk ? sk.q || [] : [];
  window.sk = run;

  queue.forEach(args => {
    run.apply(null, args);
  });
});

export default window.sk;
