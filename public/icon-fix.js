(function () {
  'use strict';

  // Re-decode a string by treating each char's code point as a raw byte
  // and running the full byte sequence through TextDecoder (UTF-8).
  // Handles mixed strings like "Rs.85,000" where only Rs. part is garbled.
  function fixString(str) {
    var chars = Array.from(str);
    var result = '';
    var i = 0;

    while (i < chars.length) {
      var b0 = chars[i].codePointAt(0);

      // ASCII range: pass through unchanged
      if (b0 < 0x80) {
        result += chars[i];
        i++;
        continue;
      }

      // High byte: try to consume a valid UTF-8 multi-byte sequence
      var seqLen =
        b0 >= 0xF0 && b0 <= 0xF7 ? 4 :
        b0 >= 0xE0 && b0 <= 0xEF ? 3 :
        b0 >= 0xC2 && b0 <= 0xDF ? 2 : 0;

      if (seqLen > 0 && i + seqLen <= chars.length) {
        var bytes = [b0];
        var ok = true;
        for (var j = 1; j < seqLen; j++) {
          var bj = chars[i + j].codePointAt(0);
          if (bj >= 0x80 && bj <= 0xBF) {
            bytes.push(bj);
          } else {
            ok = false;
            break;
          }
        }
        if (ok) {
          try {
            var decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            result += decoded;
            i += seqLen;
            continue;
          } catch (e) {}
        }
      }

      // Not a valid sequence start - pass through as-is
      result += chars[i];
      i++;
    }

    return result;
  }

  function needsFix(str) {
    for (var k = 0; k < str.length; k++) {
      var cp = str.charCodeAt(k);
      if (cp >= 0x80 && cp <= 0xFF) return true;
    }
    return false;
  }

  var busy = false;

  function patchTree(root) {
    if (busy) return;
    busy = true;
    try {
      var walker = document.createTreeWalker(
        root || document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      var node;
      while ((node = walker.nextNode())) {
        var val = node.nodeValue;
        if (val && needsFix(val)) {
          var fixed = fixString(val);
          if (fixed !== val) node.nodeValue = fixed;
        }
      }
    } finally {
      busy = false;
    }
  }

  var observer = new MutationObserver(function (mutations) {
    if (busy) return;
    for (var mi = 0; mi < mutations.length; mi++) {
      var added = mutations[mi].addedNodes;
      for (var ni = 0; ni < added.length; ni++) {
        var n = added[ni];
        if (n.nodeType === 3) {
          // Text node added directly
          if (needsFix(n.nodeValue)) n.nodeValue = fixString(n.nodeValue);
        } else if (n.nodeType === 1) {
          patchTree(n);
        }
      }
      // Also handle characterData mutations (React updating text nodes)
      if (mutations[mi].type === 'characterData') {
        var node = mutations[mi].target;
        if (node.nodeValue && needsFix(node.nodeValue)) {
          busy = true;
          node.nodeValue = fixString(node.nodeValue);
          busy = false;
        }
      }
    }
  });

  function init() {
    patchTree(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
