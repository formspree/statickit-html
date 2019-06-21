/**
 * Module dependencies.
 */

const logger = require("./logger")("forms");

/**
 * Gets all `<form>` elements that are under StaticKit control.
 */
const getForms = document => {
  return Array.from(document.forms).filter(form => {
    return getId(form) !== undefined;
  });
};

/**
 * Gets the id from a `<form>` element.
 */
const getId = form => {
  return form.dataset.skId;
};

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
const submit = form => {
  const id = getId(form);
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
const setup = form => {
  form.addEventListener("submit", ev => {
    ev.preventDefault();
    submit(form);
  });
};

module.exports = {
  init: () => {
    logger.log("Initializing forms");
    return getForms(window.document).map(setup);
  }
};
