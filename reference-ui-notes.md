# Existing LifeLink Interface Notes

## Reference inspection: 27 August 2026

The supplied LifeLink Blue site uses a dark, clinical-operations dashboard with a fixed left navigation rail, a narrow gradient hackathon banner, a compact active-role selector, red/pink critical-state accents, indigo status accents, and rounded dark panels. The main navigation includes **Find Blood & Map**, **Medicine Tracker**, and **Albumin & Critical Meds**.

The existing blood discovery screen is titled **Blood Search & Real-Time Availability**. It presents three controls in a single rounded search panel: blood group, component, and city/district; it then exposes a **Search Availability** action. The body reserves a left-side map area and a results area. The reference screen currently returns the visible message `Error fetching blood banks: HTTP Error 404`, confirming that its frontend has an unconnected or unavailable data source.

Integration requirements: preserve the sidebar, typography, dark palette, compact search layout, panel dimensions, and existing critical-care visual hierarchy. Replace the failing data request with typed tRPC data and provide inline loading, empty, and error messaging in the same visual language.

The **Medicine Tracker** screen is a single wide, rounded dark panel with the title **Medicine Tracker & Smart Stock Depletion Formula**, an explanatory stock-calculation message, and a compact inline error space. It currently renders `Error: HTTP Error 404`. The **Albumin & Critical Meds** screen follows the same visual container pattern: a titled panel, one wide critical-medicine search field, and a vivid coral search button. It likewise renders an inline 404 error. Both screens should keep their information density and replace the current failure output with searchable live availability records and state-aware feedback.
