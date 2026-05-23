# Cabalspy Feature Checklist

## Completed

- [x] Add chart iframe fallback UI and alternate chart/link handling
- [x] Add trade quote preview in the trading panel
- [x] Add quote fetch error state and loading indicator

## In progress

- [ ] Finish production-grade chart fallback messaging and links
- [ ] Refine quote preview values for SOL/token and price impact display
- [x] Add swap confirmation / minimum received warning
- [x] Add transaction history or wallet trade history view
- [ ] Add token pair selector and better swap UX
- [ ] Add mobile/responsive polish for trade flow
- [ ] Add app-level test coverage for trading and chart embeds
- [ ] Fix authentication flow and session persistence (Turnkey wallet auto-create, user-wallet mapping, secure sessions)
- [ ] Integrate WebSocket real-time updates and replace HTTP polling on token discovery pages
- [ ] Add database/backend persistence for user data, wallet mapping, transaction history, and portfolio tracking
- [ ] Verify trading flow with end-to-end swap testing and transaction confirmation handling
- [ ] Validate CORS proxy, environment variables, and API rate limiting for production deployment

## Future production polish

- [ ] Add cross-chain token search and portfolio watchlist improvements
- [ ] Add account recovery / sign-in flow resilience
- [ ] Add analytics and error telemetry for trade failures
- [ ] Add rate-limit handling and fallback routing for embedded charts
- [ ] Add performance profiling for launch/dashboard pages
