// Offline interaction model. The catalogue contains only visible achievement definitions.
const $ = (selector) => document.querySelector(selector);
const assetRoot = "../../assets/achievements/first-edition/";
const cardsById = new Map(catalogue.map((card) => [card.id, card]));
const getCard = (id) => cardsById.get(id);
const pageSize = 8;
let locale =
  new URLSearchParams(location.search).get("lang") === "ja" ? "ja" : "en";
let subject = "ja",
  screen = "gallery",
  tab = "earned",
  pageIndex = 0,
  filter = "all";
const translate = (en, ja) => (locale === "ja" ? ja : en);
const local = (pair) => pair[locale === "ja" ? 1 : 0];
const title = (card) => local(card.title);
const safe = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const subjectName = () =>
  subject === "ja"
    ? translate("Japanese", "日本語")
    : translate("English", "英語");
const progress = {
  ja: {
    earned: ["study-streak-0003", "lessons-0001", "cards-0001"],
    studied: 24,
    answered: false,
  },
  en: { earned: [], studied: 0, answered: false },
};
const current = () => progress[subject];
const date = () =>
  new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(2026, 10, 18));
const group = (id) =>
  /^(lessons-|lesson-weeks-)/.test(id)
    ? "lessons"
    : /^loyalty-/.test(id)
      ? "loyalty"
      : "study";
const image = (id, size, locked = false, lazy = false) =>
  '<img alt="" ' +
  (lazy ? 'loading="lazy" decoding="async" ' : "") +
  'class="art ' +
  (locked ? "locked" : "") +
  '" width="' +
  size +
  '" height="' +
  size +
  '" src="' +
  assetRoot +
  (size <= 64 ? "thumbs/" : "native/") +
  id +
  '.png">';
const button = (action, label, style = "pill") =>
  '<button data-action="' +
  action +
  '" class="' +
  style +
  '">' +
  safe(label) +
  "</button>";
const detailButton = (card, label) =>
  '<button class="pill" data-detail="' +
  card.id +
  '">' +
  safe(label) +
  "</button>";
const countLabel = () =>
  translate(
    current().earned.length + " of 39 earned",
    "39個中" + current().earned.length + "個を獲得",
  );
const studyTarget = () =>
  current().studied === 0 ? 1 : current().studied < 25 ? 25 : 100;
const goalCard = () =>
  getCard("cards-" + String(studyTarget()).padStart(4, "0"));
const galleryLabel = () => translate("Art Gallery", "アートギャラリー");
function galleryAccess() {
  return Object.values(progress).some((data) => data.earned.length);
}
function tile(card) {
  const earned = current().earned.includes(card.id);
  return (
    '<button class="tile" data-detail="' +
    card.id +
    '">' +
    image(card.id, 128, !earned, true) +
    "<b>" +
    safe(title(card)) +
    "</b><small>" +
    (earned ? translate("Earned", "獲得済み") : translate("Locked", "未獲得")) +
    "</small></button>"
  );
}
function galleryPage(items, renderTile, skip = 0) {
  const start = skip + pageIndex * pageSize;
  const end = start + pageSize;
  const tiles = items.slice(start, end).map(renderTile).join("");
  const grid = '<div class="grid">' + tiles + "</div>";
  if (items.length - skip <= pageSize) return grid;
  const pages = Math.ceil((items.length - skip) / pageSize);
  const previous =
    pageIndex > 0
      ? button("previous-page", translate("Previous page", "前のページ"))
      : "";
  const next =
    end < items.length
      ? button("next-page", translate("Next page", "次のページ"))
      : "";
  const label = translate(
    `Page ${pageIndex + 1} of ${pages}`,
    `${pages}ページ中${pageIndex + 1}ページ`,
  );
  return (
    grid +
    '<div class="actions">' +
    previous +
    "<small>" +
    label +
    "</small>" +
    next +
    "</div>"
  );
}
function gallery() {
  const isAll = tab === "all",
    newest = getCard(current().earned[0]);
  const tabs = ["earned", "all"]
    .map(
      (key, index) =>
        '<button data-action="' +
        key +
        '" aria-pressed="' +
        (key === tab) +
        '">' +
        [
          translate("My gallery", "マイギャラリー"),
          translate("All achievements", "すべての実績"),
        ][index] +
        "</button>",
    )
    .join("");
  let content = "";
  if (!isAll && newest) {
    content =
      '<section class="feature" id="featured"><div class="plate">' +
      image(newest.id, 256) +
      '</div><div class="info"><small>' +
      translate("Most recently earned", "最近獲得した作品") +
      "</small><h2>" +
      safe(title(newest)) +
      "</h2><p>" +
      safe(local(newest.caption)) +
      "</p>" +
      detailButton(newest, translate("View artwork", "作品を見る")) +
      "</div></section>";
    if (current().earned.length > 1)
      content +=
        "<h2>" +
        translate("In your collection", "コレクション") +
        "</h2>" +
        galleryPage(current().earned, (id) => tile(getCard(id)), 1);
  } else if (!isAll) {
    content =
      '<section id="empty" class="space"><h2>' +
      translate("Your first artwork", "最初の作品") +
      "</h2><p>" +
      safe(local(getCard("cards-0001").rule)) +
      '</p><div class="actions">' +
      button(
        "practice",
        translate("Study flashcards", "カードを学習する"),
        "pill primary",
      ) +
      "</div></section>";
  } else {
    const cards = catalogue.filter(
      (card) => filter === "all" || group(card.id) === filter,
    );
    const opts = [
      ["all", "All categories", "全カテゴリー"],
      ["study", "Study", "学習"],
      ["lessons", "Lessons", "レッスン"],
      ["loyalty", "Loyalty", "継続"],
    ]
      .map(
        ([val, en, ja]) =>
          '<option value="' +
          val +
          '" ' +
          (val === filter ? "selected" : "") +
          ">" +
          translate(en, ja) +
          "</option>",
      )
      .join("");
    content =
      '<div class="controls"><label>' +
      translate("Category", "カテゴリー") +
      ' <select id="filter">' +
      opts +
      "</select></label></div>" +
      galleryPage(cards, tile);
    if (filter === "all")
      content +=
        '<div class="strip rule space"><span class="mystery" aria-hidden="true">?</span><b>' +
        translate("3 hidden achievements", "秘密の実績 3個") +
        "</b></div>";
  }
  return (
    "<h1>" +
    galleryLabel() +
    '</h1><p class="muted">' +
    subjectName() +
    " · " +
    translate("First Edition", "第1弾") +
    " · " +
    countLabel() +
    '</p><div class="tabs space">' +
    tabs +
    "</div>" +
    content
  );
}
function dashboard() {
  const goal = goalCard(),
    data = current();
  return (
    "<h1>" +
    translate("Dashboard", "ダッシュボード") +
    '</h1><section class="rule space"><h2>' +
    translate("Next lesson", "次のレッスン") +
    '</h2><p class="muted">' +
    translate("No upcoming lessons", "予定されているレッスンはありません") +
    "</p></section>" +
    '<section class="rule space"><h2>' +
    subjectName() +
    " " +
    translate("flashcards", "フラッシュカード") +
    "</h2><p>" +
    translate(
      "Practice vocabulary between lessons.",
      "レッスンの合間に語彙を練習しましょう。",
    ) +
    '</p><div class="actions"><button class="pill primary" id="review">' +
    translate("Practice", "練習する") +
    "</button></div></section>" +
    '<section class="rule space"><div class="row"><h2>' +
    translate("Achievements", "実績") +
    "</h2>" +
    (galleryAccess() ? button("gallery", galleryLabel()) : "") +
    '</div><div class="strip">' +
    data.earned
      .slice(0, 3)
      .map(
        (id) =>
          '<button data-detail="' +
          id +
          '" aria-label="' +
          safe(title(getCard(id))) +
          '">' +
          image(id, 64) +
          "</button>",
      )
      .join("") +
    "</div><small>" +
    translate("Next achievement", "次の実績") +
    "</small><h3>" +
    safe(title(goal)) +
    "</h3><p>" +
    safe(local(goal.rule)) +
    '</p><progress aria-label="' +
    safe(title(goal)) +
    '" value="' +
    data.studied +
    '" max="' +
    studyTarget() +
    '"></progress><small>' +
    data.studied +
    " / " +
    studyTarget() +
    "</small></section>"
  );
}
function practice() {
  const jp = subject === "ja",
    answered = current().answered;
  return (
    "<h1>" +
    translate("Flashcards", "フラッシュカード") +
    '</h1><p class="muted">' +
    subjectName() +
    '</p><section class="practice"><p>' +
    translate(
      "Choose the reading for this word.",
      "この言葉の読み方を選びましょう。",
    ) +
    '</p><p class="word" lang="' +
    subject +
    '">' +
    (jp ? "写真" : "photo") +
    "</p>" +
    (answered
      ? '<p id="saved" tabindex="-1">' +
        translate("Correct! Answer saved.", "正解！ 回答を保存しました。") +
        "</p>"
      : '<button class="pill" id="answer">' +
        (jp ? "しゃしん" : "/ˈfoʊtoʊ/") +
        "</button>") +
    "</section>" +
    button("dashboard", translate("Back to dashboard", "ダッシュボードに戻る"))
  );
}
function render() {
  document.documentElement.lang = locale;
  $("#brand").textContent =
    subject === "ja"
      ? translate("Japanese Studio", "ジャパニーズスタジオ")
      : translate("English Studio Japan", "イングリッシュスタジオジャパン");
  $("#nav").innerHTML =
    button("dashboard", translate("Dashboard", "ダッシュボード"), "") +
    (galleryAccess() ? button("gallery", galleryLabel(), "") : "");
  const nav = $('#nav [data-action="' + screen + '"]');
  if (nav) nav.setAttribute("aria-current", "page");
  $("#main").innerHTML =
    screen === "gallery"
      ? gallery()
      : screen === "dashboard"
        ? dashboard()
        : practice();
  $("#subject-label").textContent = translate("Learning", "学習言語");
  $("#lang-label").textContent = translate("Interface", "表示言語");
  $("#subject").innerHTML =
    '<option value="ja">' +
    translate("Japanese", "日本語") +
    '</option><option value="en">' +
    translate("English", "英語") +
    "</option>";
  $("#subject").value = subject;
  $("#lang").value = locale;
  $("#reset").textContent = translate("Try first unlock", "初獲得を試す");
  $("#demo-label").textContent = translate(
    "Design preview · Sample progress",
    "デザインプレビュー · サンプルの学習記録",
  );
  $("#close").setAttribute(
    "aria-label",
    translate("Close details", "詳細を閉じる"),
  );
  $("#dismiss").setAttribute(
    "aria-label",
    translate("Dismiss notification", "通知を閉じる"),
  );
}
function inspect(id) {
  const card = getCard(id),
    earned = current().earned.includes(id);
  $("#detail-content").innerHTML =
    image(id, 256, !earned) +
    '<h2 id="detail-title">' +
    safe(title(card)) +
    "</h2><small>" +
    subjectName() +
    " · " +
    (earned
      ? translate("Earned ", "獲得日 ") + date()
      : translate("Locked", "未獲得")) +
    "</small><p>" +
    safe(local(card.rule)) +
    "</p>" +
    (earned ? "<p>" + safe(local(card.caption)) + "</p>" : "");
  $("#detail").setAttribute("aria-labelledby", "detail-title");
  $("#detail").showModal();
}
let notice = null,
  timer = null,
  remaining = 5000,
  started = 0;
function pause() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
    remaining -= performance.now() - started;
  }
}
function dismiss() {
  pause();
  notice = null;
  $("#toast").hidden = true;
  $("#announce").textContent = "";
}
function resume() {
  if (
    !notice ||
    timer !== null ||
    document.hidden ||
    $("#toast").matches(":hover,:focus-within")
  )
    return;
  started = performance.now();
  timer = setTimeout(dismiss, Math.max(0, remaining));
}
function announce(id) {
  dismiss();
  notice = id;
  remaining = 5000;
  const label = translate("Achievement unlocked", "実績を獲得しました");
  $("#toast-action").innerHTML =
    image(id, 48) +
    "<span><small>" +
    label +
    "</small><b>" +
    safe(title(getCard(id))) +
    "</b></span>";
  $("#toast").hidden = false;
  $("#announce").textContent = label + " " + title(getCard(id));
  resume();
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  if (b.dataset.detail) {
    inspect(b.dataset.detail);
    return;
  }
  if (b.id === "toast-action" && notice) {
    const id = notice;
    dismiss();
    $("#saved")?.focus();
    inspect(id);
    return;
  }
  if (b.id === "dismiss") {
    dismiss();
    return;
  }
  if (b.id === "close") return;
  if (
    b.dataset.action === "next-page" ||
    b.dataset.action === "previous-page"
  ) {
    pageIndex += b.dataset.action === "next-page" ? 1 : -1;
    render();
    $(".grid button")?.focus();
    return;
  }
  if (b.id === "reset") {
    dismiss();
    Object.keys(progress).forEach(
      (s) => (progress[s] = { earned: [], studied: 0, answered: false }),
    );
    screen = "dashboard";
    tab = "earned";
  } else if (b.id === "answer") {
    if (current().answered) return;
    current().answered = true;
    current().studied++;
    const id = current().studied === 1 ? "cards-0001" : "cards-0025";
    current().earned.unshift(id);
    render();
    $("#saved").focus();
    announce(id);
    return;
  } else if (b.id === "review" || b.dataset.action === "practice")
    screen = "practice";
  else if (["all", "earned"].includes(b.dataset.action)) {
    tab = b.dataset.action;
    pageIndex = 0;
    filter = "all";
  } else if (["gallery", "dashboard"].includes(b.dataset.action)) {
    screen = b.dataset.action;
    tab = "earned";
    pageIndex = 0;
  } else return;
  render();
});
$("#lang").onchange = (e) => {
  locale = e.target.value;
  dismiss();
  render();
};
$("#subject").onchange = (e) => {
  subject = e.target.value;
  pageIndex = 0;
  dismiss();
  render();
};
document.addEventListener("change", (e) => {
  if (e.target.id === "filter") {
    filter = e.target.value;
    pageIndex = 0;
    render();
    $("#filter").focus();
  }
});
$("#toast").addEventListener("pointerenter", pause);
$("#toast").addEventListener("pointerleave", resume);
$("#toast").addEventListener("focusin", pause);
$("#toast").addEventListener("focusout", () => queueMicrotask(resume));
document.addEventListener("visibilitychange", () =>
  document.hidden ? pause() : resume(),
);
window.addEventListener("pagehide", dismiss);
render();
