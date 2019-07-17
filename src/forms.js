import logger from './logger';
import h from 'hyperscript';

/**
 * The default init callback.
 */
const onInit = config => {
  config.enable(config);
};

/**
 * The default submit callback.
 */
const onSubmit = config => {
  config.renderErrors(config, []);
  config.disable(config);
};

/**
 * The default success callback.
 */
const onSuccess = (config, resp) => {
  const { h, form } = config;
  const replacement = h('div', {}, 'Thank you!');
  form.parentNode.replaceChild(replacement, form);
};

/**
 * The default error callback.
 */
const onError = (config, errors) => {
  config.renderErrors(config, errors);
};

/**
 * The default failure callback.
 */
const onFailure = config => {};

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

    if (error) {
      element.innerHTML = 'This field ' + error.message;
    } else {
      element.innerHTML = '';
    }
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
    endpoint
  } = config;

  const url = endpoint + '/j/forms/' + id + '/submissions';

  onSubmit(config);

  logger('forms').log(id, 'Submitting');

  fetch(url, {
    method: 'POST',
    mode: 'cors',
    body: new FormData(form)
  })
    .then(response => {
      response.json().then(data => {
        switch (response.status) {
          case 200:
            logger('forms').log(id, 'Submitted', data);
            onSuccess(config);
            break;

          case 422:
            logger('forms').log(id, 'Validation error', data);
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
  endpoint: 'https://api.statickit.com'
};

/**
 * Setup the form.
 */
const setup = config => {
  const { id, form, autoEnable, enable, onInit } = config;

  logger('forms').log(id, 'Initializing');

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    submit(config);
  });

  onInit(config);
  return true;
};

const init = (selector, props) => {
  const form = document.querySelector(selector);
  const config = Object.assign(defaults, props, { form });

  if (!form) {
    logger('forms').log('Element `' + selector + '` not found');
    return;
  }

  if (!config.id) {
    logger('forms').log('You must define an `id` property');
    return;
  }

  return setup(config);
};

export default { init };
