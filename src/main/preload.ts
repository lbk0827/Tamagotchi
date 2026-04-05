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

contextBridge.exposeInMainWorld("aiPet", {
  loadState: (): Promise<PetState> => ipcRenderer.invoke("pet:load-state"),
  saveState: (state: PetState): Promise<boolean> => ipcRenderer.invoke("pet:save-state", state),
  hideWindow: (): void => ipcRenderer.send("pet:window-hide"),
  quitApp: (): void => ipcRenderer.send("pet:window-quit")
});
