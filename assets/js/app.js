const $ = (id) => document.getElementById(id);

const quizSelect = $("quizSelect");
const noBox = $("noBox");
const questionBox = $("questionBox");
const answerInput = $("answerInput");
const checkBtn = $("checkBtn");
const resultBox = $("resultBox");
const correctBox = $("correctBox");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const hint = $("hint");

let quizIndex = [];          // data/quizzes/index.json
let currentQuiz = null;      // { title, questions: [...] }
let currentPos = 0;          // 0..questions.length-1

function normalize(s) {
  // ちょい安全：前後空白除去、全角スペースも除去、英字は小文字化
  return (s ?? "")
    .toString()
    .replace(/\u3000/g, " ")
    .trim()
    .toLowerCase();
}

function setHint(msg) {
  hint.textContent = msg || "";
}

function clearOutputs() {
  resultBox.value = "";
  correctBox.value = "";
}

function renderQuestion() {
  if (!currentQuiz || !currentQuiz.questions?.length) {
    noBox.value = "";
    questionBox.value = "";
    setHint("クイズデータが空です。");
    return;
  }

  // 念のため no昇順に並べる（「一番若い番号から」）
  currentQuiz.questions.sort((a, b) => (a.no ?? 0) - (b.no ?? 0));

  const q = currentQuiz.questions[currentPos];
  noBox.value = String(q.no ?? (currentPos + 1));
  questionBox.value = q.q ?? "";
  answerInput.value = "";
  answerInput.focus();
  clearOutputs();

  setHint(`「${currentQuiz.title ?? "クイズ"}」：${currentPos + 1}/${currentQuiz.questions.length}`);
}

function judge() {
  if (!currentQuiz) return;

  const q = currentQuiz.questions[currentPos];
  const user = normalize(answerInput.value);
  const correct = normalize(q.a);

  const ok = user === correct;
  resultBox.value = ok ? "正解" : "不正解";
  correctBox.value = q.a ?? "";

  setHint(ok ? "いいね！" : "惜しい！");
}

function prevQuestion() {
  if (!currentQuiz) return;

  currentPos -= 1;
  if (currentPos < 0) {
    currentPos = currentQuiz.questions.length - 1; // 最後に戻る
  }
  renderQuestion();
}

function nextQuestion() {
  if (!currentQuiz) return;

  currentPos += 1;
  if (currentPos >= currentQuiz.questions.length) {
    currentPos = 0; // 繰り返す
  }
  renderQuestion();
}

async function loadQuizIndex() {
  // GitHub Pagesでも動くように相対パス
  const res = await fetch("./data/quizzes/index.json", { cache: "no-store" });
  if (!res.ok) throw new Error("index.json が読み込めませんでした");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("index.json は配列である必要があります");
  return data;
}

async function loadQuizFile(file) {
  const res = await fetch(`./data/quizzes/${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${file} が読み込めませんでした`);
  const data = await res.json();
  if (!data?.questions || !Array.isArray(data.questions)) throw new Error(`${file} の形式が不正です`);
  return data;
}

function buildSelect() {
  quizSelect.innerHTML = "";
  for (const item of quizIndex) {
    const opt = document.createElement("option");
    opt.value = item.file;
    opt.textContent = item.title ?? item.id ?? item.file;
    quizSelect.appendChild(opt);
  }
}

async function startSelectedQuiz() {
  const file = quizSelect.value;
  const meta = quizIndex.find(x => x.file === file);
  setHint("読み込み中…");

  currentQuiz = await loadQuizFile(file);
  // タイトルが無い場合はindex側のタイトルを使う
  if (!currentQuiz.title && meta?.title) currentQuiz.title = meta.title;

  currentPos = 0;
  renderQuestion();
}

async function init() {
  try {
    quizIndex = await loadQuizIndex();
    buildSelect();
    await startSelectedQuiz();

    quizSelect.addEventListener("change", async () => {
      try { await startSelectedQuiz(); }
      catch (e) { setHint(String(e.message || e)); }
    });

    checkBtn.addEventListener("click", judge);
    prevBtn.addEventListener("click", prevQuestion);
    nextBtn.addEventListener("click", nextQuestion);

    // Enterで判定、Shift+Enterは無視（入力欄なので）
    answerInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        judge();
      }
    });

  } catch (e) {
    setHint(`初期化エラー: ${String(e.message || e)}`);
  }
}

init();
