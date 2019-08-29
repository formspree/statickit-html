window.__skt || (window.__skt = {});

export default {
  set: function(key, val) {
    window.__skt[key] = val;
    return val;
  },
  get: function(key, defaultValue) {
    return window.__skt[key] || defaultValue;
  },
  inc: function(key) {
    let val = (window.__skt[key] || 0) + 1;
    window.__skt[key] = val;
    return val;
  },
  data: function() {
    return window.__skt;
  }
};
