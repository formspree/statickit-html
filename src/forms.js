const getForms = document => {
  return Array.from(document.forms).filter(el => {
    return el.dataset.skId !== undefined;
  });
};

const disableSubmitButton = formEl => {
  Array.from(formEl.querySelectorAll("[type='submit']")).forEach(buttonEl => {
    buttonEl.disabled = true;
  });
};

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
