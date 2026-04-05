const statusGrid = document.getElementById("status-grid") as HTMLDivElement;
const petEl = document.getElementById("pet") as HTMLDivElement;
const petNameEl = document.getElementById("pet-name") as HTMLSpanElement;
const petModeEl = document.getElementById("pet-mode") as HTMLSpanElement;
const speechEl = document.getElementById("speech") as HTMLDivElement;
const inputEl = document.getElementById("chat-input") as HTMLInputElement;
const sendBtn = document.getElementById("chat-send") as HTMLButtonElement;
const hideBtn = document.getElementById("hide-btn") as HTMLButtonElement;
const quitBtn = document.getElementById("quit-btn") as HTMLButtonElement;

const defaultState = (): PetState => ({
  hunger: 80,
  mood: 70,
  energy: 75,
  cleanliness: 80,
  health: 90,
  petName: "Mame",
  personality: "friend",
  lastSeen: new Date().toISOString()
});

let state: PetState = defaultState();
let speechTimer: number | null = null;
let isChatting = false;

const clamp = (value: number) => Math.max(0, Math.min(100, value));

const statLabel: Record<keyof Omit<PetState, "petName" | "personality" | "lastSeen">, string> = {
  hunger: "Hunger",
  mood: "Mood",
  energy: "Energy",
  cleanliness: "Clean",
  health: "Health"
};

const randomOf = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function modeOf(s: PetState): "Happy" | "Normal" | "Tired" | "Sick" {
  if (s.health < 35 || s.cleanliness < 25) return "Sick";
  if (s.energy < 35) return "Tired";
  if (s.mood > 70 && s.hunger > 50) return "Happy";
  return "Normal";
}

function petFace(mode: ReturnType<typeof modeOf>): string {
  if (mode === "Happy") return "^ᵕ^";
  if (mode === "Tired") return "-.- z";
  if (mode === "Sick") return "x_x";
  return "◕‿◕";
}

function render() {
  const mode = modeOf(state);

  petNameEl.textContent = state.petName;
  petModeEl.textContent = mode;
  petEl.textContent = petFace(mode);

  petEl.classList.remove("happy", "sleep", "sick");
  if (mode === "Happy") petEl.classList.add("happy");
  if (mode === "Tired") petEl.classList.add("sleep");
  if (mode === "Sick") petEl.classList.add("sick");

  statusGrid.innerHTML = "";
  (Object.keys(statLabel) as Array<keyof typeof statLabel>).forEach((key) => {
    const row = document.createElement("div");
    row.textContent = `${statLabel[key]}: ${Math.round(state[key])}`;
    statusGrid.appendChild(row);
  });
}

function setSpeech(text: string, keepMs = 2600) {
  speechEl.textContent = text;
  if (speechTimer) window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    speechEl.textContent = "";
    speechTimer = null;
  }, keepMs);
}

function applyAction(action: "feed" | "play" | "clean" | "sleep") {
  if (action === "feed") {
    state.hunger = clamp(state.hunger + 16);
    state.mood = clamp(state.mood + 4);
    setSpeech(randomOf(["냠냠! 맛있어.", "배부르다!", "고마워! 또 먹고 싶어."]));
  }

  if (action === "play") {
    state.mood = clamp(state.mood + 12);
    state.energy = clamp(state.energy - 8);
    state.cleanliness = clamp(state.cleanliness - 5);
    setSpeech(randomOf(["재밌다!", "더 놀자!", "기분 최고야!"]));
  }

  if (action === "clean") {
    state.cleanliness = clamp(state.cleanliness + 22);
    state.health = clamp(state.health + 6);
    setSpeech(randomOf(["깨끗해졌어!", "상쾌해!", "반짝반짝! "]));
  }

  if (action === "sleep") {
    state.energy = clamp(state.energy + 20);
    state.mood = clamp(state.mood + 3);
    setSpeech(randomOf(["조금 잘게...", "쿨쿨...", "푹 쉬었어!"]));
  }

  state.lastSeen = new Date().toISOString();
  render();
  void persist();
}

function applyTimeDecay(minutes: number) {
  const tick = Math.max(1, Math.floor(minutes / 2));

  state.hunger = clamp(state.hunger - tick * 1.5);
  state.energy = clamp(state.energy - tick * 1.2);
  state.cleanliness = clamp(state.cleanliness - tick * 1.1);

  if (state.hunger < 35 || state.cleanliness < 30 || state.energy < 25) {
    state.health = clamp(state.health - tick * 1.0);
  }

  if (state.health < 40) {
    state.mood = clamp(state.mood - tick * 1.2);
  } else {
    state.mood = clamp(state.mood - tick * 0.5);
  }
}

function onTick() {
  applyTimeDecay(1);
  state.lastSeen = new Date().toISOString();
  render();
}

async function persist() {
  await window.aiPet.saveState(state);
}

async function requestPetReply(userText: string): Promise<void> {
  if (isChatting) return;
  isChatting = true;
  sendBtn.disabled = true;
  sendBtn.textContent = "...";
  setSpeech("생각 중이야...");

  try {
    const result = await window.aiPet.chat(userText, state);
    if (result.source === "fallback") {
      setSpeech(`${result.reply} (fallback)`, 3800);
    } else {
      setSpeech(result.reply, 3600);
    }
  } catch {
    setSpeech("잠깐 생각이 멈췄어. 다시 말해줄래?", 3400);
  } finally {
    isChatting = false;
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
}

function wireEvents() {
  document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action as "feed" | "play" | "clean" | "sleep";
      applyAction(action);
    });
  });

  sendBtn.addEventListener("click", () => {
    const value = inputEl.value.trim();
    if (!value) return;
    inputEl.value = "";
    void requestPetReply(value);
  });

  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendBtn.click();
    }
  });

  hideBtn.addEventListener("click", () => window.aiPet.hideWindow());
  quitBtn.addEventListener("click", () => window.aiPet.quitApp());

  window.setInterval(() => {
    onTick();
    void persist();
  }, 60_000);

  window.setInterval(() => {
    void persist();
  }, 30_000);
}

async function init() {
  const loaded = await window.aiPet.loadState();
  state = { ...defaultState(), ...loaded };

  const now = Date.now();
  const lastSeen = new Date(state.lastSeen).getTime();
  if (!Number.isNaN(lastSeen) && lastSeen < now) {
    const elapsedMin = Math.floor((now - lastSeen) / 60_000);
    if (elapsedMin > 0) {
      applyTimeDecay(elapsedMin);
      setSpeech(`다녀왔구나! ${elapsedMin}분 동안 기다렸어.`);
    }
  }

  state.lastSeen = new Date().toISOString();
  render();
  wireEvents();
  await persist();
}

void init();
