/* ============================================================
   자폭 조정 시스템 (모든 페이지 공용)
   ------------------------------------------------------------
   [폰트] Arial(영문) + Pretendard(한글, unicode-range) — CSS가 담당.
          이 스크립트는 모든 텍스트(한글·영문·숫자·기호 등)에 0.83 자폭 압축.

   [원리]
   1) 텍스트에서 공백이 아닌 구간을 <span class="char-narrow">로 감쌈
   2) .char-narrow 는 CSS 에서 transform: scaleX(0.83) 으로 가로만 압축
   3) inline-block + transform 은 레이아웃 폭이 그대로 남아 오른쪽에 빈틈이
      생기므로, 줄어든 만큼(원래폭 * (1 - 0.83))을 음수 margin-right 로 당겨
      뒤 글자가 자연스럽게 붙도록 보정

   [자동화]
   - 최초 로드 시 본문 전체 처리
   - JS 로 나중에 추가되는 텍스트(작품 제목·소개 등)는 MutationObserver 로 자동 처리
   - 웹폰트 로딩 완료 / 창 크기 변경 시 폭 보정값 재계산
   ============================================================ */
(function () {
  "use strict";

  var SCALE = 0.83;
  var NARROW_CLASS = "char-narrow";

  /* 공백 제외 모든 텍스트(한글·영문·숫자·기호 등) — 압축 대상 */
  var COMPRESS_TEST = /\S/u;
  var COMPRESS_RUN = /\S+/gu;

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
      if (el.classList.contains("han-narrow")) return true;
      if (el.classList.contains("word-rain")) return true;
      if (el.classList.contains("word-fragment")) return true;
      /* blend 박스: 내부 char-narrow transform 이 mix-blend-mode 를 깨뜨림 (모바일 Safari) */
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

  function wrapTextNode(node, createdSpans) {
    var text = node.nodeValue;
    if (!text || !COMPRESS_TEST.test(text)) return;

    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    COMPRESS_RUN.lastIndex = 0;

    while ((m = COMPRESS_RUN.exec(text))) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      var span = document.createElement("span");
      span.className = NARROW_CLASS;
      span.textContent = m[0];
      frag.appendChild(span);
      createdSpans.push(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  function collectTextNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !COMPRESS_TEST.test(n.nodeValue)) {
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

    /* blend 박스: scaleX 는 outer, blend 는 inner — outer 폭 기준 여백 보정 */
    var boxes = document.querySelectorAll(".works__filters-outer, .works__views-outer");
    for (i = 0; i < boxes.length; i++) boxes[i].style.marginRight = "";
    for (i = 0; i < boxes.length; i++) {
      w = boxes[i].offsetWidth;
      if (w) boxes[i].style.marginRight = -(w * (1 - SCALE)) + "px";
    }
  }

  function applyToRoots(roots) {
    var targets = [];
    roots.forEach(function (r) {
      if (r.nodeType === 3) {
        if (COMPRESS_TEST.test(r.nodeValue || "") && !ancestorSkipped(r)) {
          targets.push(r);
        }
      } else if (r.nodeType === 1 && !shouldSkip(r)) {
        targets = targets.concat(collectTextNodes(r));
      }
    });
    if (!targets.length) return;

    if (observer) observer.disconnect();

    var created = [];
    targets.forEach(function (t) {
      wrapTextNode(t, created);
    });
    compensateAll();

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
      document.fonts.ready.then(compensateAll);
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(compensateAll, 150);
    });

    window.FontNarrow = { apply: apply, refresh: compensateAll, scale: SCALE };
    window.HanNarrow = window.FontNarrow;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
