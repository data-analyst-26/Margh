# CityPulse

A responsive city-services dashboard demo for sample ambulance dispatch, EV charging reservations, and resident complaint tracking.

## Run the demo

From the project directory, start a local web server:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser. No packages or build step are needed.

## Try it

- **Ambulances:** Open the fleet page, filter by zone, and simulate dispatching an available sample unit.
- **EV charging:** Filter demo charging stations, reserve a spot for a date and time, and cancel a reservation.
- **Complaints:** Submit a report, search and filter the list, then move it from review to assigned to resolved.
- **Persistence:** Demo changes are stored in this browser and remain after refresh. Use **Reset demo** to restore the starting data.

All data and actions are local demo examples. This site is not connected to a government, emergency-dispatch, GPS, or charging-station system. The 10-day complaint period is a displayed service target, not a guarantee.
Add live demo link to README