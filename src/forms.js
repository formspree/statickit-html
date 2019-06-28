/**
 * Module dependencies.
 */

const logger = require("./logger")("forms");
const h = require("hyperscript");

/**
 * Disables all submit buttons in a form.
 */
const disable = form => {
  Array.from(form.querySelectorAll("[type='submit']:enabled")).forEach(
    buttonEl => {
      buttonEl.disabled = true;
      buttonEl.skWasEnabled = true;
    }
  );
};

/**
 * Enables all submit buttons in a form.
 */
const enable = form => {
  Array.from(form.querySelectorAll("[type='submit']:disabled")).forEach(
    buttonEl => {
      if (buttonEl.skWasEnabled) {
        buttonEl.disabled = false;
      }
    }
  );
};

/**
 * Clears validation errors.
 */
const clearErrors = form => {
  Array.from(form.querySelectorAll("[data-sk-errors]")).forEach(el => {
    el.innerHTML = "";
  });
};

/**
 * Submits the form.
 */
const submit = (form, props) => {
  const id = props.id;
  const url = STATICKIT_URL + "/j/forms/" + id + "/submissions";

  disable(form);
  clearErrors(form);

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
            if (props.onSuccess) {
              form.parentNode.replaceChild(props.onSuccess, form);
            }
            break;

          default:
            logger.log(id, "Validation error", data);
            break;
        }
      });
    })
    .catch(error => logger.log(id, "Unexpected error ", error))
    .finally(() => {
      enable(form);
    });
};

/**
 * Hijacks form submission.
 */
const setup = (form, props) => {
  logger.log(props.id, "Initializing");

  form.addEventListener("submit", ev => {
    ev.preventDefault();
    submit(form, props);
  });

  Array.from(form.querySelectorAll("[type='submit']:disabled")).forEach(
    buttonEl => {
      buttonEl.disabled = false;
    }
  );
};

module.exports = {
  init: (selector, propsFn) => {
    const form = document.querySelector(selector);

    if (!form) {
      logger.log("Element `" + selector + "` not found");
      return;
    }

    if (typeof propsFn !== "function") {
      logger.log("`props` must be a function");
      return;
    }

    return setup(form, propsFn.call(this, h));
  }
};
