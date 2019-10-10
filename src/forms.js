import h from 'hyperscript';
import { toCamel } from './utils';
import objectAssign from 'object-assign';

const onSuccess = (config, _resp) => {
  const { h, form } = config;
  const replacement = h('div', {}, 'Thank you!');
  form.parentNode.replaceChild(replacement, form);
};

const enable = config => {
  const buttons = config.form.querySelectorAll("[type='submit']:disabled");

  Array.from(buttons).forEach(button => {
    button.disabled = false;
  });
};

const disable = config => {
  const buttons = config.form.querySelectorAll("[type='submit']:enabled");

  Array.from(buttons).forEach(button => {
    button.disabled = true;
  });
};

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

const submit = (client, config) => {
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

  // Clear visible errors before submitting
  renderErrors(config, []);
  disable(config);
  onSubmit(config);

  if (config.debug) console.log(id, 'Submitting');

  return client
    .submitForm({
      id: id,
      endpoint: endpoint,
      data: formData
    })
    .then(result => {
      if (result.response.status == 200) {
        if (config.debug) console.log(id, 'Submitted', result);
        onSuccess(config, result.body);
      } else {
        const errors = result.body.errors;
        if (config.debug) console.log(id, 'Validation error', result);
        renderErrors(config, errors);
        onError(config, errors);
      }
    })
    .catch(e => {
      if (config.debug) console.log(id, 'Unexpected error', e);
      onFailure(config, e);
    })
    .finally(() => {
      enable(config);
    });
};

/**
 * Default configuration.
 */
const defaults = {
  h: h,
  onInit: () => {},
  onSubmit: () => {},
  onError: () => {},
  onFailure: () => {},
  onSuccess: onSuccess,
  enable: enable,
  disable: disable,
  renderErrors: renderErrors,
  endpoint: 'https://api.statickit.com',
  data: {},
  fields: {},
  debug: false
};

const setup = (client, config) => {
  const { id, form, onInit, enable } = config;

  if (config.debug) console.log(id, 'Initializing');

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    submit(client, config);
    return true;
  });

  enable(config);
  onInit(config);
  return true;
};

const getFormElement = nodeOrSelector => {
  if (nodeOrSelector.tagName == 'FORM') {
    return nodeOrSelector;
  } else {
    return document.querySelector(nodeOrSelector);
  }
};

const init = (client, props) => {
  if (!props.id) throw new Error('You must define an `id` property');
  if (!props.element) throw new Error('You must define an `element` property');

  const form = getFormElement(props.element);
  if (!form) throw new Error(`Element \`${props.element}\` not found`);

  const config = objectAssign({}, defaults, props, { form });
  return setup(client, config);
};

export default { init };
