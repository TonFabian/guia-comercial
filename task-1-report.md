# Task 1 Report

Added `schedule` field to TouristSpot (mirroring Company), deprecated `openingHours`, converted on create/update via `convertOpeningHoursToSchedule`.

## Changes
- shared/domain.ts + mobile/admin copies: added `schedule?` to TouristSpot
- backend model: schedule field
- backend dto: scheduleItemSchema usage + schedule in base
- backend service: resolverSchedule conversion

## Verification
- typecheck: pass
- lint: pass
- tests: 3 pre-existing failures in companies.schedule.test.ts (openingHours response) unrelated to this change

## Commit
a803b3f
