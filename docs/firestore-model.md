# Firestore model

The client API remains the source of truth for balance and betting outcomes.

## Collections

- `users/{userId}`
  - `displayName`
  - `username`
  - `preferredCurrency`
  - `lastLogin`

- `user_settings/{userId}`
  - `theme`
  - `soundOn`
  - `hapticsOn`

- `user_game_state/{userId}/games/{gameId}`
  - `lastBet`
  - `autoPlay`
  - `volatility`
  - `updatedAt`

## Notes

- Keep Firestore data as profile/preferences and non-financial state.
- If balance is cached in Firestore, treat it as display cache only and always reconcile with API.
