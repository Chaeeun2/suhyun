/* ============================================================
   한글 자폭 조정 시스템 (모든 페이지 공용)
   ------------------------------------------------------------
   [폰트] 영문·한글 자동 전환은 CSS(@font-face + unicode-range)가 담당.
          이 스크립트는 "한글만 자폭 압축"만 책임집니다.

   [원리]
   1) 페이지의 텍스트에서 "한글 구간"만 찾아 <span class="han-narrow">로 감쌈
   2) .han-narrow 는 CSS 에서 transform: scaleX(0.83) 으로 가로만 압축
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

  /* 압축 비율(자폭) — 요청값 0.83 */
  var SCALE = 0.83;

  /* 한글 판별용 정규식
     - AC00–D7A3: 한글 음절
     - 3130–318F: 호환용 자모 (ㄱ, ㅏ 등)
     - 1100–11FF: 첫가끝(조합용) 자모 */
  var HANGUL_TEST = /[\uAC00-\uD7A3\u3130-\u318F\u1100-\u11FF]/;
  var HANGUL_RUN = /[\uAC00-\uD7A3\u3130-\u318F\u1100-\u11FF]+/g;

  /* 건드리면 안 되는(텍스트를 감싸면 깨지는) 요소들 */
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

  /* 이 요소(또는 그 하위)는 처리에서 제외해야 하는가 */
  function shouldSkip(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS[el.nodeName]) return true;
    if (el.classList) {
      if (el.classList.contains("han-narrow")) return true; // 이미 처리됨
      if (el.classList.contains("word-rain")) return true; // 메인 낙하 단어(main.js가 관리)
      if (el.classList.contains("word-fragment")) return true;
    }
    return false;
  }

  /* 텍스트 노드의 조상 중 제외 대상이 있는지 확인 */
  function ancestorSkipped(node) {
    var p = node.parentNode;
    while (p && p.nodeType === 1) {
      if (shouldSkip(p)) return true;
      p = p.parentNode;
    }
    return false;
  }

  /* 한 개의 텍스트 노드에서 한글 구간만 span 으로 교체.
     생성한 span 들을 배열로 반환 */
  function wrapTextNode(node, createdSpans) {
    var text = node.nodeValue;
    if (!text || !HANGUL_TEST.test(text)) return;

    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    HANGUL_RUN.lastIndex = 0;

    while ((m = HANGUL_RUN.exec(text))) {
      // 한글 앞의 비한글(영문·숫자·기호·공백) 구간은 그대로 텍스트로
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      // 한글 구간 → 압축 span
      var span = document.createElement("span");
      span.className = "han-narrow";
      span.textContent = m[0];
      frag.appendChild(span);
      createdSpans.push(span);
      last = m.index + m[0].length;
    }
    // 마지막 한글 뒤의 나머지 텍스트
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  /* root 하위에서 처리 대상 텍스트 노드 수집 */
  function collectTextNodes(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !HANGUL_TEST.test(n.nodeValue)) {
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

  /* 모든 .han-narrow 의 음수 margin-right 재계산
     (압축으로 생긴 오른쪽 빈틈 제거) */
  function compensateAll() {
    var spans = document.querySelectorAll("span.han-narrow");
    var i;
    // 1) 초기화 후 자연 폭(offsetWidth)을 정확히 측정
    for (i = 0; i < spans.length; i++) spans[i].style.marginRight = "";
    // 2) 측정한 폭 기준으로 보정값 적용
    for (i = 0; i < spans.length; i++) {
      var w = spans[i].offsetWidth;
      if (w) spans[i].style.marginRight = -(w * (1 - SCALE)) + "px";
    }
  }

  /* 여러 root(요소/텍스트 노드)에 대해 한글 감싸기 실행 */
  function applyToRoots(roots) {
    var targets = [];
    roots.forEach(function (r) {
      if (r.nodeType === 3) {
        if (HANGUL_TEST.test(r.nodeValue || "") && !ancestorSkipped(r)) {
          targets.push(r);
        }
      } else if (r.nodeType === 1 && !shouldSkip(r)) {
        targets = targets.concat(collectTextNodes(r));
      }
    });
    if (!targets.length) return;

    // 우리가 span 을 넣는 동안에는 관찰을 멈춰 무한루프 방지
    if (observer) observer.disconnect();

    var created = [];
    targets.forEach(function (t) {
      wrapTextNode(t, created);
    });
    compensateAll();

    if (observer && document.body) observer.observe(document.body, OBS_OPTS);
  }

  /* 외부에서 직접 호출할 수 있는 공개 API */
  function apply(root) {
    applyToRoots([root || document.body]);
  }

  function start() {
    // 1) 최초 정적 콘텐츠 처리
    apply(document.body);

    // 2) 이후 동적으로 추가되는 콘텐츠 자동 처리
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

    // 3) 웹폰트(Pretendard) 로딩이 끝나면 실제 글자폭으로 다시 보정
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(compensateAll);
    }

    // 4) 창 크기 변경 시 폭 재보정
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(compensateAll, 150);
    });

    // 다른 스크립트에서 필요 시 수동 호출 가능
    window.HanNarrow = { apply: apply, refresh: compensateAll };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
