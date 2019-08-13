# StaticKit Standalone

The standalone JavaScript library for StaticKit.

## Getting Started

Run the following to install via npm:

```
npm install @statickit/standalone
```

If you are not using an npm-based build pipeline, you can install using our CDN instead:

```html
<script defer src="https://js.statickit.com/statickit.js"></script>
```

It's best to install the script somewhere in your layout file, so it will load on every page. Loading and execution are async, so our script will never impact your site performance.

### Simple example

Here's a simple example of a StaticKit-powered form:

```html
<!-- On the page -->
<form id="my-form">
  <label for="email">Email</label>
  <input id="email" type="email" name="email" value="" />
  <button type="submit">Sign up</button>
</form>
```

If you are using the npm package:

```js
import sk from '@statickit/standalone';

sk('form', '#my-form', {
  id: '[your form id]'
});
```

If you are using the CDN:

```html
<script>
  window.sk=window.sk||function(){(sk.q=sk.q||[]).push(arguments)};

  sk('form', '#my-form', {
    id: '[your form id]'
  });
</script>
```

At a minimum, you just need to pass your StaticKit form `id` via the config object to get a working form.

### Customizing post-submit behavior

The most common thing you’ll want to customize is the behavior after the form is submitted. By default, the `<form>` element gets replaced with an unstyled “Thank you!” `<div>` element.

Here's an example config that replaces the form with a custom message:

```js
sk('form', '#my-form', {
  id: '[your form id]',
  onSuccess: function(config) {
    var h = config.h;
    var form = config.form;
    var replacement = h('div.success-message', 'Thank you for joining!');
    form.parentNode.replaceChild(replacement, form);
  }
});
```

Let's step through what's happening here:

- `config.h` is a simple helper for creating DOM nodes called [HyperScript](https://github.com/hyperhype/hyperscript)
- `config.form` is a reference to the `<form>` element
- `replacement` is new element to swap in for the `<form>`
- The last line does the actual DOM node replacement

If you want to redirect to a different page, you can do that too:

```js
sk('form', '#my-form', {
  id: '[your form id]',
  onSuccess: function(config) {
    window.location.href = '/thank-you';
  }
});
```

### Rendering validation errors

Most of the time, it will be sufficient to use standard HTML validation attributes, such as the `required` attribute. But you can optionally configure server-side validations to ensure bad data does not slip through.

When validation errors occur, the client library will look for an element with a `data-sk-error` attribute and populate it with validation errors for the corresponding field:

```html
<form id="my-form">
  <label for="email">Email</label>
  <input id="email" type="email" name="email" value="" />
  <div data-sk-error="email" class="error-message"></div>
  <button type="submit">Sign up</button>
</form>
```
