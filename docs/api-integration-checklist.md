# Client API integration checklist

Use this checklist with the client before connecting production money flows.

## Required endpoints

- `POST /auth/login`
  - request: username/phone + password/otp
  - response: `token`, `refreshToken`, `user`
- `POST /auth/refresh`
  - request: `refreshToken`
  - response: `token`
- `GET /account/balance`
  - response: `userId`, `coins`, `currency`, `updatedAt`
- `POST /games/bet`
  - request: `gameId`, `amount`, `payload`
  - response: authoritative `result`, `newBalance`, `resolvedAt`
- `GET /account/history?limit=20`
  - response: list of rounds and financial outcomes

## Security requirements

- Balance and payouts must be server-authoritative.
- Do not trust client-side RNG for real-money outcomes.
- Require signed JWT/Bearer token for all balance and bet routes.
- Return round IDs and timestamps for auditability.

## Error mapping

- `INVALID_CREDENTIALS`: show login error.
- `TOKEN_EXPIRED`: refresh token then retry once.
- `INSUFFICIENT_BALANCE`: block bet and show message.
- `GAME_UNAVAILABLE`: disable game in lobby.
