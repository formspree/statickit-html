import logger from './logger';
import h from 'hyperscript';
import telemetry from './telemetry';
import { toCamel } from './utils';

/**
 * The default init callback.
 */
const onInit = _config => {};

/**
 * The default submit callback.
 */
const onSubmit = _config => {};

/**
 * The default success callback.
 */
const onSuccess = (config, _resp) => {
  const { h, form } = config;
  const replacement = h('div', {}, 'Thank you!');
  form.parentNode.replaceChild(replacement, form);
};

/**
 * The default error callback.
 */
const onError = (_config, _errors) => {};

/**
 * The default failure callback.
 */
const onFailure = _config => {};

/**
 * The default enable hook.
 */
const enable = config => {
  const buttons = config.form.querySelectorAll("[type='submit']:disabled");

  Array.from(buttons).forEach(button => {
    button.disabled = false;
  });
};

/**
 * The default disable hook.
 */
const disable = config => {
  const buttons = config.form.querySelectorAll("[type='submit']:enabled");

  Array.from(buttons).forEach(button => {
    button.disabled = true;
  });
};

/**
 * The default error rendering hook.
 */
const renderErrors = (config, errors) => {
  const elements = config.form.querySelectorAll('[data-sk-error]');

  const errorFor = field => {
    return errors.find(error => {
      return error.field == field;
    });
  };

  Array.from(elements).forEach(element => {
    const error = errorFor(element.dataset.skError);

    if (!error) {
      element.innerHTML = '';
      return;
    }

    const fieldConfig = config.fields[error.field] || {};
    const errorMessages = fieldConfig.errorMessages || {};
    const prefix = fieldConfig.prettyName || 'This field';
    const code = toCamel((error.code || '').toLowerCase());
    const fullMessage = errorMessages[code] || `${prefix} ${error.message}`;

    element.innerHTML = fullMessage;
  });
};

/**
 * Submits the form.
 */
const submit = config => {
  const {
    id,
    form,
    enable,
    disable,
    renderErrors,
    onSubmit,
    onSuccess,
    onError,
    endpoint,
    data
  } = config;

  const url = endpoint + '/j/forms/' + id + '/submissions';
  const formData = new FormData(form);

  // Append data from config
  if (typeof data === 'object') {
    for (const prop in data) {
      if (typeof data[prop] === 'function') {
        formData.append(prop, data[prop].call(null, config));
      } else {
        formData.append(prop, data[prop]);
      }
    }
  }

  const telemetryData = Object.assign(telemetry.data(), {
    submittedAt: 1 * new Date()
  });

  formData.append('_t', window.btoa(JSON.stringify(telemetryData)));

  renderErrors(config, []);
  disable(config);
  onSubmit(config);

  logger('forms').log(id, 'Submitting');

  fetch(url, {
    method: 'POST',
    mode: 'cors',
    body: formData
  })
    .then(response => {
      response.json().then(data => {
        switch (response.status) {
          case 200:
            logger('forms').log(id, 'Submitted', data);
            onSuccess(config, data);
            break;

          case 422:
            logger('forms').log(id, 'Validation error', data);
            renderErrors(config, data.errors);
            onError(config, data.errors);
            break;

          default:
            logger('forms').log(id, 'Unexpected error', data);
            onFailure(config);
            break;
        }

        return true;
      });
    })
    .catch(error => {
      logger('forms').log(id, 'Unexpected error ', error);
      onFailure(config);
      return true;
    })
    .finally(() => {
      enable(config);
      return true;
    });

  return true;
};

/**
 * Default configuration.
 */
const defaults = {
  h: h,
  onInit: onInit,
  onSubmit: onSubmit,
  onSuccess: onSuccess,
  onError: onError,
  onFailure: onFailure,
  enable: enable,
  disable: disable,
  renderErrors: renderErrors,
  endpoint: 'https://api.statickit.com',
  data: {},
  fields: {}
};

/**
 * Setup the form.
 */
const setup = config => {
  const { id, form, onInit, enable } = config;

  logger('forms').log(id, 'Initializing');

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    submit(config);
  });

  enable(config);
  onInit(config);
  return true;
};

/**
 * Look up the form element by selector or accept the given element.
 *
 * @param {Element|String} nodeOrSelector
 */
const getFormElement = nodeOrSelector => {
  if (nodeOrSelector.tagName == 'FORM') {
    return nodeOrSelector;
  } else {
    return document.querySelector(nodeOrSelector);
  }
};

const init = props => {
  if (!props.id) {
    logger('forms').log('You must define an `id` property');
    return;
  }

  if (!props.element) {
    logger('forms').log('You must define an `element` property');
    return;
  }

  const form = getFormElement(config.element);
  const config = Object.assign(defaults, props, { form });

  if (!form) {
    logger('forms').log(`Element \`${config.element}\` not found`);
    return;
  }

  return setup(config);
};

export default { init };
