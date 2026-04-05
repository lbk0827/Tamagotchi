const statusGrid = document.getElementById("status-grid") as HTMLDivElement | null;
const petEl = document.getElementById("pet") as HTMLDivElement | null;
const petNameEl = document.getElementById("pet-name") as HTMLSpanElement | null;
const petModeEl = document.getElementById("pet-mode") as HTMLSpanElement | null;
const speechEl = document.getElementById("speech") as HTMLDivElement | null;
const inputEl = document.getElementById("chat-input") as HTMLInputElement | null;
const sendBtn = document.getElementById("chat-send") as HTMLButtonElement | null;
const hideBtn = document.getElementById("hide-btn") as HTMLButtonElement | null;
const quitBtn = document.getElementById("quit-btn") as HTMLButtonElement | null;
const saveStateEl = document.getElementById("save-state") as HTMLSpanElement | null;
const perfStateEl = document.getElementById("perf-state") as HTMLSpanElement | null;
const petNameInputEl = document.getElementById("pet-name-input") as HTMLInputElement | null;
const personalitySelectEl = document.getElementById("personality-select") as HTMLSelectElement | null;
const applySettingsBtn = document.getElementById("apply-settings") as HTMLButtonElement | null;

function setSaveText(text: string) {
  if (saveStateEl) saveStateEl.textContent = text;
}

function setPerfText(text: string) {
  if (perfStateEl) perfStateEl.textContent = text;
}

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
let saveTimer: number | null = null;
let isPersisting = false;
let hasDirtyState = false;
let lastSaveFailNotifiedAt = 0;

const bridge = window.aiPet ?? {
  loadState: async () => defaultState(),
  saveState: async () => true,
  chat: async (message: string, current: PetState) => {
    const mode = modeOf(current);
    const prefix = current.personality === "coach" ? "좋아, " : current.personality === "junior" ? "헤헤, " : "음, ";
    if (mode === "Sick") return { ok: false, source: "fallback" as const, reply: `${prefix}나 조금 힘들어.` };
    return { ok: false, source: "fallback" as const, reply: `${prefix}${message.slice(0, 12)}... 재밌다!` };
  },
  getRuntimeMetrics: async () => ({ appCpuPercent: 0, appMemoryMb: 0 }),
  hideWindow: () => undefined,
  quitApp: () => undefined
};

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
  if (mode === "Happy") return " /\\_/\\\n( ^ o ^ )\n / > < \\";
  if (mode === "Tired") return " /\\_/\\\n( - . - )\n z  z  z";
  if (mode === "Sick") return " /\\_/\\\n( x _ x )\n  /   \\";
  return " /\\_/\\\n( o . o )\n /  ^  \\";
}

function render() {
  if (!petNameEl || !petModeEl || !petEl || !statusGrid) return;
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
  if (!speechEl) return;
  speechEl.textContent = text;
  if (speechTimer) window.clearTimeout(speechTimer);
  speechTimer = window.setTimeout(() => {
    speechEl.textContent = "";
    speechTimer = null;
  }, keepMs);
}

function schedulePersist(delayMs = 1_200) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void persist();
    saveTimer = null;
  }, delayMs);
}

function markDirty() {
  hasDirtyState = true;
  setSaveText("Pending...");
  schedulePersist();
}

async function persist() {
  if (isPersisting || !hasDirtyState) return;
  isPersisting = true;
  setSaveText("Saving...");

  const ok = await bridge.saveState(state);
  if (ok) {
    hasDirtyState = false;
    setSaveText("Saved");
  } else {
    setSaveText("Retry");
    const now = Date.now();
    if (now - lastSaveFailNotifiedAt > 30_000) {
      setSpeech("저장이 잠깐 실패했어. 곧 다시 시도할게.", 2800);
      lastSaveFailNotifiedAt = now;
    }
    schedulePersist(4_000);
  }

  isPersisting = false;
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
  markDirty();
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
  markDirty();
}

function startPerfMonitor() {
  let frameCount = 0;
  let lastMeasureAt = performance.now();

  const rafLoop = async () => {
    frameCount += 1;
    const now = performance.now();
    if (now - lastMeasureAt >= 2000) {
      const fps = Math.round((frameCount * 1000) / (now - lastMeasureAt));
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      let rendererHeapText = "";
      if (memory?.usedJSHeapSize) {
        const heapMb = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
        rendererHeapText = ` | Heap ${heapMb}MB`;
      }
      try {
        const runtime = await bridge.getRuntimeMetrics();
        setPerfText(
          `FPS ${fps}${rendererHeapText} | CPU ${runtime.appCpuPercent}% | App ${runtime.appMemoryMb}MB`
        );
      } catch {
        setPerfText(`FPS ${fps}${rendererHeapText}`);
      }
      frameCount = 0;
      lastMeasureAt = now;
    }
    window.requestAnimationFrame(rafLoop);
  };

  window.requestAnimationFrame(rafLoop);
}

async function requestPetReply(userText: string): Promise<void> {
  if (isChatting) return;
  if (!sendBtn) return;
  isChatting = true;
  sendBtn.disabled = true;
  sendBtn.textContent = "...";
  setSpeech("생각 중이야...");

  try {
    const result = await bridge.chat(userText, state);
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
  if (!sendBtn || !inputEl || !hideBtn || !quitBtn) return;

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

  hideBtn.addEventListener("click", () => bridge.hideWindow());
  quitBtn.addEventListener("click", () => bridge.quitApp());

  applySettingsBtn?.addEventListener("click", () => {
    if (!petNameInputEl || !personalitySelectEl) return;
    const nextName = petNameInputEl.value.trim();
    const nextPersonality = personalitySelectEl.value as PetState["personality"];

    if (nextName) {
      state.petName = nextName.slice(0, 16);
    }
    if (nextPersonality === "friend" || nextPersonality === "junior" || nextPersonality === "coach") {
      state.personality = nextPersonality;
    }

    state.lastSeen = new Date().toISOString();
    render();
    setSpeech(`좋아! 이제 나는 ${state.petName}, 말투는 ${state.personality}.`, 2600);
    markDirty();
  });

  window.setInterval(() => {
    onTick();
  }, 60_000);

  window.setInterval(() => {
    if (hasDirtyState) {
      void persist();
    }
  }, 90_000);

  window.addEventListener("beforeunload", () => {
    if (hasDirtyState) {
      void persist();
    }
  });
}

async function init() {
  if (!statusGrid || !petEl || !petNameEl || !petModeEl || !speechEl) {
    // eslint-disable-next-line no-console
    console.error("UI initialization failed: required elements missing.");
    return;
  }

  const loaded = await bridge.loadState();
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
  if (petNameInputEl) petNameInputEl.value = state.petName;
  if (personalitySelectEl) personalitySelectEl.value = state.personality;
  wireEvents();
  markDirty();
  startPerfMonitor();
}

void init();
