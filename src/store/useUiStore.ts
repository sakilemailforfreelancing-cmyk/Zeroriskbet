import { create } from 'zustand'

type UiState = {
  activeTab: 'home' | 'games' | 'wallet' | 'profile'
  setActiveTab: (tab: UiState['activeTab']) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set(() => ({ activeTab: tab })),
}))
