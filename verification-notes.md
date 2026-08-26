# Verification Notes

## Browser check: connected blood discovery

The local LifeLink application loads the recreated dashboard successfully. Navigating to **Find Blood & Map** displays the preserved search panel, a clear representative-data notice, and the expected responsive loading state instead of the reference site’s `HTTP Error 404` output. The next check will confirm the completed query response and map results.

The completed blood search returned four B+ PRBC records for Kolkata, rendered their availability states and timestamps, and created four interactive Google Maps markers. The medicine tracker also returned seven availability records with category controls, source contact links, and source/location metadata. These checks confirm that the corresponding public tRPC calls, database queries, and data-bound interface panels are operating together in the local application.

Submitting the medicine search `unmatched medicine` produced the dedicated empty panel with no layout breakage. The UI therefore covers the requested loading, populated, and empty states; its error state is implemented with an inline retry action and was type-checked alongside the connected query code.

The map was rechecked after migration to the supported advanced-marker API. It continued to render the four results as interactive markers on the blood-bank map, with the per-result **Map** and **Directions** controls available beside each inventory record.

Selecting **Directions** for the Ballygunge blood-bank result opened Google Maps with the stored `22.5312, 88.3611` destination coordinates, where the destination resolved to Ballygunge, Kolkata. This validates the final hand-off from database coordinates to the user-facing directions destination.

After the final correction, the blood selector shows accurate labels for `A-`, `B-`, and `AB-` as **Negative**, while preserving the universal donor/recipient designations. The blood screen continued to return the four expected availability records and initialized the asynchronous map container for the final map-load confirmation.

The map-loader regression was resolved by waiting for the Maps API callback before creating the map. A clean reload now renders the Kolkata map with all four advanced markers, alongside the corrected blood-group labels and the same four inventory records.

A further fresh application load was started for isolated console verification. The revised blood view entered its expected loading state with the corrected selector labels before the map and results completed rendering.

The fresh blood-map load completed with four results and an interactive map. The newest browser-console entries after that load contained only normal connection/debug messages; no new Maps loader warning, advanced-marker event warning, or map-constructor error was emitted.
