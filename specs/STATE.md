# Current State

## Last Updated
2024-12-XX - Backend-UI decoupling with SessionService

## Recent Changes
- Decoupled backend from UI by introducing `SessionService` layer
- Created `packages/react/src/services/session-service.ts` - encapsulates all session operations
- Created `packages/react/src/hooks/use-session-service.ts` - React hook for SessionService
- Refactored `AomiRuntimeProvider` to use `SessionService` instead of direct `BackendApi` calls
- Added missing `fetchThread` method to `BackendApi` for `GET /api/sessions/:session_id`
- Updated `DOMAIN.md` to reflect new architecture with service layer
- Verified no direct `BackendApi` usage in `apps/registry` UI components

## Pending
- None currently

## Notes
- Specs are designed for new agents to quickly understand the codebase
- Keep updates minimal - only add what affects the next task
- Remove completed items from Pending after each task
