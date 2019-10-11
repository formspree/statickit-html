import sk from '../src';

let container;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

it('calls the success callback', () => {
  container.innerHTML = `
    <form id="my-form">
    </form>
  `;

  const form = container.querySelector('form');
  const responseData = { id: '000', data: { email: 'test@example.com' } };

  const mockClient = {
    submitForm: _props => {
      return new Promise(resolve => {
        resolve({ body: responseData, response: { status: 200 } });
      });
    },
    teardown: () => {}
  };

  const result = new Promise(resolve => {
    sk('form', 'init', {
      id: 'xxx',
      element: '#my-form',
      client: mockClient,
      onSuccess: (config, response) => {
        resolve({ config, response });
      }
    });
  }).then(({ response }) => {
    expect(response).toBe(responseData);
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
  const responseData = {
    errors: [
      {
        field: 'email',
        code: 'EMAIL_FORMAT',
        message: 'must be an email address'
      }
    ]
  };

  const mockClient = {
    submitForm: _props => {
      return new Promise(resolve => {
        resolve({ body: responseData, response: { status: 422 } });
      });
    },
    teardown: () => {}
  };

  const result = new Promise(resolve => {
    sk('form', 'init', {
      id: 'xxx',
      element: '#my-form',
      client: mockClient,
      onError: (config, errors) => {
        resolve({ config, errors });
      }
    });
  }).then(({ errors }) => {
    const errorElement = container.querySelector('[data-sk-error]');
    expect(errors).toBe(responseData.errors);
    expect(errorElement.textContent).toBe(
      'This field must be an email address'
    );
  });

  form.dispatchEvent(new Event('submit'));

  return result;
});
