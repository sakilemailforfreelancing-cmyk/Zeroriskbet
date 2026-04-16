# Zero Risk Bet PWA

Mobile-first casino frontend that feels like a native app, with:

- Client API integration for login, account balance, bets, and history.
- Firebase + Firestore for user profile, settings, and game preferences.
- Reusable game engine contracts for slots, roulette, and blackjack modules.
- PWA setup (`manifest.webmanifest` + `sw.js`) for installability.

## Stack

- React + TypeScript + Vite
- React Router
- TanStack Query
- Zustand
- Axios
- Firebase / Firestore

## Setup

1. Install dependencies:
   - `npm install`
2. Copy `.env.example` to `.env` and fill all values.
3. Start dev server:
   - `npm run dev`

## Project structure

- `src/api/clientApi.ts`: all client backend requests.
- `src/firebase/*`: Firebase init and Firestore repositories.
- `src/games/engine/*`: shared game adapter contracts.
- `src/games/{slots,roulette,blackjack}`: game modules.
- `src/pages/*`: login, lobby, wallet, profile, game play screens.
- `docs/*`: API checklist, Firestore model, and phased rollout.

## Important rule for money logic

All financial outcomes (wins/losses/balance changes) must come from the client API. Firestore data is auxiliary and should not be used as monetary source of truth.
