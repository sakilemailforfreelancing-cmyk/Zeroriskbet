import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { LobbyPage } from './pages/LobbyPage'
import { WalletPage } from './pages/WalletPage'
import { ProfilePage } from './pages/ProfilePage'
import { GamePage } from './pages/GamePage'
import { SlotMachinePage } from './pages/SlotMachinePage'
import { PremiumSlotsPage } from './pages/PremiumSlotsPage'
import { BettingPassPage, PromotionPage, RecommendationsPage, RewardsPage } from './pages/HomeTabPages'
import { DiceGamePage } from './pages/DiceGamePage'
import { CrashGamePage } from './pages/CrashGamePage'
import { LuckyBoxPage } from './pages/LuckyBoxPage'
import { CoinFlipPage } from './pages/CoinFlipPage'
import { Lucky7Page } from './pages/Lucky7Page'
import { MinesGamePage } from './pages/MinesGamePage'
import { useSessionStore } from './store/useSessionStore'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useSessionStore((state) => state.token)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<LobbyPage />} />
      <Route path="/recommend" element={<RecommendationsPage />} />
      <Route path="/promotion" element={<PromotionPage />} />
      <Route path="/betting-pass" element={<BettingPassPage />} />
      <Route path="/rewards" element={<RewardsPage />} />
      <Route
        path="/games/spin-wheel"
        element={
          <ProtectedRoute>
            <SlotMachinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/slots"
        element={
          <ProtectedRoute>
            <PremiumSlotsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/dice"
        element={
          <ProtectedRoute>
            <DiceGamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/crash"
        element={
          <ProtectedRoute>
            <CrashGamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/lucky-box"
        element={
          <ProtectedRoute>
            <LuckyBoxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/coin-flip"
        element={
          <ProtectedRoute>
            <CoinFlipPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/lucky7"
        element={
          <ProtectedRoute>
            <Lucky7Page />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/mines"
        element={
          <ProtectedRoute>
            <MinesGamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/games/:gameId"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
