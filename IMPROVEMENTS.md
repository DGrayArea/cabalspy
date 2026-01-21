# Platform Improvements Checklist

## Critical (Must Fix)
- [x] Set up database schema and connection
- [x] Fix authentication - auto-create wallet on signup
- [x] Implement session management
- [ ] Store user-wallet mapping in database
- [ ] Test trading flow end-to-end

## Important (Should Fix)
- [ ] Replace HTTP polling with WebSocket
- [x] Improve error handling and messages (API fallback, timeout handling)
- [x] Remove excessive comments from code
- [ ] Add transaction confirmation waiting

## Nice to Have
- [ ] Portfolio tracking persistence
- [ ] Transaction history
- [ ] Better loading states
- [ ] Offline handling

## Production Fixes (Just Completed)
- [x] Fixed API proxy timeout and error handling
- [x] Added fallback to WebSocket tokens when Mobula fails
- [x] Improved error logging for production debugging
- [x] Reduced API timeouts to prevent hanging requests
- [x] **Changed to direct client-side API calls - each user's browser makes requests from their own IP (avoids server-side rate limiting)**

## Notes
- API calls now go directly from user's browser to Mobula API
- Each user uses their own IP address, preventing rate limit issues
- If CORS errors occur, the proxy route (`/api/mobula`) is still available as fallback
