/**
 * Module dependencies.
 */

const logger = require("./logger")("forms");
const h = require("hyperscript");

/**
 * Default configuration.
 */
const defaults = {
  h: h,
  autoEnable: true,
  onSuccess: (config, resp) => {
    const h = config.h;
    const replacement = h("div", {}, "Thank you for signing up!");
    form.parentNode.replaceChild(replacement, form);
  },
  onError: (config, errors) => {
    config.renderErrors(config, errors);
  },
  onSubmit: config => {
    config.clearErrors(config);
    config.disable(config);
  },
  enable: config => {
    const form = config.form;
    const buttons = form.querySelectorAll("[type='submit']:disabled");

    Array.from(buttons).forEach(button => {
      button.disabled = false;
    });
  },
  disable: config => {
    const form = config.form;
    const buttons = form.querySelectorAll("[type='submit']:enabled");

    Array.from(buttons).forEach(button => {
      button.disabled = true;
    });
  },
  renderErrors: (config, errors) => {
    const form = config.form;

    errors.forEach(error => {
      const selector = "[data-sk-error='" + error.attribute + "']";
      const element = form.querySelector(selector);
      if (!element) return;
      element.innerHTML = error.message;
    });
  },
  clearErrors: config => {
    const form = config.form;
    const selector = "[data-sk-error='" + error.attribute + "']";
    const elements = form.querySelectorAll(selector);

    Array.from(elements).forEach(element => {
      element.innerHTML = "";
    });
  }
};

/**
 * Submits the form.
 */
const submit = config => {
  const { id, form, enable, disable, renderErrors, onSuccess } = config;
  const url = STATICKIT_URL + "/j/forms/" + id + "/submissions";

  disable(config);
  renderErrors(config, []);

  logger.log(id, "Submitting");

  fetch(url, {
    method: "POST",
    mode: "cors",
    body: new FormData(form)
  })
    .then(response => {
      response.json().then(data => {
        switch (response.status) {
          case 200:
            logger.log(id, "Submitted", data);
            onSuccess(config);
            break;

          default:
            logger.log(id, "Validation error", data);
            break;
        }
      });
    })
    .catch(error => logger.log(id, "Unexpected error ", error))
    .finally(() => {
      enable(config);
    });
};

/**
 * Hijacks form submission.
 */
const setup = config => {
  const { id, form, autoEnable, enable } = config;

  logger.log(id, "Initializing");

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    submit(config);
  });

  if (autoEnable) enable(config);
};

module.exports = {
  init: (selector, props) => {
    const form = document.querySelector(selector);
    const config = Object.assign(defaults, props, { form });

    if (!form) {
      logger.log("Element `" + selector + "` not found");
      return;
    }

    if (!config.id) {
      logger.log("You must define an `id` property");
      return;
    }

    return setup(config);
  }
};
