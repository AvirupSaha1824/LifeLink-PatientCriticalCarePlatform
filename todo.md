# Project TODO

- [x] Inspect the existing LifeLink Blue interface and identify medicine, blood-bank, search, and location integration points.
- [x] Define persistent Drizzle schema for locations, medicines, medicine availability, blood banks, blood-group inventory, contacts, and status timestamps.
- [x] Create and apply database migration for LifeLink discovery data.
- [x] Add representative, clearly labeled sample records for medicines, availability, blood banks, inventory, locations, and contact details.
- [x] Implement typed public tRPC queries for medicine listing, search, category/location filtering, and availability retrieval.
- [x] Implement typed public tRPC queries for blood-bank listing, search, blood-group/location filtering, and inventory retrieval.
- [x] Connect the existing medicine interface to tRPC data with responsive loading, empty, and error states while preserving the current visual design.
- [x] Connect the existing blood-bank interface to tRPC data with responsive loading, empty, and error states while preserving the current visual design.
- [x] Add an interactive blood-bank map with location markers and directions interactions after core listings work.
- [x] Write and run Vitest coverage for query helpers and public tRPC behavior.
- [x] Verify the connected frontend flows in the browser and resolve outstanding bugs.
- [x] Add direct Vitest coverage for database query helpers alongside public tRPC coverage.
- [x] Correct negative blood-group labels in the blood search selector.
- [x] Eliminate the Google Maps script-loading console warning and reverify the map.
- [x] Fix the asynchronous Google Maps callback regression that left the map container blank.
- [x] Reload the final blood-bank map and confirm no fresh Maps loader warning is emitted.
