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

  type PetChatResult = {
    ok: boolean;
    reply: string;
    source: "ai" | "fallback";
  };

  interface Window {
    aiPet: {
      loadState: () => Promise<PetState>;
      saveState: (state: PetState) => Promise<boolean>;
      chat: (message: string, state: PetState) => Promise<PetChatResult>;
      setIgnoreMouse: (ignore: boolean) => void;
      hideWindow: () => void;
      quitApp: () => void;
    };
  }
}

export {};
