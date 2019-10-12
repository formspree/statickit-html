import sk from '../src';

const successClient = data => ({
  submitForm: _props => {
    return new Promise(resolve => {
      resolve({ body: data, response: { status: 200 } });
    });
  },
  teardown: () => {}
});

const errorClient = data => ({
  submitForm: _props => {
    return new Promise(resolve => {
      resolve({ body: data, response: { status: 422 } });
    });
  },
  teardown: () => {}
});

let container;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

it('fails to init if element is not given', () => {
  expect.assertions(1);

  try {
    sk('form', 'init', {
      id: 'xxx'
    });
  } catch (e) {
    expect(e.message).toBe('You must define an `element` property');
  }
});

it('fails to init if id is not given', () => {
  expect.assertions(1);

  try {
    sk('form', 'init', {
      element: '#my-form'
    });
  } catch (e) {
    expect(e.message).toBe('You must define an `id` property');
  }
});

it('calls the success callback', () => {
  container.innerHTML = `
    <form id="my-form">
    </form>
  `;

  const form = container.querySelector('form');
  const data = { id: '000', data: { email: 'test@example.com' } };

  const result = new Promise(resolve => {
    sk('form', 'init', {
      id: 'xxx',
      element: '#my-form',
      client: successClient(data),
      onSuccess: (config, response) => {
        resolve({ config, response });
      }
    });
  }).then(({ response }) => {
    expect(response).toBe(data);
  });

  form.dispatchEvent(new Event('submit'));

  return result;
});

it('renders errors', () => {
  container.innerHTML = `
    <form id="my-form">
      <div data-sk-error="email"></div>
    </form>
  `;

  const form = container.querySelector('form');
  const data = {
    errors: [
      {
        field: 'email',
        code: 'EMAIL_FORMAT',
        message: 'must be an email address'
      }
    ]
  };

  const result = new Promise(resolve => {
    sk('form', 'init', {
      id: 'xxx',
      element: '#my-form',
      client: errorClient(data),
      onError: (config, errors) => {
        resolve({ config, errors });
      }
    });
  }).then(({ errors }) => {
    const errorElement = container.querySelector('[data-sk-error]');
    expect(errors).toBe(data.errors);
    expect(errorElement.textContent).toBe(
      'This field must be an email address'
    );
  });

  form.dispatchEvent(new Event('submit'));

  return result;
});

it('renders pretty name in error messages', () => {
  container.innerHTML = `
    <form id="my-form">
      <div data-sk-error="email"></div>
    </form>
  `;

  const form = container.querySelector('form');
  const data = {
    errors: [
      {
        field: 'email',
        code: 'EMAIL_FORMAT',
        message: 'must be an email address'
      }
    ]
  };

  const result = new Promise(resolve => {
    sk('form', 'init', {
      id: 'xxx',
      element: '#my-form',
      client: errorClient(data),
      fields: {
        email: {
          prettyName: 'Email'
        }
      },
      onError: (config, errors) => {
        resolve({ config, errors });
      }
    });
  }).then(({ errors }) => {
    const errorElement = container.querySelector('[data-sk-error]');
    expect(errors).toBe(data.errors);
    expect(errorElement.textContent).toBe('Email must be an email address');
  });

  form.dispatchEvent(new Event('submit'));

  return result;
});

it('renders custom error messages', () => {
  container.innerHTML = `
    <form id="my-form">
      <div data-sk-error="email"></div>
    </form>
  `;

  const form = container.querySelector('form');
  const data = {
    errors: [
      {
        field: 'email',
        code: 'EMAIL_FORMAT',
        message: 'must be an email address'
      }
    ]
  };

  const result = new Promise(resolve => {
    sk('form', 'init', {
      id: 'xxx',
      element: '#my-form',
      client: errorClient(data),
      fields: {
        email: {
          errorMessages: {
            emailFormat: 'Oops! This email is not valid.'
          }
        }
      },
      onError: (config, errors) => {
        resolve({ config, errors });
      }
    });
  }).then(({ errors }) => {
    const errorElement = container.querySelector('[data-sk-error]');
    expect(errors).toBe(data.errors);
    expect(errorElement.textContent).toBe('Oops! This email is not valid.');
  });

  form.dispatchEvent(new Event('submit'));

  return result;
});
