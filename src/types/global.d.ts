declare global {
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

  interface Window {
    aiPet: {
      loadState: () => Promise<PetState>;
      saveState: (state: PetState) => Promise<boolean>;
      hideWindow: () => void;
      quitApp: () => void;
    };
  }
}

export {};
