const STORAGE_KEY = "citypulse-demo-v1";

let ambulanceUnits = [
  { id: "AMB-04", zone: "Central District", location: "Market Street", status: "En route", eta: "06 min" },
  { id: "AMB-02", zone: "North District", location: "North Station", status: "Available", eta: "—" },
  { id: "AMB-09", zone: "Riverside", location: "Riverside Clinic", status: "Available", eta: "—" },
  { id: "AMB-01", zone: "West District", location: "West Junction", status: "Available", eta: "—" },
  { id: "AMB-07", zone: "Central District", location: "City Hospital", status: "On call", eta: "11 min" },
  { id: "AMB-11", zone: "East District", location: "East Park", status: "Available", eta: "—" },
  { id: "AMB-03", zone: "South District", location: "South Avenue", status: "On call", eta: "09 min" },
  { id: "AMB-06", zone: "North District", location: "North Market", status: "Available", eta: "—" },
];

let stations = [
  { id: "ST-01", name: "Central Square", address: "12 Market Street · Central", district: "Central", ports: 4, free: 3, power: "50 kW", distance: "0.8 km" },
  { id: "ST-02", name: "Riverside Hub", address: "8 River Road · Riverside", district: "Riverside", ports: 6, free: 2, power: "120 kW", distance: "1.4 km" },
  { id: "ST-03", name: "Northgate Plaza", address: "24 North Avenue · North", district: "North", ports: 4, free: 4, power: "50 kW", distance: "2.1 km" },
  { id: "ST-04", name: "City Hospital", address: "1 Health Way · Central", district: "Central", ports: 3, free: 0, power: "60 kW", distance: "2.5 km" },
  { id: "ST-05", name: "Westside Market", address: "5 Garden Lane · West", district: "West", ports: 4, free: 3, power: "50 kW", distance: "3.2 km" },
  { id: "ST-06", name: "East Park & Ride", address: "90 East Road · East", district: "East", ports: 5, free: 1, power: "80 kW", distance: "3.7 km" },
];

let complaints = [
  { id: "CMP-2481", category: "Street lighting", location: "14 Lakeview Road", description: "Streetlight is not working.", submitted: "Today, 8:32 AM", status: "In review", deadline: "Nov 25, 2026" },
  { id: "CMP-2479", category: "Road & traffic", location: "Market Street, Central", description: "A damaged road surface needs repair.", submitted: "Yesterday", status: "Assigned", deadline: "Nov 24, 2026" },
  { id: "CMP-2476", category: "Waste & sanitation", location: "8 Garden Lane", description: "Missed waste collection.", submitted: "Nov 12, 2026", status: "Resolved", deadline: "Nov 22, 2026" },
];

let reservations = [];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const modalBackdrop = $("#modal-backdrop");
let modalMode = "complaint";
let stationFilter = "all";
let districtFilter = "all";
let complaintFilter = "all";
let ambulanceZoneFilter = "all";
let toastTimer;
let mapZoom = 1;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function saveDemoState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ambulanceUnits, stations, complaints, reservations }));
    return true;
  } catch (error) {
    console.error("Could not save CityPulse demo changes to this browser.", error);
    showToast("Change applied, but your browser could not save it.");
    return false;
  }
}

function isValidSavedState(data) {
  const validStatuses = ["Available", "En route", "On call"];
  return data && Array.isArray(data.ambulanceUnits) && Array.isArray(data.stations)
    && Array.isArray(data.complaints) && Array.isArray(data.reservations)
    && data.ambulanceUnits.every((unit) => typeof unit.id === "string" && validStatuses.includes(unit.status))
    && data.stations.every((station) => typeof station.id === "string" && Number.isInteger(station.free) && station.free >= 0 && station.free <= station.ports)
    && data.complaints.every((item) => typeof item.id === "string" && typeof item.location === "string" && typeof item.description === "string")
    && data.reservations.every((item) => typeof item.id === "string" && typeof item.stationId === "string" && ["Upcoming", "Cancelled"].includes(item.status));
}

function restoreDemoState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (!isValidSavedState(data)) throw new Error("Saved demo data has an unsupported format.");
    ambulanceUnits = data.ambulanceUnits;
    stations = data.stations;
    complaints = data.complaints;
    reservations = data.reservations;
  } catch (error) {
    console.error("Could not restore CityPulse demo data.", error);
    showToast("Saved demo data could not be loaded. Reset the demo to start fresh.");
  }
}

function setPage(pageName) {
  const page = document.getElementById(pageName);
  if (!page) return;
  $$(".page-section").forEach((section) => section.classList.toggle("active-page", section === page));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === pageName));
  $("#breadcrumb-current").textContent = pageName === "overview" ? "Overview" : pageName === "ambulances" ? "Ambulances" : pageName === "charging" ? "EV charging" : "Complaints";
  $("#sidebar").classList.remove("open");
  if (window.location.hash !== `#${pageName}`) window.location.hash = pageName;
}

function renderAmbulances() {
  const visibleUnits = ambulanceUnits.filter((unit) => ambulanceZoneFilter === "all" || unit.zone === ambulanceZoneFilter);
  const rows = visibleUnits.map((unit) => {
    const statusClass = unit.status === "Available" ? "available" : "on-route";
    return `<tr><td><span class="unit-id"><i>✚</i> ${escapeHtml(unit.id)}</span></td><td>${escapeHtml(unit.zone)}</td><td>${escapeHtml(unit.location)}</td><td><span class="table-status ${statusClass}"><i></i> ${escapeHtml(unit.status)}</span></td><td><strong>${escapeHtml(unit.eta)}</strong></td><td>${unit.status === "Available" ? `<button class="unit-actions" data-dispatch="${escapeHtml(unit.id)}">Dispatch</button>` : `<button class="unit-actions" data-unit="${escapeHtml(unit.id)}">Details</button>`}</td></tr>`;
  }).join("");
  $("#ambulance-table").innerHTML = rows;

  const counts = getFleetCounts();
  $("#active-ambulances").textContent = String(ambulanceUnits.length).padStart(2, "0");
  $("#responding-ambulances").textContent = counts.responding;
  $("#available-ambulances").textContent = counts.available;
  $("#fleet-total").innerHTML = `${String(ambulanceUnits.length).padStart(2, "0")} <span class="stat-unit">units</span>`;
  $("#fleet-available").innerHTML = `${String(counts.available).padStart(2, "0")} <span class="stat-unit">units</span>`;
  $("#fleet-responding").innerHTML = `${String(counts.responding).padStart(2, "0")} <span class="stat-unit">units</span>`;
  renderOverviewFleet();
}

function getFleetCounts() {
  return {
    available: ambulanceUnits.filter((unit) => unit.status === "Available").length,
    responding: ambulanceUnits.filter((unit) => unit.status !== "Available").length,
  };
}

function renderOverviewFleet() {
  $("#overview-fleet").innerHTML = ambulanceUnits.slice(0, 3).map((unit) => {
    const statusClass = unit.status === "Available" ? "available" : "on-route";
    return `<tr><td><span class="unit-id"><i>✚</i> ${escapeHtml(unit.id)}</span></td><td>${escapeHtml(unit.zone.replace(" District", ""))}</td><td><span class="table-status ${statusClass}"><i></i> ${escapeHtml(unit.status)}</span></td><td><strong>${escapeHtml(unit.eta)}</strong></td></tr>`;
  }).join("");
}

function renderStationCounts() {
  const free = stations.reduce((total, station) => total + station.free, 0);
  const ports = stations.reduce((total, station) => total + station.ports, 0);
  const openStations = stations.filter((station) => station.free > 0).length;
  $("#free-chargers-total").textContent = free;
  $("#charging-banner-free").textContent = free;
  $("#summary-free").textContent = free;
  $("#summary-free-detail").textContent = free;
  const reserved = reservations.filter((item) => item.status === "Upcoming").length;
  $("#summary-busy").textContent = Math.max(0, ports - free - reserved);
  $("#summary-reserved").textContent = reserved;
  $("#station-count-all").textContent = stations.length;
  $("#station-count-available").textContent = openStations;
  $("#station-count-busy").textContent = stations.length - openStations;
}

function renderStations() {
  const visibleStations = stations.filter((station) => {
    const matchesAvailability = stationFilter === "all" || (stationFilter === "available" ? station.free > 0 : station.free === 0);
    return matchesAvailability && (districtFilter === "all" || station.district === districtFilter);
  });
  $("#station-grid").innerHTML = visibleStations.map((station) => {
    const available = station.free > 0;
    return `<article class="station-card"><div class="station-card-top"><div class="station-location-icon">ϟ</div><span class="${available ? "station-open" : "station-full"}">${available ? "● Available" : "Fully booked"}</span></div><h3>${escapeHtml(station.name)}</h3><div class="station-address">${escapeHtml(station.address)}</div><div class="station-card-meta"><span><strong>${escapeHtml(station.power)}</strong> · Fast charging</span><span><strong>${escapeHtml(station.distance)}</strong></span></div><div class="station-card-bottom"><div class="station-ports"><span class="port-dots">${Array.from({ length: station.ports }, (_, index) => `<i class="${index >= station.free ? "busy" : ""}"></i>`).join("")}</span>${station.free} of ${station.ports} free</div><button class="reserve-small" data-book="${escapeHtml(station.id)}" ${available ? "" : "disabled"}>${available ? "Reserve →" : "Unavailable"}</button></div></article>`;
  }).join("");

  $("#station-select").innerHTML = stations.filter((station) => station.free > 0)
    .map((station) => `<option value="${escapeHtml(station.id)}">${escapeHtml(station.name)} · ${station.free} spots free</option>`).join("");
  renderStationCounts();
}

function renderReservations() {
  const active = reservations.filter((reservation) => reservation.status === "Upcoming");
  $("#reservation-count").textContent = `${active.length} ${active.length === 1 ? "booking" : "bookings"}`;
  $("#empty-reservations").classList.toggle("hidden", reservations.length > 0);
  $("#reservations-table").innerHTML = [...reservations].reverse().map((reservation) => {
    const station = stations.find((item) => item.id === reservation.stationId);
    const name = station ? station.name : "Station unavailable";
    const cancelButton = reservation.status === "Upcoming" ? `<button class="unit-actions" data-cancel-reservation="${escapeHtml(reservation.id)}">Cancel</button>` : "";
    return `<tr><td><span class="complaint-id">${escapeHtml(reservation.id)}</span></td><td>${escapeHtml(name)}</td><td>${escapeHtml(reservation.date)} · ${escapeHtml(reservation.time)}</td><td><span class="complaint-state ${reservation.status === "Upcoming" ? "state-assigned" : "state-resolved"}">${escapeHtml(reservation.status)}</span></td><td>${cancelButton}</td></tr>`;
  }).join("");
}

function renderComplaints() {
  const query = $("#complaint-search").value.trim().toLowerCase();
  const visible = complaints.filter((complaint) => {
    const matchesFilter = complaintFilter === "all" || (complaintFilter === "open" ? complaint.status !== "Resolved" : complaint.status === complaintFilter);
    const text = `${complaint.id} ${complaint.category} ${complaint.location} ${complaint.description} ${complaint.status}`.toLowerCase();
    return matchesFilter && text.includes(query);
  });
  $("#complaints-table").innerHTML = visible.map((complaint) => {
    const statusClass = complaint.status === "Resolved" ? "state-resolved" : complaint.status === "Assigned" ? "state-assigned" : "state-review";
    const action = complaint.status === "In review" ? "Assign" : complaint.status === "Assigned" ? "Resolve" : "";
    return `<tr><td><span class="complaint-id">#${escapeHtml(complaint.id)}</span></td><td><span class="category-tag">${escapeHtml(complaint.category)}</span></td><td>${escapeHtml(complaint.location)}</td><td class="complaint-description" title="${escapeHtml(complaint.description)}">${escapeHtml(complaint.description)}</td><td>${escapeHtml(complaint.submitted)}</td><td><span class="complaint-state ${statusClass}">${escapeHtml(complaint.status)}</span></td><td class="${complaint.status === "Resolved" ? "" : "deadline-soon"}">${escapeHtml(complaint.deadline)}</td><td>${action ? `<button class="unit-actions" data-advance-complaint="${escapeHtml(complaint.id)}">${action}</button>` : ""}</td></tr>`;
  }).join("");
  $("#empty-complaints").classList.toggle("hidden", visible.length > 0);
  $("#all-count").textContent = complaints.length;
  const openCount = complaints.filter((item) => item.status !== "Resolved").length;
  $("#open-complaint-total").innerHTML = `${String(openCount).padStart(2, "0")} <span class="stat-unit">to resolve</span>`;
  $("#nav-complaint-count").textContent = String(openCount).padStart(2, "0");
}

function openModal(mode, stationId) {
  modalMode = mode;
  const booking = mode === "booking";
  $("#modal-title").textContent = booking ? "Reserve a charging spot" : "Submit a complaint";
  $("#modal-description").textContent = booking ? "Choose a station and arrival time. Your reservation will appear in this demo." : "Tell us what needs attention. We’ll provide a reference number so you can follow up.";
  $("#modal-dot").classList.toggle("charge-eyebrow", booking);
  $("#complaint-category-field").classList.toggle("hidden", booking);
  $("#station-field").classList.toggle("hidden", !booking);
  $("#booking-fields").classList.toggle("hidden", !booking);
  $("#location-field").classList.toggle("hidden", booking);
  $("#description-field").classList.toggle("hidden", booking);
  [$("#complaint-category"), $("#complaint-location"), $("#complaint-description")].forEach((field) => { field.disabled = booking; });
  [$("#station-select"), $("#booking-date"), $("#booking-time")].forEach((field) => { field.disabled = !booking; });
  $("#modal-submit").innerHTML = booking ? "Confirm reservation <span>→</span>" : "Submit complaint <span>→</span>";
  $("#form-note").textContent = booking ? "Demo reservation only. No real charging station is booked." : "Your report will be added to this demo dashboard.";
  $("#modal-form").classList.remove("hidden");
  $("#success-message").classList.add("hidden");
  $("#modal-form").reset();
  renderStations();
  if (stationId) $("#station-select").value = stationId;
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  $("#booking-date").min = date.toISOString().slice(0, 10);
  $("#booking-date").value = date.toISOString().slice(0, 10);
  modalBackdrop.classList.add("open");
  modalBackdrop.setAttribute("aria-hidden", "false");
  $("#modal-close").focus();
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

function newComplaintId() {
  const maxId = complaints.reduce((max, complaint) => Math.max(max, Number(complaint.id.slice(4)) || 0), 2480);
  return `CMP-${maxId + 1}`;
}

function dispatchUnit(unitId) {
  const unit = ambulanceUnits.find((item) => item.id === unitId && item.status === "Available");
  if (!unit) {
    showToast("No available demo unit was found.");
    return;
  }
  unit.status = "En route";
  unit.location = "Demo emergency · Central";
  unit.eta = "09 min";
  saveDemoState();
  renderAmbulances();
  showToast(`${unit.id} dispatched in the demo. No real emergency service was contacted.`);
}

$$(".nav-link").forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  setPage(link.dataset.page);
}));

$$("[data-go]").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.go)));
$("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#open-complaint").addEventListener("click", () => openModal("complaint"));
$("#open-booking").addEventListener("click", () => openModal("booking"));
$("#modal-close").addEventListener("click", closeModal);
$("#success-done").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

$("#modal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (modalMode === "booking") {
    const station = stations.find((item) => item.id === $("#station-select").value);
    const bookingDate = $("#booking-date").value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!station || station.free < 1) {
      showToast("That station no longer has an available spot.");
      return;
    }
    if (!bookingDate || new Date(`${bookingDate}T00:00:00`) < today) {
      $("#booking-date").focus();
      showToast("Choose today or a future date for your reservation.");
      return;
    }
    station.free -= 1;
    reservations.push({
      id: `CHG-${String(Date.now()).slice(-6)}`,
      stationId: station.id,
      date: new Date(`${bookingDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: $("#booking-time").value,
      status: "Upcoming",
    });
    saveDemoState();
    renderStations();
    renderReservations();
    $("#success-title").textContent = "Spot reserved";
    $("#success-copy").textContent = `Your demo reservation at ${station.name} for ${bookingDate} at ${$("#booking-time").value} is confirmed.`;
    $("#modal-form").classList.add("hidden");
    $("#success-message").classList.remove("hidden");
    showToast("Demo charging spot reserved.");
    return;
  }

  const location = $("#complaint-location").value.trim();
  const description = $("#complaint-description").value.trim();
  if (!location || !description) {
    (!location ? $("#complaint-location") : $("#complaint-description")).focus();
    showToast("Add a location and description before submitting.");
    return;
  }
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 10);
  complaints.unshift({
    id: newComplaintId(),
    category: $("#complaint-category").value,
    location,
    description,
    submitted: `Today, ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
    status: "In review",
    deadline: deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  });
  saveDemoState();
  renderComplaints();
  $("#success-title").textContent = "Complaint submitted";
  $("#success-copy").textContent = `Your reference is #${complaints[0].id}. It has been added to the demo tracker with a 10-day resolution target.`;
  $("#modal-form").classList.add("hidden");
  $("#success-message").classList.remove("hidden");
});

$("#station-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-book]");
  if (button) openModal("booking", button.dataset.book);
});

$("#station-district-filter").addEventListener("change", (event) => {
  districtFilter = event.target.value;
  renderStations();
});

$$(".station-tab").forEach((button) => button.addEventListener("click", () => {
  $$(".station-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  stationFilter = button.dataset.filter;
  renderStations();
}));

$("#reservations-table").addEventListener("click", (event) => {
  const button = event.target.closest("[data-cancel-reservation]");
  if (!button) return;
  const reservation = reservations.find((item) => item.id === button.dataset.cancelReservation && item.status === "Upcoming");
  if (!reservation) return;
  reservation.status = "Cancelled";
  const station = stations.find((item) => item.id === reservation.stationId);
  if (station) station.free = Math.min(station.ports, station.free + 1);
  saveDemoState();
  renderStations();
  renderReservations();
  showToast("Demo reservation cancelled.");
});

$$(".complaint-tab").forEach((button) => button.addEventListener("click", () => {
  $$(".complaint-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  complaintFilter = button.dataset.complaintFilter;
  renderComplaints();
}));
$("#complaint-search").addEventListener("input", renderComplaints);
$("#complaints-table").addEventListener("click", (event) => {
  const button = event.target.closest("[data-advance-complaint]");
  if (!button) return;
  const complaint = complaints.find((item) => item.id === button.dataset.advanceComplaint);
  if (!complaint) return;
  complaint.status = complaint.status === "In review" ? "Assigned" : "Resolved";
  saveDemoState();
  renderComplaints();
  showToast(`${complaint.id} marked ${complaint.status.toLowerCase()}.`);
});

$("#dispatch-button").addEventListener("click", () => {
  const unit = ambulanceUnits.find((item) => item.status === "Available");
  if (unit) dispatchUnit(unit.id);
  else showToast("No available demo ambulance units.");
});
$("#ambulance-table").addEventListener("click", (event) => {
  const dispatchButton = event.target.closest("[data-dispatch]");
  if (dispatchButton) {
    dispatchUnit(dispatchButton.dataset.dispatch);
    return;
  }
  const detailsButton = event.target.closest("[data-unit]");
  if (detailsButton) showToast(`${detailsButton.dataset.unit} · Demo fleet unit details.`);
});
$("#ambulance-zone-filter").addEventListener("change", (event) => {
  ambulanceZoneFilter = event.target.value;
  renderAmbulances();
});

$("#map-expand").addEventListener("click", () => showToast("This is an illustrative map; live mapping is not connected."));
$$(".map-controls button").forEach((button, index) => button.addEventListener("click", () => {
  mapZoom = Math.min(1.45, Math.max(1, mapZoom + (index === 0 ? 0.1 : -0.1)));
  $(".map-drawing").style.transform = `scale(${mapZoom})`;
}));

$("#reset-demo").addEventListener("click", () => {
  if (!window.confirm("Reset all demo changes, bookings, and complaints in this browser?")) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch (error) {
    console.error("Could not reset CityPulse demo data.", error);
    showToast("The demo could not be reset. Check your browser storage settings.");
  }
});

restoreDemoState();
$("#today-date").textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
$("#welcome-date").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
renderAmbulances();
renderStations();
renderReservations();
renderComplaints();
const initialPage = window.location.hash.slice(1);
if (["overview", "ambulances", "charging", "complaints"].includes(initialPage)) setPage(initialPage);
