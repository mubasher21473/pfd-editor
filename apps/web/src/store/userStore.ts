import { create } from "zustand";

type Tier = "free" | "pro" | "team";

interface UserStore {
  tier: Tier;
  setTier: (tier: Tier) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  tier: "free",
  setTier: (tier) => set({ tier })
}));
