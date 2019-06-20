/**
 * Module dependencies.
 */

const logger = require("./logger")("forms");

/**
 * Gets all `<form>` elements that are under StaticKit control.
 */
const getForms = document => {
  return Array.from(document.forms).filter(formEl => {
    return getFormId(formEl) !== undefined;
  });
};

/**
 * Gets the SK ID from a `<form>` element.
 */
const getFormId = formEl => {
  return formEl.dataset.skId;
};

/**
 * Disables all submit buttons in a form.
 */
const disable = formEl => {
  Array.from(formEl.querySelectorAll("[type='submit']:enabled")).forEach(
    buttonEl => {
      buttonEl.disabled = true;
      buttonEl.skWasEnabled = true;
    }
  );
};

/**
 * Enables all submit buttons in a form.
 */
const enable = formEl => {
  Array.from(formEl.querySelectorAll("[type='submit']:disabled")).forEach(
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
const clearErrors = formEl => {
  Array.from(formEl.querySelectorAll("[data-sk-errors]")).forEach(el => {
    el.innerHTML = "";
  });
};

/**
 * Submits the form.
 */
const submit = formEl => {
  const id = getFormId(formEl);
  const url = STATICKIT_URL + "/j/forms/" + id + "/submissions";

  disable(formEl);

  logger.log(id, "Submitting form");

  fetch(url, {
    method: "POST",
    mode: "cors",
    body: new FormData(formEl)
  })
    .then(response => {
      if (response.status == 200) {
        return response.json().then(data => {
          logger.log(id, "Submission succeeded");
          enable(formEl);
        });
      } else {
        return response.json().then(data => {
          logger.log(id, "Submission failed", data);
          enable(formEl);
        });
      }
    })
    .catch(error => logger.log("Error: ", error));
};

/**
 * Hijacks form submission.
 */
const setupForm = formEl => {
  formEl.addEventListener("submit", ev => {
    ev.preventDefault();
    submit(formEl);
  });
};

module.exports = {
  init: () => {
    logger.log("Initializing forms");
    return getForms(window.document).map(setupForm);
  }
};
