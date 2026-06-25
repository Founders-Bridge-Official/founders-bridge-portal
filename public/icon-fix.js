(function () {
  'use strict';

  function fixString(str) {
    var chars = Array.from(str);
    var result = '';
    var i = 0;
    while (i < chars.length) {
      var b0 = chars[i].codePointAt(0);
      if (b0 < 0x80) { result += chars[i]; i++; continue; }
      var seqLen =
        b0 >= 0xF0 && b0 <= 0xF7 ? 4 :
        b0 >= 0xE0 && b0 <= 0xEF ? 3 :
        b0 >= 0xC2 && b0 <= 0xDF ? 2 : 0;
      if (seqLen > 0 && i + seqLen <= chars.length) {
        var bytes = [b0]; var ok = true;
        for (var j = 1; j < seqLen; j++) {
          var bj = chars[i + j].codePointAt(0);
          if (bj >= 0x80 && bj <= 0xBF) bytes.push(bj);
          else { ok = false; break; }
        }
        if (ok) {
          try {
            var decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            result += decoded; i += seqLen; continue;
          } catch (e) {}
        }
      }
      result += chars[i]; i++;
    }
    return result;
  }

  // Only flag strings that contain a UTF-8 multi-byte sequence:
  // a start byte (C2-F7) followed immediately by a continuation byte (80-BF).
  // This avoids false positives on single Latin-1 chars like middle-dot U+00B7
  // which, once correctly decoded, would otherwise cause an infinite DOM loop.
  function needsFix(str) {
    for (var k = 0; k < str.length - 1; k++) {
      var cp = str.charCodeAt(k);
      if (cp >= 0xC2 && cp <= 0xF7) {
        var next = str.charCodeAt(k + 1);
        if (next >= 0x80 && next <= 0xBF) return true;
      }
    }
    return false;
  }

  var busy = false;

  function patchTree(root) {
    if (busy) return;
    busy = true;
    try {
      var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = walker.nextNode())) {
        var val = node.nodeValue;
        if (val && needsFix(val)) {
          var fixed = fixString(val);
          if (fixed !== val) node.nodeValue = fixed;
        }
      }
    } finally { busy = false; }
  }

  var observer = new MutationObserver(function (mutations) {
    if (busy) return;
    for (var mi = 0; mi < mutations.length; mi++) {
      var added = mutations[mi].addedNodes;
      for (var ni = 0; ni < added.length; ni++) {
        var n = added[ni];
        if (n.nodeType === 3) {
          if (needsFix(n.nodeValue)) {
            var fixedNode = fixString(n.nodeValue);
            if (fixedNode !== n.nodeValue) n.nodeValue = fixedNode;
          }
        } else if (n.nodeType === 1) { patchTree(n); }
      }
      if (mutations[mi].type === 'characterData') {
        var tn = mutations[mi].target;
        if (tn.nodeValue && needsFix(tn.nodeValue)) {
          var fixedChar = fixString(tn.nodeValue);
          if (fixedChar !== tn.nodeValue) {
            busy = true; tn.nodeValue = fixedChar; busy = false;
          }
        }
      }
    }
  });

  function init() {
    patchTree(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
