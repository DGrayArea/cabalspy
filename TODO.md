# CabalSpy TODOs

## Authentication & Session Management
- [x] **Fix Google Session Persistence**: Investigate and fix the issue where signing out of one Google account and into another causes the first account to be incorrectly restored. Ensure Google OAuth state and cookies are fully cleared on logout.
- [x] **Adjust Session Duration**: Change the session expiration time from 7 days down to 3 days.
- [x] **Fix Auth UI Flashes**: Eliminate the flashes of the sign-in page that occur when finalizing a session or during the sign-out process.

## BSC Integration & UI
- [ ] **Index Page BSC Tokens**: Ensure that BSC tokens are properly integrated and displayed on the main index page when BSC is enabled.
- [ ] **Filter Buttons**: Implement or verify the filter buttons for BSC tokens on both the index page and the portfolio page so users can easily toggle or sort between Solana and BSC assets.
- [ ] **Turnkey Wallet Support**: Continue monitoring the Turnkey BNB/BSC wallet generation to ensure it reliably syncs for all users alongside their Solana wallets.

## General
- [ ] Verify the kill-switch (`NEXT_PUBLIC_ENABLE_BSC`) cleanly disables all BSC background calls and UI elements if turned off.
