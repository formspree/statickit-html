import ready from './ready';
import logger from './logger';
import forms from './forms';
import telemetry from './telemetry';
import './polyfills';

const queue = window.sk ? window.sk.q : [];

const api = {
  form: (...args) => {
    return forms.init(...args);
  }
};

const run = (...args) => {
  const scope = args[0];
  const methodArgs = args.slice(1);
  const method = api[scope];

  if (!method) {
    logger('main').log('Method `' + scope + '` does not exist');
    return;
  }

  return method.apply(null, methodArgs);
};

telemetry.set('loadedAt', 1 * new Date());

window.addEventListener('mousemove', () => {
  telemetry.inc('mousemove');
});

window.addEventListener('keydown', () => {
  telemetry.inc('keydown');
});

telemetry.set(
  'webdriver',
  navigator.webdriver ||
    document.documentElement.getAttribute('webdriver') ||
    !!window.callPhantom ||
    !!window._phantom
);

window.sk =
  window.sk ||
  function() {
    (sk.q = sk.q || []).push(arguments);
  };

ready(() => {
  window.sk = run;
  queue.forEach(run);
});

export default window.sk;
