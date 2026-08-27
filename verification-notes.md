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

## Interactive demo verification

The new **Run interactive demo** control starts a floating guided panel over the unchanged patient dashboard. Its first state shows the patient profile narrative, a Step 1 of 7 progress label, a disabled Back action, a working Next step action, and an accessible close control.

Advancing through Step 2 retained the dashboard care-task context, while Step 3 successfully moved the guide and visible application content into the connected B+ PRBC blood-search workspace. The existing loading state remained responsive beneath the guide as the live availability query began.

Once availability completed, the guide advanced to the pending-reservation state while retaining the live result cards and map. The scenario notice clearly communicated that two B+ PRBC units were being held until the blood bank accepts the request.

Step 5 opened the working blood-bank operations workspace with an inbound Srijan request. Selecting **Accept reservation** advanced the guide to Step 6 and visibly changed the request to allocated, prepared for patient notification, and accepted in the scenario status panel.

Step 7 returned the demo to the patient dashboard with a clear **Blood Reservation Accepted** notice for Srijan and caregiver Anita. Selecting **Finish demo** dismissed the panel and restored the normal dashboard, confirming the sequence can be restarted or exited cleanly.

The refined demo panel now exposes a visible **Restart** control alongside the progress and navigation actions from the opening step onward. This provides an explicit reset path in addition to the start and exit controls.

Browser verification advanced the scenario to Step 2 and then used **Restart**. The panel returned to Step 1 with the initial patient-profile narrative and restored initial navigation state, confirming the reset control works as intended.

The accessible close control was also exercised during an active Step 1 demo and dismissed the guide immediately, leaving the standard patient dashboard intact.

After the controller refactor, a fresh Run interactive demo action again opened Step 1 with the visible Restart, Next step, and Close controls, confirming that the UI remains connected to the tested start/restart/close session actions.

The controller-backed Close control was then exercised and the stable, normal patient dashboard remained visible after dismissal.

## My Reservations verification

The former My Reservations placeholder now opens a connected blood-reservation dashboard. It loaded three persisted demonstration reservations from distinct blood banks and displayed the pending, accepted, and fulfilled lifecycle states, blood component, unit count, requested-for time, latest status timestamp, reference code, location, and provider call action. The fulfilled record explicitly identifies **fulfilled** as the terminal completed reservation status.

Selecting the Fulfilled status filter narrowed the dashboard to the single persisted fulfilled reservation and retained its terminal-completion explanation, confirming the typed status filter operates end to end.

Selecting Cancelled returned no matching seeded records and displayed the responsive **No blood reservations found** empty state, confirming the reservation filter’s empty path.

After refining the interface copy, the empty state now gives reservation-specific guidance: users are prompted to choose another status filter to review other blood-bank requests.

For controlled error-state verification, the isolated browser session was configured to reject only the reservation-list request. Switching to the Pending filter displayed the reservation-specific loading state before the simulated request settled.

The settled error state displayed the tailored title **We could not load your blood reservations**, the controlled service message, and a visible **Try again** control. The isolated browser request override was then restored before retry testing.

Selecting **Try again** recovered the live pending-reservation query and rendered the Ballygunge blood-bank reservation, confirming the retry flow end to end.

## Transfusion & Chemotherapy verification

The former Transfusion & Chemo placeholder now opens a connected hospital treatment dashboard. It rendered four persisted updates across transfusion and chemotherapy care, with scheduled, confirmed, delayed, and completed statuses, hospital details, clinical context, lifecycle timestamps, reference codes, and provider call actions.

Selecting Transfusion narrowed the view to the two persisted transfusion updates. Applying Completed then returned only the completed transfusion record from the Kolkata Thalassemia Centre, confirming that the combined treatment type and lifecycle filters work end to end.

Applying Delayed while Transfusion was selected returned no records and displayed the treatment-specific empty state with guidance to adjust the treatment type or hospital status filters.

For controlled error-state verification, the isolated browser session was configured to reject only hospital treatment-status requests. Switching to Chemotherapy showed the dedicated treatment loading state before the simulated request settled.

The settled treatment error state displayed the tailored title **We could not load hospital treatment updates**, the controlled service message, and a visible **Try again** control. The isolated browser request override was restored before retry testing.

Selecting **Try again** recovered the live chemotherapy query and rendered both persisted chemotherapy updates, confirming the treatment-status retry flow end to end.

Caregiver Mode was opened from the LifeLink sidebar and successfully rendered three persisted caregiver profiles, including two active links and one pending invitation. The dashboard also displayed caregiver-specific shared updates and practical care-coordination suggestions with the clinical-decision disclaimer intact.

The Caregiver Mode invitation form opened successfully with fields for caregiver name, relationship, phone number, and optional email. It explains that invitations are stored with care-updates access and asks the user to confirm permission before sharing contact details.

A clearly labeled demonstration invitation was submitted through the Caregiver Mode form. The success confirmation appeared, the form closed, and the new persisted caregiver profile was immediately displayed as an invited offline link in the network.

For controlled Caregiver Mode error-state verification, the isolated browser session was configured to reject only caregiver-network requests. The connected caregiver view remained stable before the controlled refresh request was triggered.

The initial remount preserved the last successful caregiver data while the query cache refreshed, so the controlled failure simulation was refined to handle browser Request objects before exercising the explicit retry state.

After refining the isolated request interceptor, the application was navigated away from Caregiver Mode to force a new caregiver-network mount for the controlled error-state check.

The controlled request failure displayed the tailored **We could not load the caregiver network** message, the temporary service detail, and a visible **Try again** control. Normal browser request handling was restored before retry verification.

Selecting **Try again** recovered the live caregiver network and returned the linked caregiver cards, shared updates, and care-coordination suggestions, confirming the error-recovery flow end to end.

Caregiver Mode now exposes All caregivers, Active, Invited, and Paused status filters. Selecting Paused returned no records and displayed the tailored empty-state guidance: **Invite a trusted caregiver to begin sharing practical care updates.**

## Patient-centered workflow verification

The relational migration created the representative Srijan patient profile, linked every existing Srijan reservation, hospital treatment status, and caregiver consent record to that canonical profile, and retained the established dashboard content. The automated suite now includes a patient-scoped journey assertion through both the public API and direct data helper; all **36 tests** passed.

In the browser, Caregiver Mode loaded four persisted caregiver links, three shared updates, and three practical coordination suggestions. Its new **Connected care journey** panel visibly displayed **Reservation LL-RSV-2026-001 → Hospital LL-TX-2026-001** and identified that the linked caregiver suggestion belongs to the same representative record. The existing caution that suggestions do not replace clinical advice remains visible in the interface.
