# Reference Interactive Demo Notes

## Observed behavior

The reference homepage exposes a **Run Interactive Demo** control in the top pitch banner. Activating it leaves the dashboard visible and presents a non-blocking, dark floating guide panel anchored at the lower-right corner. The panel has a subtle critical-care/red glow, a short title, progress indicator, explanatory copy, and **Back**, **Next Step**, and **Close** controls.

The first of seven steps is titled **Patient Login & Health Profile**. It identifies Srijan as a patient with Thalassemia Major and blood group B+. The demo itself is a guided narrative overlay rather than an automatic workflow that modifies the site state.

Step 2 is **Patient Dashboard & Next Care Task**. It calls attention to the high-priority blood-transfusion card and its Arrange Blood action. Step 3 is **Blood Search & Real-Time Availability**; the reference automatically switches to the blood-search view and narrates a B+ PRBC search in Kolkata, describing an ABC Blood Bank match with five units at a stated distance. The floating panel itself continues to provide navigation between steps.

Step 4, **Request Blood Reservation (PENDING)**, narrates reservation of two B+ PRBC units for a specified date and marks the initial status as pending. Step 5, **Blood Bank Manager Portal**, switches the active portal role to the blood bank and presents an inbound-reservation-requests workspace, where the officer sees Srijan’s pending request.

Step 6 is **Blood Bank Accepts Request**. It describes officer acceptance, automatic inventory decrement, and a real-time alert. Step 7, **Patient & Caregiver Notification Alert**, returns to the patient dashboard and narrates a Blood Reservation Accepted alert for both the patient and caregiver. The reference keeps the guide open at the final state, allowing review, back-navigation, or closure.
