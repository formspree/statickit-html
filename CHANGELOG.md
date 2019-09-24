# Changelog

## 1.0.0-beta.10

- Update StaticKit Core
- Remove `core-js` dependency in favor of simply pulling in specific polyfills.

## 1.0.0-beta.9

- [Refactoring] Use the `@statickit/core` library.

## 1.0.0-beta.8

- [Bug Fix] Multiple forms on a page were not submitting properly.

Since we were not deeply-copying default config attributes, values were colliding during initialization.

## 1.0.0-beta.7

- [Feature] New argument structure (backwards compatibility retained)

Previously, the form component was initialized as follows:

```
sk('form', '#my-form', { ... })
```

where `#my-form` is the selector targeting the form node.

There are a few problems with this:

- The positional argument is not self-documenting
- `id` is also a required prop, but it lives in the third object (this is inconsistent)
- It's inherently inflexible; what if we want to offer a teardown call, for example?

Now, calls will take the form:

```
sk(scope, method, config)
```

So, initializing a form will look like this:

```
sk('form', 'init', { id: '...', element: '...' })
```

## 1.0.0-beta.6

- [Feature] Pass response `data` as the second argument to the `onSuccess` handler.

## 1.0.0-beta.5

- [Bug Fix] Initializing with the command queue was broken.

## 1.0.0-beta.4

- [Feature] Make it less dangerous to override lifecycle callbacks by re-arranging how default behaviors are run.

## 1.0.0-beta.3

- [Bug Fix] Fix argument destructuring that broke after Babel transpiling

## 1.0.0-beta.2

- [Feature] Accept a `fields` object in form config for customizing field pretty names and overriding default error messages.
- [Bug Fix] Install a babel config file to actually enable transpiling.

## 1.0.0-beta.1

- [Feature] Accept a `data` object in form config and append it to the request body.

## 1.0.0-beta.0

- Initial release.
