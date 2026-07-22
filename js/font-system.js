/* ============================================================
   자폭 조정 시스템 (모든 페이지 공용)
   ------------------------------------------------------------
   텍스트 노드마다 <span class="char-narrow"> 하나로 감싸 scaleX(0.83) 적용.
   (구간별 regex 분리 없음 — 인앱 브라우저 호환 우선)

   margin-right 보정은 레이아웃 폭 계산 후 rAF/지연 재계산으로 WebView 대응.
   ============================================================ */
(function () {
  "use strict";

  var SCALE = 0.83;
  var NARROW_CLASS = "char-narrow";
  var HAS_TEXT = /\S/;

  var SKIP_TAGS = {
    SCRIPT: 1,
    STYLE: 1,
    NOSCRIPT: 1,
    TEXTAREA: 1,
    INPUT: 1,
    CODE: 1,
    PRE: 1,
  };

  var observer = null;
  var OBS_OPTS = { childList: true, subtree: true };

  function shouldSkip(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS[el.nodeName]) return true;
    if (el.classList) {
      if (el.classList.contains(NARROW_CLASS)) return true;
      if (el.classList.contains("char-narrow--flow")) return true;
      if (el.classList.contains("han-narrow")) return true;
      if (el.classList.contains("word-rain")) return true;
      if (el.classList.contains("word-fragment")) return true;
      if (el.classList.contains("works__filters")) return true;
      if (el.classList.contains("works__views")) return true;
      if (el.classList.contains("works__filters-outer")) return true;
      if (el.classList.contains("works__views-outer")) return true;
    }
    return false;
  }

  function ancestorSkipped(node) {
    var p = node.parentNode;
    while (p && p.nodeType === 1) {
      if (shouldSkip(p)) return true;
      p = p.parentNode;
    }
    return false;
  }

  function wrapTextNode(node) {
    var text = node.nodeValue;
    if (!text || !HAS_TEXT.test(text)) return;

    var span = document.createElement("span");
    span.className = NARROW_CLASS;
    span.textContent = text;
    node.parentNode.replaceChild(span, node);
  }

  function collectTextNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !HAS_TEXT.test(n.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        return ancestorSkipped(n)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function compensateAll() {
    var spans = document.querySelectorAll("span." + NARROW_CLASS);
    var i;
    for (i = 0; i < spans.length; i++) spans[i].style.marginRight = "";
    for (i = 0; i < spans.length; i++) {
      var w = spans[i].offsetWidth;
      if (w) spans[i].style.marginRight = -(w * (1 - SCALE)) + "px";
    }

    var boxes = document.querySelectorAll(".works__filters-outer, .works__views-outer");
    for (i = 0; i < boxes.length; i++) boxes[i].style.marginRight = "";
    for (i = 0; i < boxes.length; i++) {
      w = boxes[i].offsetWidth;
      if (w) boxes[i].style.marginRight = -(w * (1 - SCALE)) + "px";
    }
  }

  function scheduleRefresh() {
    compensateAll();
    if (window.requestAnimationFrame) {
      requestAnimationFrame(compensateAll);
    }
    setTimeout(compensateAll, 100);
  }

  function applyToRoots(roots) {
    var targets = [];
    roots.forEach(function (r) {
      if (r.nodeType === 3) {
        if (HAS_TEXT.test(r.nodeValue || "") && !ancestorSkipped(r)) {
          targets.push(r);
        }
      } else if (r.nodeType === 1 && !shouldSkip(r)) {
        targets = targets.concat(collectTextNodes(r));
      }
    });
    if (!targets.length) return;

    if (observer) observer.disconnect();

    targets.forEach(function (t) {
      wrapTextNode(t);
    });
    scheduleRefresh();

    if (observer && document.body) observer.observe(document.body, OBS_OPTS);
  }

  function apply(root) {
    applyToRoots([root || document.body]);
  }

  function start() {
    apply(document.body);

    observer = new MutationObserver(function (mutations) {
      var roots = [];
      mutations.forEach(function (mt) {
        mt.addedNodes.forEach(function (nd) {
          if (nd.nodeType === 1 || nd.nodeType === 3) roots.push(nd);
        });
      });
      if (roots.length) applyToRoots(roots);
    });
    observer.observe(document.body, OBS_OPTS);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleRefresh);
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scheduleRefresh, 150);
    });

    window.FontNarrow = { apply: apply, refresh: scheduleRefresh, scale: SCALE };
    window.HanNarrow = window.FontNarrow;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
