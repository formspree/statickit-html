# StaticKit HTML

The HTML library for [StaticKit](https://statickit.com).

## Getting Started

Run the following to install via npm:

```
npm install @statickit/html
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
import sk from '@statickit/html';

sk('form', 'init', {
  id: '[...]',
  element: '#my-form'
});
```

If you are using the CDN:

```html
<script>
  window.sk =
    window.sk ||
    function() {
      (sk.q = sk.q || []).push(arguments);
    };

  sk('form', 'init', {
    id: '[...]',
    element: '#my-form'
  });
</script>
```

At a minimum, you just need to pass your StaticKit form `id` via the config object to get a working form.

### Customizing post-submit behavior

The most common thing you’ll want to customize is the behavior after the form is submitted. By default, the `<form>` element gets replaced with an unstyled “Thank you!” `<div>` element.

Here's an example config that replaces the form with a custom message:

```js
sk('form', 'init', {
  id: '[...]',
  element: '#my-form',
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
sk('form', 'init', {
  id: '[...]',
  element: '#my-form',
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

### Passing additional form fields

If you need to include some additional fields programmatically, you can define them in the `data` config.

```js
// This will append a `userAgent` field to the form data
sk('form', 'init', {
  id: '[...]',
  element: '#my-form',
  data: {
    userAgent: navigator.userAgent
  }
});
```

Your `data` object values can either be static or functions (that will be called at submission time):

```js
sk('form', 'init', {
  id: '[...]',
  element: '#my-form',
  data: {
    pageTitle: function() {
      return document.title;
    }
  }
});
```

### Customizing email subject line & reply-to address

If you have an email notification action configured for your form, you can customize the subject line and reply-to address by including special fields in your form submission:

- `_subject` - use this field to set the subject line
- `_replyto` or `email` - use either of these fields to set the reply address

You may add `<input>` fields to your form to make these settable by the user, or set them programmatically:

```js
sk('form', 'init', {
  id: '[...]',
  element: '#my-form',
  data: {
    _subject: 'New contact submission'
  }
});
```
