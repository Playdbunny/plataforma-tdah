import { create } from "zustand";

export type ContentVersionState = {
  version: number;
  bump: () => void;
};

export const useContentVersionStore = create<ContentVersionState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

export const bumpContentVersion = () =>
  useContentVersionStore.getState().bump();
