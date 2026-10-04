(() => {
  if (window.top !== window || location.origin !== 'https://video.manh.marketing') return;
  const listeners = new Set();
  const call = (method, args) => window.webkit.messageHandlers.aiev.postMessage({method, ...args});
  const bridge = {
    version: '0.6.0', platform: 'ios',
    request: (endpoint, body) => call('request', {endpoint, body}),
    cancelChat: id => call('cancel', {id}),
    onActivity: callback => { listeners.add(callback); return () => listeners.delete(callback); },
    open: id => call('open', {id}),
    save: id => call('open', {id}),
  };
  Object.defineProperty(window, 'aievDesktop', {value: Object.freeze(bridge), writable: false});
  Object.defineProperty(window, '__aievActivity', {value: event => {
    for (const listener of listeners) { try { listener(event); } catch {} }
  }, writable: false});
})();
