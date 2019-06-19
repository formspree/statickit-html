/**
 * Gets all `<form>` elements that are under StaticKit control.
 */
const getForms = document => {
  return Array.from(document.forms).filter(el => {
    return el.dataset.skId !== undefined;
  });
};

/**
 * Disables all submit buttons in a form.
 */
const disableSubmitButton = formEl => {
  Array.from(formEl.querySelectorAll("[type='submit']")).forEach(buttonEl => {
    buttonEl.disabled = true;
  });
};

/**
 * Hijacks form submission.
 */
const setupForm = formEl => {
  formEl.addEventListener("submit", ev => {
    ev.preventDefault();
    disableSubmitButton(formEl);
    console.log("Form submission intercepted");
  });
};

module.exports = {
  init: () => {
    return getForms(window.document).map(setupForm);
  }
};
