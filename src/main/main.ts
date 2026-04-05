import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import dotenv from "dotenv";

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
  } catch {
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

app.whenReady().then(() => {
  ipcMain.handle("pet:load-state", async () => loadState());
  ipcMain.handle("pet:save-state", async (_, state: PetState) => {
    await saveState(state);
    return true;
  });
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
