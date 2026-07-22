/* ============================================================
   About 페이지 데이터 (직접 편집)
   - ko / en 객체로 국문·영문 관리
   - 문자열은 백틱(`) 가능, HTML(mark/br 등)은 intro.paragraphs·cv label(en) 에 사용
   ============================================================ */
window.ABOUT_RAW = {
  cvGrid: [
    {
      label: { ko: "학력", en: "Education" },
      rows: [
        {
          year: "2025–",
          desc: {
            ko: "서울시립대학교 디자인전문대학원 시각디자인전공 석사과정",
            en: "MFA, Visual Design, University of Seoul",
          },
        },
        {
          year: "2025",
          desc: {
            ko: "서울시립대학교 시각디자인학과 졸업 (우등졸업)",
            en: "BFA, Visual Design, cum laude, University of Seoul",
          },
        },
        {
          year: "2023",
          desc: {
            ko: "독일 쾰른국제디자인학교(Köln International School of Design, KISD) 교환학생",
            en: "Exchange Student, Köln International School of Design (KISD)",
          },
        },
      ],
    },
    {
      label: { ko: "개인전", en: `Solo<br class="cv-label-br"> Exhibitions` },
      rows: [
        {
          year: "2026",
          desc: {
            ko: "《Undoing》, Cakeshop, 서울",
            en: "Undoing, Cakeshop, Seoul",
          },
        },
      ],
    },
    {
      label: {
        ko: "그룹전",
        en: `Selected<br class="cv-label-br"> Exhibitions`,
      },
      rows: [
        {
          year: "2025",
          desc: {
            ko: "《Gridshift》, 한국타이포그라피학회, 서울",
            en: "Gridshift, Korean Society of Typography",
          },
        },
        {
          year: "2025",
          desc: {
            ko: "《푸름의 밀도》, 청년예술매거진 Dear.A 제3회 예술 컨퍼런스 기획전, 성신여자대학교 가온갤러리, 서울",
            en: "The Density of Youth, Dear.A 3rd Art Conference, Gaon Gallery, Sungshin Women's University, Seoul",
          },
        },
      ],
    },
  ],
  cvClient: {
    label: { ko: "클라이언트", en: "Clients & Collaborators" },
    text: {
      ko: "무신사, 코오롱스포츠, 슬기와 민, 블루메미술관(BMCA), 오민, 케이크샵(Cakeshop), 하보, 해파, 샌드박스게이밍(SBXG), 서울시립대학교",
      en: "MUSINSA, Kolon Sport, Sulki and Min, Blume Museum of Contemporary Art (BMCA), Min Oh, Cakeshop, Habo, Haepa, SBXG (Sandbox Gaming), University of Seoul",
    },
  },
  intro: {
    name: { ko: "윤수현(Su)", en: "Su Hyun Youn (Su)" },
    paragraphs: [
      {
        ko: "윤수현은 서울을 기반으로 활동하는 그래픽 디자이너다. 출판, 전시, 인터랙티브 설치, 웹 기반 프로젝트를 넘나들며 이미지가 생성되고 유통되는 방식을 탐구한다. 최근에는 경험이 곧 그래픽이 되는 방식을 탐구하며, 그래픽을 사후의 기록이 아닌 끊임없이 생성되고 변화하는 매체로 다루고 있다.",
        en: "Su Hyun Youn is a graphic designer based in Seoul. Working across publishing, exhibitions, interactive installations, and web-based projects, she explores how graphic forms are generated and circulated. Her recent practice investigates how experience itself becomes graphic form, treating graphic design not as a retrospective record but as a medium that is continuously produced and transformed.",
      },
      {
        ko: "서울시립대학교 시각디자인학과를 졸업하고, 독일 쾰른국제디자인학교(Köln International School of Design, KISD)에서 교환학생으로 수학했다. 현재 서울시립대학교 시각디자인전공 석사과정에 재학 중이다.",
        en: "She received her BFA in Visual Design from the University of Seoul and studied as an exchange student at the Köln International School of Design (KISD) in Germany. She is currently pursuing an MFA in Visual Design at the University of Seoul.",
      },
      {
        ko: `언더그라운드 아트 컬렉티브 <mark class="hl">Raw Hearts</mark>의 아트 디렉터로 활동하며 전시, 파티, 출판 등 다양한 프로젝트의 비주얼 아이덴티티를 기획하고 있다. 또한 문화, 음악, 패션을 주제로 에디토리얼 작업을 병행하며 <mark class="hl">무신사</mark>, <mark class="hl">Habo</mark>, <mark class="hl">Cakeshop</mark> 등을 비롯한 여러 브랜드에서 인터뷰, 아티클, 큐레이션 콘텐츠를 제작해 왔다. 동시대 시각문화와 서브컬처를 기록하고 해석하는 작업을 지속하고 있다.`,
        en: "As the art director of the underground art collective Raw Hearts, she develops visual identities for exhibitions, parties, and publishing projects. She also works as an editor across the fields of culture, music, and fashion, producing interviews, articles, and curated content for publications and platforms including MUSINSA, Habo, and Notes from Cake.",
      },
      {
        ko: "최근에는 개인전 Undoing을 비롯한 참여형 설치 작업과 독립 출판 프로젝트를 통해 그래픽 디자인의 확장 가능성을 탐구하고 있으며, 연구와 실천을 병행하며 그래픽 디자인의 새로운(혹은 이미 가지고 있었던) 역할을 실험하고 있다.",
        en: "Through participatory installations—including her solo exhibition Undoing—and independent publishing projects, she explores the expanded possibilities of graphic design, investigating its evolving role beyond the printed page.",
      },
    ],
  },
  contact: [
    { label: "email", value: "syoun.kr@gmail.com" },
    { label: "instagram", value: "@suhyun.youn" },
  ],
};
