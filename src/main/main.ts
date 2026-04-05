import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import dotenv from "dotenv";
import { logger } from "./logger";

dotenv.config();

type PetState = {
  hunger: number;
  mood: number;
  energy: number;
  cleanliness: number;
  health: number;
  petName: string;
  personality: "friend" | "junior" | "coach";
  lastSeen: string;
};

type PetChatResult = {
  ok: boolean;
  reply: string;
  source: "ai" | "fallback";
};

type RuntimeMetrics = {
  appCpuPercent: number;
  appMemoryMb: number;
};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const stateFilePath = () => path.join(app.getPath("userData"), "pet-state.json");

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

const clamp = (value: number) => Math.max(0, Math.min(100, value));

function modeOf(s: PetState): "Happy" | "Normal" | "Tired" | "Sick" {
  if (s.health < 35 || s.cleanliness < 25) return "Sick";
  if (s.energy < 35) return "Tired";
  if (s.mood > 70 && s.hunger > 50) return "Happy";
  return "Normal";
}

function localFallbackReply(userText: string, state: PetState): string {
  const mode = modeOf(state);
  const prefix = state.personality === "coach" ? "좋아, " : state.personality === "junior" ? "헤헤, " : "음, ";

  if (mode === "Sick") return `${prefix}나 조금 힘들어. Clean이랑 밥 먼저 챙겨줄래?`;
  if (mode === "Tired") return `${prefix}졸려서 말이 느릴 수도 있어... 그래도 네 얘기 좋아.`;
  if (userText.includes("사랑") || userText.includes("좋아")) return `${prefix}나도 너 정말 좋아!`;
  return `${prefix}${userText.slice(0, 12)}... 라고? 같이 있으면 재밌어.`;
}

function truncateReply(input: string): string {
  const clean = input.replace(/\s+/g, " ").trim();
  return clean.length <= 140 ? clean : `${clean.slice(0, 137)}...`;
}

async function callAiReply(userText: string, state: PetState): Promise<PetChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.debug("OPENAI_API_KEY is missing. Using fallback reply.");
    return {
      ok: false,
      reply: localFallbackReply(userText, state),
      source: "fallback"
    };
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? "10000");
  const mode = modeOf(state);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const systemPrompt =
      `너는 데스크톱 다마고치 AI 펫이다.\n` +
      `이름: ${state.petName}\n` +
      `성격: ${state.personality}\n` +
      `현재 상태: ${mode}, Hunger=${Math.round(state.hunger)}, Mood=${Math.round(state.mood)}, ` +
      `Energy=${Math.round(state.energy)}, Cleanliness=${Math.round(state.cleanliness)}, Health=${Math.round(state.health)}\n` +
      "규칙: 한국어로 1~2문장, 140자 이내로 짧고 따뜻하게 답해라. 상태가 안 좋으면 돌봄 행동을 제안해라.";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      logger.warn("OpenAI response not OK. Using fallback.", { status: response.status });
      return {
        ok: false,
        reply: localFallbackReply(userText, state),
        source: "fallback"
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const aiText = data.choices?.[0]?.message?.content;
    if (!aiText) {
      logger.warn("OpenAI response missing content. Using fallback.");
      return {
        ok: false,
        reply: localFallbackReply(userText, state),
        source: "fallback"
      };
    }

    return {
      ok: true,
      reply: truncateReply(aiText),
      source: "ai"
    };
  } catch (error) {
    logger.warn("OpenAI request failed. Using fallback.", error);
    return {
      ok: false,
      reply: localFallbackReply(userText, state),
      source: "fallback"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadState(): Promise<PetState> {
  try {
    const raw = await fs.readFile(stateFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PetState>;
    const fallback = defaultState();
    return {
      hunger: clamp(parsed.hunger ?? fallback.hunger),
      mood: clamp(parsed.mood ?? fallback.mood),
      energy: clamp(parsed.energy ?? fallback.energy),
      cleanliness: clamp(parsed.cleanliness ?? fallback.cleanliness),
      health: clamp(parsed.health ?? fallback.health),
      petName: parsed.petName ?? fallback.petName,
      personality: parsed.personality ?? fallback.personality,
      lastSeen: parsed.lastSeen ?? fallback.lastSeen
    };
  } catch (error) {
    logger.warn("Failed to load state. Falling back to default.", error);
    const initial = defaultState();
    await saveState(initial);
    return initial;
  }
}

async function saveState(state: PetState): Promise<void> {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(stateFilePath(), JSON.stringify(state, null, 2), "utf8");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  logger.info("AI Pet window created.");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const emptyImage = nativeImage.createEmpty();
  tray = new Tray(emptyImage);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show AI Pet",
      click: () => mainWindow?.show()
    },
    {
      label: "Hide",
      click: () => mainWindow?.hide()
    },
    {
      label: "Quit",
      click: () => app.quit()
    }
  ]);

  tray.setToolTip("AI Pet");
  tray.setContextMenu(contextMenu);
}

function getRuntimeMetrics(): RuntimeMetrics {
  const metrics = app.getAppMetrics();
  const cpu = metrics.reduce((acc, item) => acc + item.cpu.percentCPUUsage, 0);
  const memoryKb = metrics.reduce((acc, item) => acc + item.memory.workingSetSize, 0);
  return {
    appCpuPercent: Number(cpu.toFixed(1)),
    appMemoryMb: Number((memoryKb / 1024).toFixed(1))
  };
}

app.whenReady().then(() => {
  logger.info("App ready.");
  ipcMain.handle("pet:load-state", async () => {
    try {
      return await loadState();
    } catch (error) {
      logger.error("Unhandled load-state error.", error);
      return defaultState();
    }
  });
  ipcMain.handle("pet:save-state", async (_, state: PetState) => {
    try {
      await saveState(state);
      return true;
    } catch (error) {
      logger.error("Failed to save state.", error);
      return false;
    }
  });
  ipcMain.handle("pet:chat", async (_, input: { message: string; state: PetState }) => {
    return callAiReply(input.message, input.state);
  });
  ipcMain.handle("pet:get-runtime-metrics", async () => getRuntimeMetrics());
  ipcMain.on("pet:window-hide", () => mainWindow?.hide());
  ipcMain.on("pet:window-quit", () => app.quit());

  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on("window-all-closed", () => {
  // Keep app alive for tray-style behavior in MVP.
});
