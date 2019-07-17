const buildTag = tag => {
  return '[sk:' + tag + ']';
};

export default tag => ({
  log: (...args) => {
    if (!PRODUCTION) console.log(buildTag(tag), ...args);
  },
  error: (...args) => {
    if (!PRODUCTION) console.error(buildTag(tag), ...args);
  }
});
