(function () {
  'use strict';
  var decoder = new TextDecoder('utf-8');
  function fixMojibake(str) {
    var cps = Array.from(str).map(function (c) { return c.codePointAt(0); });
    if (cps.length >= 2 && cps.every(function (cp) { return cp > 127 && cp < 256; })) {
      try {
        var decoded = decoder.decode(new Uint8Array(cps));
        if (decoded && decoded !== str) return decoded;
      } catch (e) {}
    }
    return str;
  }
  function patchAll() {
    var els = document.querySelectorAll('.sb-icon,.stat-icon,.card-icon,[class*="icon"],[class*="Icon"]');
    els.forEach(function (el) {
      if (el.children.length === 0 && el.textContent) {
        var fixed = fixMojibake(el.textContent);
        if (fixed !== el.textContent) el.textContent = fixed;
      }
    });
  }
  var observer = new MutationObserver(function () { patchAll(); });
  function init() {
    patchAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
