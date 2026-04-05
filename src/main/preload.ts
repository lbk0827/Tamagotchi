import { contextBridge, ipcRenderer } from "electron";

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

contextBridge.exposeInMainWorld("aiPet", {
  loadState: (): Promise<PetState> => ipcRenderer.invoke("pet:load-state"),
  saveState: (state: PetState): Promise<boolean> => ipcRenderer.invoke("pet:save-state", state),
  chat: (message: string, state: PetState): Promise<PetChatResult> =>
    ipcRenderer.invoke("pet:chat", { message, state }),
  getRuntimeMetrics: (): Promise<RuntimeMetrics> => ipcRenderer.invoke("pet:get-runtime-metrics"),
  hideWindow: (): void => ipcRenderer.send("pet:window-hide"),
  quitApp: (): void => ipcRenderer.send("pet:window-quit")
});
