/* ============================================================
   메인 화면: "산성비"형 단어 낙하 + 배경 순환 + 입력 판정
   ============================================================ */

/* about 소개글 원문 (Figma about 프레임 기준) — 이 텍스트를 어절 단위로 쪼개 사용 */
const ABOUT_INTRO = `윤수현(Su) 윤수현은 서울을 기반으로 활동하는 그래픽 디자이너다. 출판, 전시, 인터랙티브 설치, 웹 기반 프로젝트를 넘나들며 이미지가 생성되고 유통되는 방식을 탐구한다. 최근에는 경험이 곧 그래픽이 되는 방식을 탐구하며, 그래픽을 사후의 기록이 아닌 끊임없이 생성되고 변화하는 매체로 다루고 있다. 서울시립대학교 시각디자인학과를 졸업하고, 독일 쾰른국제디자인학교(Köln International School of Design, KISD)에서 교환학생으로 수학했다. 현재 서울시립대학교 시각디자인전공 석사과정에 재학 중이다. 언더그라운드 아트 컬렉티브 Raw Hearts의 아트 디렉터로 활동하며 전시, 파티, 출판 등 다양한 프로젝트의 비주얼 아이덴티티를 기획하고 있다. 또한 문화, 음악, 패션을 주제로 에디토리얼 작업을 병행하며 무신사, Habo, Cakeshop 등을 비롯한 여러 브랜드에서 인터뷰, 아티클, 큐레이션 콘텐츠를 제작해 왔다. 동시대 시각문화와 서브컬처를 기록하고 해석하는 작업을 지속하고 있다. 최근에는 개인전 Undoing을 비롯한 참여형 설치 작업과 독립 출판 프로젝트를 통해 그래픽 디자인의 확장 가능성을 탐구하고 있으며, 연구와 실천을 병행하며 그래픽 디자인의 새로운(혹은 이미 가지고 있었던) 역할을 실험하고 있다.`;

/* 소개글을 공백 기준으로 어절 분해 (문장부호 그대로 유지) */
const WORDS = ABOUT_INTRO.split(/\s+/).filter(Boolean);

/* 순환할 배경색 4종 (Figma primary 01~04) */
const BG_COLORS = ["#d298ff", "#fffb00", "#00d9ff", "#00ff4d"];

/* 낙하 파라미터 (계단식: 0.5초마다 10px씩 즉시 이동, 모두 같은 속도) */
const SPAWN_INTERVAL = 3000; // 새 파편 생성 간격(ms)
const MAX_ACTIVE = 30; // 화면에 동시에 존재할 최대 파편 수
const STEP_INTERVAL = 500; // 낙하 간격(ms)
const STEP_DISTANCE = 20; // 한 번에 내려가는 거리(px)
const COVER_INTERVAL = 3500; // 커버·배경색 순환 간격(ms)

/* 상태 */
let works = []; // works.json 로드 결과
let wordIndex = 0; // 어절 순서 인덱스
let coverIndex = 0; // 커버·색 순환 인덱스
const fragments = []; // 현재 떨어지는 파편들 { el, x, y, speed, text }

/* DOM 참조 */
const rain = document.querySelector(".word-rain");
const input = document.querySelector(".typing-box__input");
const stageBg = document.querySelector(".stage__bg");
const cover = document.querySelector(".stage__cover");

/* ------------------------------------------------------------
   works.json 로드 (없어도 화면은 동작)
   ------------------------------------------------------------ */
function loadWorks() {
  return loadWorksData("")
    .then((data) => {
      works = data;
      startCoverCycle();
    })
    .catch(() => {
      works = [];
      startCoverCycle();
    });
}

/* ------------------------------------------------------------
   배경 커버 + 색 순환 (커버가 바뀔 때마다 색도 다음으로)
   ------------------------------------------------------------ */
function applyCover() {
  stageBg.style.backgroundColor = BG_COLORS[coverIndex % BG_COLORS.length];

  if (works.length > 0) {
    const work = works[coverIndex % works.length];
    cover.src = work.thumbnail;
    cover.classList.add("is-visible");
  }
}

function startCoverCycle() {
  applyCover();
  setInterval(() => {
    coverIndex += 1;
    applyCover();
  }, COVER_INTERVAL);
}

/* ------------------------------------------------------------
   단어 파편 생성 & 낙하
   ------------------------------------------------------------ */
function spawnFragment() {
  if (fragments.length >= MAX_ACTIVE) return;

  const text = WORDS[wordIndex % WORDS.length];
  wordIndex += 1;

  const el = document.createElement("span");
  el.className = "word-fragment";
  el.textContent = text;
  rain.appendChild(el);

  // 렌더 후 실제 폭을 재서 화면을 벗어나지 않게 x좌표 계산
  const maxX = Math.max(0, window.innerWidth - el.offsetWidth - 8);
  const x = Math.random() * maxX;

  const fragment = { el, x, y: -30, text };
  fragments.push(fragment);
  render(fragment);
}

function render(f) {
  // 낙하 단어는 한글 자폭(0.83)에 맞춰 압축 (word-rain은 자동 시스템에서 제외됨)
  f.el.style.transform = `translate(${f.x}px, ${f.y}px) scaleX(0.83)`;
}

function removeFragment(index) {
  const f = fragments[index];
  if (!f) return;
  f.el.remove();
  fragments.splice(index, 1);
}

/* 계단식 낙하: 0.5초마다 모든 파편을 10px씩 즉시 아래로 이동 */
function stepFall() {
  const limit = window.innerHeight + 40;
  for (let i = fragments.length - 1; i >= 0; i--) {
    const f = fragments[i];
    f.y += STEP_DISTANCE;
    if (f.y > limit) {
      removeFragment(i); // 바닥에 닿으면 사라짐
    } else {
      render(f);
    }
  }
}

/* ------------------------------------------------------------
   입력 판정: Enter 또는 send 클릭 시, 떨어지는 어절과 일치하면 랜덤 작품으로 이동
   (문장부호 포함, 정확히 일치)
   ------------------------------------------------------------ */
function goToRandomWork() {
  if (works.length === 0) return;
  const random = works[Math.floor(Math.random() * works.length)];
  window.location.href = `work/view/#${random.slug}`;
}

function tryMatch() {
  const value = input.value.trim();
  if (!value) return;

  const hit = fragments.some((f) => f.text === value);
  if (hit) {
    input.value = "";
    goToRandomWork();
  }
}

function handleSubmit(e) {
  e.preventDefault();
  tryMatch();
}

/* ------------------------------------------------------------
   시작
   ------------------------------------------------------------ */
function init() {
  const form = document.querySelector(".typing-box");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
  loadWorks();
  setInterval(spawnFragment, SPAWN_INTERVAL);
  spawnFragment();
  setInterval(stepFall, STEP_INTERVAL);
}

init();
