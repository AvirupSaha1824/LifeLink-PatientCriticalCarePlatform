import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import {
  DEMO_STEPS,
  closeDemoSession,
  demoStepView,
  nextDemoState,
  previousDemoState,
  restartDemoSession,
  startDemoSession,
  type DemoState,
  type DemoView,
} from "@/lib/demoFlow";
import {
  getReservationViewState,
  RESERVATION_EMPTY_COPY,
  RESERVATION_ERROR_TITLE,
  RESERVATION_RETRY_LABEL,
  retryReservationQuery,
} from "@/lib/reservationView";
import {
  CAREGIVER_EMPTY_COPY,
  CAREGIVER_ERROR_TITLE,
  CAREGIVER_RETRY_LABEL,
  getCaregiverViewState,
  retryCaregiverNetwork,
} from "@/lib/caregiverView";
import {
  getTreatmentViewState,
  TREATMENT_EMPTY_COPY,
  TREATMENT_ERROR_TITLE,
  TREATMENT_RETRY_LABEL,
  retryTreatmentQuery,
} from "@/lib/treatmentView";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  HeartPulse,
  Hospital,
  Loader2,
  MapPinned,
  Navigation,
  PackageCheck,
  Pill,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
type BloodGroup = (typeof BLOOD_GROUPS)[number];
type View = DemoView | "medicines" | "critical" | "reservations" | "treatments" | "caregivers";

function bloodGroupLabel(group: BloodGroup) {
  if (group === "O-") return "Universal donor";
  if (group === "AB+") return "Universal recipient";
  return group.endsWith("+") ? "Positive" : "Negative";
}

type BloodMapRow = {
  bloodBankId: number;
  bloodBankName: string;
  bloodGroup: string;
  component: string;
  availableUnits: number;
  availabilityStatus: "available" | "limited" | "unavailable";
  addressLine1: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  contactPhone: string | null;
};

const componentFallback = [
  "Packed Red Blood Cells (PRBC)",
  "Platelet Concentrate (RDP/SDP)",
  "Fresh Frozen Plasma (FFP)",
  "Whole Blood",
];

function formatUpdated(value: Date | string | null) {
  if (!value) return "Recently updated";
  return `Updated ${new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

function statusClass(status: string) {
  if (status === "available" || status === "in_stock" || status === "fulfilled" || status === "completed") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "accepted" || status === "confirmed") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (status === "in_progress") return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  if (status === "limited" || status === "low_stock" || status === "on_request" || status === "pending" || status === "scheduled" || status === "delayed") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-rose-400/25 bg-rose-400/10 text-rose-100";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] ${statusClass(status)}`}>{statusLabel(status)}</span>;
}

function DemoDataNotice() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300/15 bg-amber-200/[0.055] px-3 py-2 text-xs leading-5 text-amber-100/80">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
      <span>Representative demonstration records are shown. Confirm availability and clinical suitability directly with the listed provider.</span>
    </div>
  );
}

function DataState({ loading, error, empty, onRetry, itemName, errorTitle, emptyDescription, retryLabel }: { loading: boolean; error?: string; empty: boolean; onRetry: () => void; itemName: string; errorTitle?: string; emptyDescription?: string; retryLabel?: string }) {
  if (loading) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-950/30 text-sm text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-300" /> Loading {itemName}…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/[0.045] px-6 text-center">
        <AlertTriangle className="mb-2 h-5 w-5 text-rose-300" />
        <p className="text-sm font-semibold text-rose-100">{errorTitle ?? `We could not load ${itemName}.`}</p>
        <p className="mt-1 max-w-md text-xs text-rose-100/65">{error}</p>
        <Button variant="outline" onClick={onRetry} className="mt-4 border-rose-200/20 bg-transparent text-rose-50 hover:bg-rose-400/10 hover:text-rose-50">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> {retryLabel ?? "Try again"}
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-950/30 px-6 text-center">
        <Search className="mb-2 h-5 w-5 text-slate-500" />
        <p className="text-sm font-semibold text-slate-200">No {itemName} found</p>
        <p className="mt-1 text-xs text-slate-500">{emptyDescription ?? "Try a different name, category, blood group, component, or location."}</p>
      </div>
    );
  }
  return null;
}

function BloodBankMap({ rows, selectedBloodBankId }: { rows: BloodMapRow[]; selectedBloodBankId: number | null }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();

    rows.forEach(row => {
      const position = { lat: row.latitude, lng: row.longitude };
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: row.bloodBankName,
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:220px"><strong>${row.bloodBankName}</strong><br/><span>${row.availableUnits} unit${row.availableUnits === 1 ? "" : "s"} · ${row.component}</span><br/><small>${row.addressLine1}, ${row.city}</small></div>`,
      });
      marker.addEventListener("gmp-click", () => infoWindow.open({ map, anchor: marker }));
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (selectedBloodBankId) {
      const selected = rows.find(row => row.bloodBankId === selectedBloodBankId);
      if (selected) map.panTo({ lat: selected.latitude, lng: selected.longitude });
    } else if (rows.length > 1) {
      map.fitBounds(bounds, 64);
    } else if (rows[0]) {
      map.setCenter({ lat: rows[0].latitude, lng: rows[0].longitude });
      map.setZoom(13);
    }
  }, [isMapReady, rows, selectedBloodBankId]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/40 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between border-b border-slate-700/65 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100"><MapPinned className="h-4 w-4 text-cyan-300" /> Nearby availability map</div>
        <span className="text-[11px] text-slate-500">{rows.length} location{rows.length === 1 ? "" : "s"}</span>
      </div>
      <MapView
        className="h-[330px] sm:h-[420px]"
        initialCenter={{ lat: 22.5726, lng: 88.3639 }}
        initialZoom={11}
        onMapReady={map => {
          mapRef.current = map;
          setIsMapReady(true);
        }}
      />
    </div>
  );
}

function BloodSearchPage() {
  const [draft, setDraft] = useState({ bloodGroup: "B+" as BloodGroup, component: componentFallback[0], location: "Kolkata" });
  const [filters, setFilters] = useState(draft);
  const [selectedBloodBankId, setSelectedBloodBankId] = useState<number | null>(null);
  const bloodQuery = useMemo(() => ({
    bloodGroup: filters.bloodGroup,
    component: filters.component || undefined,
    location: filters.location || undefined,
  }), [filters]);
  const { data: results, isLoading, error, refetch } = trpc.health.bloodBanks.list.useQuery(bloodQuery);
  const { data: components } = trpc.health.bloodBanks.components.useQuery();
  const componentOptions = components?.map(entry => entry.component) ?? componentFallback;
  const rows = results ?? [];

  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow">LifeLink Critical Care</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">Blood Search &amp; Real-Time Availability</h1>
      </div>

      <div className="rounded-2xl border border-slate-700/75 bg-[#101a31] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-5">
        <div className="grid gap-3 md:grid-cols-[0.85fr_1.25fr_1fr_auto] md:items-end">
          <label className="field-label">Blood group
            <select value={draft.bloodGroup} onChange={event => setDraft({ ...draft, bloodGroup: event.target.value as BloodGroup })} className="dashboard-input">
              {BLOOD_GROUPS.map(group => <option key={group} value={group}>{group} ({bloodGroupLabel(group)})</option>)}
            </select>
          </label>
          <label className="field-label">Component
            <select value={draft.component} onChange={event => setDraft({ ...draft, component: event.target.value })} className="dashboard-input">
              {componentOptions.map(component => <option key={component} value={component}>{component}</option>)}
            </select>
          </label>
          <label className="field-label">City / District
            <input value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} onKeyDown={event => { if (event.key === "Enter") setFilters(draft); }} className="dashboard-input" placeholder="Kolkata, West Bengal" />
          </label>
          <Button onClick={() => { setFilters(draft); setSelectedBloodBankId(null); }} className="h-10 rounded-lg bg-rose-500 px-5 font-bold text-white shadow-[0_8px_20px_rgba(244,63,94,.22)] hover:bg-rose-400">
            <Search className="mr-2 h-4 w-4" /> Search availability
          </Button>
        </div>
      </div>

      <DemoDataNotice />

      <DataState loading={isLoading} error={error?.message} empty={!isLoading && !error && rows.length === 0} onRetry={() => void refetch()} itemName="blood-bank availability" />

      {!isLoading && !error && rows.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(350px,0.96fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1"><p className="text-sm font-semibold text-slate-100">Matched availability</p><p className="text-xs text-slate-500">{rows.length} inventory record{rows.length === 1 ? "" : "s"}</p></div>
            <div className="space-y-3">
              {rows.map(row => {
                const isSelected = selectedBloodBankId === row.bloodBankId;
                return (
                  <article key={row.inventoryId} className={`rounded-xl border bg-[#111b32] p-4 transition-colors ${isSelected ? "border-cyan-300/60 shadow-[0_0_0_1px_rgba(103,232,249,.1)]" : "border-slate-700/75 hover:border-slate-600"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-bold text-slate-100">{row.bloodBankName}</h2><StatusPill status={row.availabilityStatus} /></div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPinned className="h-3.5 w-3.5 text-cyan-300/80" /> {row.addressLine1}, {row.city}, {row.state}</p>
                      </div>
                      <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-right"><p className="text-xl font-extrabold text-rose-100">{row.availableUnits}</p><p className="text-[10px] font-bold uppercase tracking-wider text-rose-200/70">Units available</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/60 pt-3">
                      <div><p className="text-xs font-semibold text-slate-200">{row.bloodGroup} · {row.component}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {formatUpdated(row.lastUpdatedAt)}</p></div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setSelectedBloodBankId(row.bloodBankId)} className="h-8 border-slate-600 bg-transparent px-3 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"><MapPinned className="mr-1.5 h-3.5 w-3.5" /> Map</Button>
                        <Button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${row.latitude},${row.longitude}`)}`, "_blank", "noopener,noreferrer")} className="h-8 bg-cyan-400/15 px-3 text-xs text-cyan-100 hover:bg-cyan-400/25"><Navigation className="mr-1.5 h-3.5 w-3.5" /> Directions</Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <BloodBankMap rows={rows} selectedBloodBankId={selectedBloodBankId} />
        </div>
      )}
    </section>
  );
}

function MedicineCard({ item }: { item: { medicineName: string; genericName: string | null; category: string; dosageForm: string; strength: string; isCritical: boolean; sourceName: string; sourceStatus: string; quantity: number; unit: string; availabilityStatus: string; city: string; state: string; addressLine1: string; contactPhone: string | null; lastVerifiedAt: Date | string } }) {
  return (
    <article className="rounded-xl border border-slate-700/75 bg-[#111b32] p-4 transition-colors hover:border-slate-600">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-bold text-slate-100">{item.medicineName} <span className="font-medium text-slate-400">{item.strength}</span></h3>{item.isCritical && <span className="rounded-full bg-violet-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">Critical</span>}</div><p className="mt-1 text-xs text-slate-500">{item.genericName ?? item.category} · {item.dosageForm}</p></div><StatusPill status={item.availabilityStatus} />
      </div>
      <div className="mt-4 grid gap-3 border-t border-slate-700/60 pt-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div><p className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><Building2 className="h-3.5 w-3.5 text-cyan-300/80" /> {item.sourceName}</p><p className="mt-1 text-[11px] text-slate-500">{item.addressLine1}, {item.city}, {item.state}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {formatUpdated(item.lastVerifiedAt)}</p></div>
        <div className="flex items-end justify-between gap-3 sm:block sm:text-right"><div><p className="text-xl font-extrabold text-emerald-100">{item.quantity}</p><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/65">{item.unit} listed</p></div>{item.contactPhone && <a href={`tel:${item.contactPhone.replaceAll(" ", "")}`} className="mt-2 inline-flex text-xs font-semibold text-cyan-200 hover:text-cyan-100">Call source <ChevronRight className="ml-0.5 h-3.5 w-3.5" /></a>}</div>
      </div>
    </article>
  );
}

function MedicineTrackerPage({ criticalOnly = false }: { criticalOnly?: boolean }) {
  const [draft, setDraft] = useState({ query: criticalOnly ? "Albumin" : "", category: "", location: "" });
  const [filters, setFilters] = useState(draft);
  const medicineQuery = useMemo(() => ({
    query: filters.query || undefined,
    category: filters.category || undefined,
    location: filters.location || undefined,
    criticalOnly: criticalOnly || undefined,
  }), [filters, criticalOnly]);
  const { data: results, isLoading, error, refetch } = trpc.health.medicines.list.useQuery(medicineQuery);
  const { data: categories } = trpc.health.medicines.categories.useQuery();
  const rows = results ?? [];
  const title = criticalOnly ? "Critical Medicine & Albumin 20% Availability" : "Medicine Tracker & Smart Stock Depletion Formula";

  return (
    <section className="space-y-5">
      <div><p className="eyebrow">LifeLink Critical Care</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">{title}</h1></div>
      <div className="rounded-2xl border border-slate-700/75 bg-[#101a31] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-5">
        {!criticalOnly && <div className="mb-4 rounded-lg border border-slate-700/50 bg-slate-950/25 px-3 py-2.5 text-xs leading-5 text-slate-400"><span className="font-semibold text-slate-300">Stock calculation:</span> Remaining = Initial Quantity − (Daily Units × Days Elapsed). Confirm dispensed stock and doses with the care team.</div>}
        <div className={`grid gap-3 ${criticalOnly ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1.1fr_0.8fr_0.75fr_auto]"} md:items-end`}>
          <label className="field-label">{criticalOnly ? "Search critical infusions / rare drugs" : "Medicine name"}
            <input value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} onKeyDown={event => { if (event.key === "Enter") setFilters(draft); }} className="dashboard-input" placeholder={criticalOnly ? "e.g. Albumin 20%, IVIG…" : "Search medicine name"} />
          </label>
          {!criticalOnly && <label className="field-label">Category
            <select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })} className="dashboard-input"><option value="">All categories</option>{categories?.map(category => <option key={category.category} value={category.category}>{category.category}</option>)}</select>
          </label>}
          {!criticalOnly && <label className="field-label">City / District
            <input value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} onKeyDown={event => { if (event.key === "Enter") setFilters(draft); }} className="dashboard-input" placeholder="Kolkata" />
          </label>}
          <Button onClick={() => setFilters(draft)} className="h-10 rounded-lg bg-rose-500 px-5 font-bold text-white shadow-[0_8px_20px_rgba(244,63,94,.22)] hover:bg-rose-400"><Search className="mr-2 h-4 w-4" /> {criticalOnly ? "Check pharmacy stock" : "Find medicine"}</Button>
        </div>
      </div>
      <DemoDataNotice />
      <DataState loading={isLoading} error={error?.message} empty={!isLoading && !error && rows.length === 0} onRetry={() => void refetch()} itemName="medicine availability" />
      {!isLoading && !error && rows.length > 0 && <div className="space-y-3">{rows.map(item => <MedicineCard key={item.availabilityId} item={item} />)}</div>}
    </section>
  );
}

const reservationStatusFilters = ["all", "pending", "accepted", "fulfilled", "cancelled"] as const;
type ReservationStatusFilter = (typeof reservationStatusFilters)[number];

function formatReservationTime(value: Date | string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function ReservationStatusPage() {
  const [statusFilter, setStatusFilter] = useState<ReservationStatusFilter>("all");
  const queryInput = useMemo(() => statusFilter === "all" ? {} : { status: statusFilter }, [statusFilter]);
  const { data: reservations, isLoading, error, refetch } = trpc.health.reservations.list.useQuery(queryInput);
  const rows = reservations ?? [];
  const reservationViewState = getReservationViewState({ isLoading, hasError: Boolean(error), itemCount: rows.length });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">LifeLink Critical Care</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">My Blood Reservations</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Track active requests and completed blood-component reservations across participating blood banks.</p></div><div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-cyan-100/70">Reservation records</p><p className="mt-1 text-xl font-extrabold text-cyan-100">{rows.length}</p></div></div>

      <DemoDataNotice />

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/75 bg-[#101a31] p-3">
        {reservationStatusFilters.map(status => <Button key={status} variant="outline" onClick={() => setStatusFilter(status)} className={`h-8 border px-3 text-xs font-bold capitalize ${statusFilter === status ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 hover:text-cyan-50" : "border-slate-600 bg-transparent text-slate-400 hover:bg-slate-700 hover:text-white"}`}>{status === "all" ? "All reservations" : status}</Button>)}
      </div>

      <DataState loading={reservationViewState === "loading"} error={reservationViewState === "error" ? error?.message : undefined} empty={reservationViewState === "empty"} onRetry={() => void retryReservationQuery(refetch)} itemName="blood reservations" errorTitle={RESERVATION_ERROR_TITLE} emptyDescription={RESERVATION_EMPTY_COPY} retryLabel={RESERVATION_RETRY_LABEL} />

      {reservationViewState === "ready" && <div className="space-y-3">{rows.map(reservation => <article key={reservation.reservationId} className="rounded-xl border border-slate-700/75 bg-[#111b32] p-4 transition-colors hover:border-slate-600"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-bold text-slate-100">{reservation.bloodBankName}</h2><StatusPill status={reservation.status} /></div><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPinned className="h-3.5 w-3.5 text-cyan-300/80" /> {reservation.addressLine1}, {reservation.city}, {reservation.state}</p></div><span className="rounded-full border border-slate-600 bg-slate-950/40 px-2.5 py-1 text-[10px] font-bold tracking-[.1em] text-slate-400">{reservation.referenceCode}</span></div><div className="mt-4 grid gap-3 border-t border-slate-700/60 pt-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Reserved component</p><p className="mt-1 text-sm font-semibold text-slate-100">{reservation.patientBloodGroup} · {reservation.component}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Requested units</p><p className="mt-1 text-sm font-semibold text-slate-100">{reservation.requestedUnits} unit{reservation.requestedUnits === 1 ? "" : "s"}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Required for</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-100"><CalendarDays className="h-3.5 w-3.5 text-slate-500" /> {formatReservationTime(reservation.requestedForAt)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Latest status</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-100"><Clock3 className="h-3.5 w-3.5 text-slate-500" /> {formatReservationTime(reservation.statusUpdatedAt)}</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-950/25 px-3 py-2.5"><p className="text-xs leading-5 text-slate-400">{reservation.status === "pending" ? "Waiting for the blood bank to review this reservation." : reservation.status === "accepted" ? "Accepted by the blood bank; confirm collection requirements directly with the provider." : reservation.status === "fulfilled" ? "Fulfilled — this is the terminal completed reservation status." : "This reservation has been cancelled."}</p>{reservation.contactPhone && <a href={`tel:${reservation.contactPhone.replaceAll(" ", "")}`} className="inline-flex shrink-0 items-center text-xs font-semibold text-cyan-200 hover:text-cyan-100">Call blood bank <ChevronRight className="ml-0.5 h-3.5 w-3.5" /></a>}</div></article>)}</div>}
    </section>
  );
}

const treatmentTypes = ["all", "transfusion", "chemotherapy"] as const;
const treatmentStatuses = ["all", "scheduled", "confirmed", "in_progress", "completed", "delayed", "cancelled"] as const;
type TreatmentTypeFilter = (typeof treatmentTypes)[number];
type TreatmentStatusFilter = (typeof treatmentStatuses)[number];

function TreatmentStatusPage() {
  const [treatmentType, setTreatmentType] = useState<TreatmentTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TreatmentStatusFilter>("all");
  const treatmentQuery = useMemo(() => ({
    treatmentType: treatmentType === "all" ? undefined : treatmentType,
    status: statusFilter === "all" ? undefined : statusFilter,
  }), [treatmentType, statusFilter]);
  const { data: treatments, isLoading, error, refetch } = trpc.health.treatments.list.useQuery(treatmentQuery);
  const rows = treatments ?? [];
  const treatmentViewState = getTreatmentViewState({ isLoading, hasError: Boolean(error), itemCount: rows.length });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">LifeLink Critical Care</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">Transfusion &amp; Chemotherapy Status</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Review hospital-published milestones, scheduled appointments, and the latest treatment status for transfusion and chemotherapy care.</p></div><div className="rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-violet-100/70">Hospital updates</p><p className="mt-1 text-xl font-extrabold text-violet-100">{rows.length}</p></div></div>

      <DemoDataNotice />

      <div className="space-y-3 rounded-xl border border-slate-700/75 bg-[#101a31] p-3"><div className="flex flex-wrap gap-2">{treatmentTypes.map(type => <Button key={type} variant="outline" onClick={() => setTreatmentType(type)} className={`h-8 border px-3 text-xs font-bold capitalize ${treatmentType === type ? "border-violet-300/45 bg-violet-300/10 text-violet-100 hover:bg-violet-300/15 hover:text-violet-50" : "border-slate-600 bg-transparent text-slate-400 hover:bg-slate-700 hover:text-white"}`}>{type === "all" ? "All treatments" : type}</Button>)}</div><div className="flex flex-wrap gap-2 border-t border-slate-700/60 pt-3">{treatmentStatuses.map(status => <Button key={status} variant="ghost" onClick={() => setStatusFilter(status)} className={`h-7 px-2.5 text-[10px] font-bold uppercase tracking-[.08em] ${statusFilter === status ? "bg-slate-700 text-slate-100 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"}`}>{status === "all" ? "All statuses" : statusLabel(status)}</Button>)}</div></div>

      <DataState loading={treatmentViewState === "loading"} error={treatmentViewState === "error" ? error?.message : undefined} empty={treatmentViewState === "empty"} onRetry={() => void retryTreatmentQuery(refetch)} itemName="hospital treatment updates" errorTitle={TREATMENT_ERROR_TITLE} emptyDescription={TREATMENT_EMPTY_COPY} retryLabel={TREATMENT_RETRY_LABEL} />

      {treatmentViewState === "ready" && <div className="space-y-3">{rows.map(treatment => { const isTransfusion = treatment.treatmentType === "transfusion"; return <article key={treatment.treatmentId} className="rounded-xl border border-slate-700/75 bg-[#111b32] p-4 transition-colors hover:border-slate-600"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isTransfusion ? "bg-rose-400/10 text-rose-200" : "bg-violet-400/10 text-violet-200"}`}>{isTransfusion ? <Droplets className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-[15px] font-bold text-slate-100">{isTransfusion ? "Transfusion" : "Chemotherapy"} · {treatment.hospitalName}</h2><StatusPill status={treatment.status} /></div><p className="mt-1 text-xs text-slate-400">{treatment.department} <span className="text-slate-600">•</span> {treatment.addressLine1}, {treatment.city}</p></div></div><span className="rounded-full border border-slate-600 bg-slate-950/40 px-2.5 py-1 text-[10px] font-bold tracking-[.1em] text-slate-400">{treatment.referenceCode}</span></div><div className="mt-4 grid gap-3 border-t border-slate-700/60 pt-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Treatment detail</p><p className="mt-1 text-sm font-semibold text-slate-100">{treatment.treatmentDetail}{treatment.bloodGroup ? ` · ${treatment.bloodGroup}` : ""}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Cycle / allocation</p><p className="mt-1 text-sm font-semibold text-slate-100">{treatment.careCycle ?? (treatment.plannedUnits ? `${treatment.plannedUnits} unit${treatment.plannedUnits === 1 ? "" : "s"}` : "Care-team review")}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Scheduled for</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-100"><CalendarDays className="h-3.5 w-3.5 text-slate-500" /> {formatReservationTime(treatment.scheduledForAt)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Hospital update</p><p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-100"><Clock3 className="h-3.5 w-3.5 text-slate-500" /> {formatReservationTime(treatment.statusUpdatedAt)}</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-950/25 px-3 py-2.5"><p className="max-w-3xl text-xs leading-5 text-slate-400">{treatment.careNotes ?? "Hospital status has been updated; confirm care instructions directly with the treatment team."}</p><a href={`tel:${treatment.hospitalPhone.replaceAll(" ", "")}`} className="inline-flex shrink-0 items-center text-xs font-semibold text-cyan-200 hover:text-cyan-100">Call hospital <ChevronRight className="ml-0.5 h-3.5 w-3.5" /></a></div></article>; })}</div>}
    </section>
  );
}

function initials(name: string) {
  return name.replace("Demo — ", "").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function CareJourneyTrace({
  updates,
  suggestions,
}: {
  updates: Array<{ updateId: number; reservationReferenceCode: string | null; treatmentReferenceCode: string | null }>;
  suggestions: Array<{ suggestionId: number; reservationReferenceCode: string | null; treatmentReferenceCode: string | null }>;
}) {
  const sharedJourneyUpdate = updates.find(update => update.reservationReferenceCode && update.treatmentReferenceCode);
  const linkedSuggestion = suggestions.find(suggestion => suggestion.reservationReferenceCode && suggestion.treatmentReferenceCode);
  if (!sharedJourneyUpdate && !linkedSuggestion) return null;

  return <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-cyan-200">Connected care journey</p><p className="mt-1 text-xs leading-5 text-slate-300">The representative workflow links the accepted blood reservation to the hospital status and caregiver coordination record.</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-cyan-100">{sharedJourneyUpdate && <span className="rounded-full border border-cyan-300/20 bg-slate-950/25 px-2.5 py-1">Reservation {sharedJourneyUpdate.reservationReferenceCode} → Hospital {sharedJourneyUpdate.treatmentReferenceCode}</span>}{linkedSuggestion && <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-violet-100">Suggestion linked to the same care record</span>}</div></div>;
}

function CaregiverModePage() {
  const patientName = "Srijan";
  const [showInvite, setShowInvite] = useState(false);
  const [linkStatusFilter, setLinkStatusFilter] = useState<"all" | "active" | "invited" | "paused">("all");
  const [inviteForm, setInviteForm] = useState({ fullName: "", relationship: "Family caregiver", phone: "", email: "" });
  const caregiverQuery = useMemo(() => ({ patientName, linkStatus: linkStatusFilter === "all" ? undefined : linkStatusFilter }), [linkStatusFilter]);
  const linksQuery = trpc.health.caregivers.links.useQuery(caregiverQuery);
  const updatesQuery = trpc.health.caregivers.updates.useQuery(caregiverQuery);
  const suggestionsQuery = trpc.health.caregivers.suggestions.useQuery(caregiverQuery);
  const utils = trpc.useUtils();
  const inviteMutation = trpc.health.caregivers.invite.useMutation({
    onSuccess: result => {
      void utils.health.caregivers.links.invalidate();
      setShowInvite(false);
      setInviteForm({ fullName: "", relationship: "Family caregiver", phone: "", email: "" });
      toast.success(result.created ? "Caregiver invitation created." : "This caregiver is already linked.");
    },
    onError: mutationError => toast.error(mutationError.message),
  });
  const links = linksQuery.data ?? [];
  const updates = updatesQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];
  const isLoading = linksQuery.isLoading || updatesQuery.isLoading || suggestionsQuery.isLoading;
  const queryError = linksQuery.error?.message ?? updatesQuery.error?.message ?? suggestionsQuery.error?.message;
  const caregiverViewState = getCaregiverViewState({ isLoading, hasError: Boolean(queryError), caregiverCount: links.length });
  const retry = () => void retryCaregiverNetwork([linksQuery.refetch, updatesQuery.refetch, suggestionsQuery.refetch]);
  const submitInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inviteMutation.mutate({ patientName, fullName: inviteForm.fullName, relationship: inviteForm.relationship, phone: inviteForm.phone, email: inviteForm.email || undefined });
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">LifeLink Critical Care</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]"><UsersRound className="h-6 w-6 text-rose-300" /> Caregiver Mode &amp; Shared Safety Network</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Linked caregivers receive care-coordination updates for reservations, hospital schedules, and medicine availability so they can help with practical next steps.</p></div><Button onClick={() => setShowInvite(value => !value)} className="bg-rose-500 font-bold text-white hover:bg-rose-400"><UsersRound className="mr-2 h-4 w-4" /> {showInvite ? "Close invite" : "Invite caregiver"}</Button></div>

      <DemoDataNotice />

      <CareJourneyTrace updates={updates} suggestions={suggestions} />

      {showInvite && <form onSubmit={submitInvite} className="rounded-2xl border border-rose-300/20 bg-[#111b32] p-4 shadow-[0_18px_48px_rgba(0,0,0,.2)] sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-slate-100">Invite a trusted caregiver</h2><p className="mt-1 text-xs leading-5 text-slate-400">A new invitation is stored with care-updates access. Confirm that you have permission to share the contact’s details.</p></div><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-amber-100">Demo contact flow</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="field-label">Caregiver name<input required value={inviteForm.fullName} onChange={event => setInviteForm({ ...inviteForm, fullName: event.target.value })} className="dashboard-input" placeholder="Full name" /></label><label className="field-label">Relationship<input required value={inviteForm.relationship} onChange={event => setInviteForm({ ...inviteForm, relationship: event.target.value })} className="dashboard-input" placeholder="Family caregiver" /></label><label className="field-label">Phone number<input required value={inviteForm.phone} onChange={event => setInviteForm({ ...inviteForm, phone: event.target.value })} className="dashboard-input" placeholder="+91 90000 00000" /></label><label className="field-label">Email <span className="normal-case text-slate-500">optional</span><input type="email" value={inviteForm.email} onChange={event => setInviteForm({ ...inviteForm, email: event.target.value })} className="dashboard-input" placeholder="caregiver@example.com" /></label></div><div className="mt-4 flex justify-end"><Button type="submit" disabled={inviteMutation.isPending} className="bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/25">{inviteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UsersRound className="mr-2 h-4 w-4" />}{inviteMutation.isPending ? "Sending invitation" : "Create invitation"}</Button></div></form>}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700/75 bg-[#101a31] p-3">{(["all", "active", "invited", "paused"] as const).map(status => <Button key={status} variant="outline" onClick={() => setLinkStatusFilter(status)} className={`h-8 border px-3 text-xs font-bold capitalize ${linkStatusFilter === status ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 hover:text-cyan-50" : "border-slate-600 bg-transparent text-slate-400 hover:bg-slate-700 hover:text-white"}`}>{status === "all" ? "All caregivers" : status}</Button>)}</div>

      <DataState loading={caregiverViewState === "loading"} error={caregiverViewState === "error" ? queryError : undefined} empty={caregiverViewState === "empty"} onRetry={retry} itemName="caregiver network records" errorTitle={CAREGIVER_ERROR_TITLE} emptyDescription={CAREGIVER_EMPTY_COPY} retryLabel={CAREGIVER_RETRY_LABEL} />

      {caregiverViewState === "ready" && <><div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-slate-700/75 bg-[#111b32] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-100">Linked caregivers</p><p className="mt-1 text-xs text-slate-500">Sharing permissions and availability</p></div><span className="rounded-full border border-cyan-300/20 bg-cyan-300/[.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-cyan-100">{links.filter(link => link.linkStatus === "active").length} active</span></div><div className="mt-4 space-y-3">{links.map(link => <article key={link.linkId} className="rounded-xl border border-slate-700/65 bg-slate-950/20 p-3.5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-black text-slate-950">{initials(link.caregiverName)}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-slate-100">{link.caregiverName}</h2>{link.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />}</div><p className="mt-0.5 text-xs text-slate-500">{link.relationship} · {statusLabel(link.sharingLevel)}</p></div></div><div className="flex items-center gap-2"><StatusPill status={link.linkStatus} /><StatusPill status={link.availability} /></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/50 pt-2.5"><p className="text-[11px] text-slate-500">Updates: {statusLabel(link.notificationPreference)}{link.lastSharedAt ? ` · ${formatUpdated(link.lastSharedAt)}` : ""}</p><a href={`tel:${link.caregiverPhone.replaceAll(" ", "")}`} className="text-xs font-semibold text-cyan-200 hover:text-cyan-100">Call caregiver <ChevronRight className="ml-0.5 inline h-3.5 w-3.5" /></a></div></article>)}</div></div><div className="rounded-2xl border border-slate-700/75 bg-[#101a31] p-4 sm:p-5"><p className="text-sm font-bold text-slate-100">Shared care updates</p><p className="mt-1 text-xs text-slate-500">Recent updates visible to linked caregivers</p><div className="mt-4 space-y-3">{updates.map(update => <article key={update.updateId} className="border-l-2 border-cyan-300/50 pl-3"><div className="flex flex-wrap items-center gap-2"><StatusPill status={update.priority} /><p className="text-xs font-bold text-slate-200">{update.title}</p></div><p className="mt-1 text-xs leading-5 text-slate-400">{update.detail}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-500">Shared with {update.caregiverName} · {formatUpdated(update.sharedAt)}</p></article>)}</div></div></div><div className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-[#151b3f] to-[#111b32] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-100">Caregiver coordination suggestions</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Practical prompts from caregivers. They do not replace clinical advice; confirm medical decisions with the treating team.</p></div><span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-violet-100">{suggestions.filter(suggestion => suggestion.suggestionStatus === "new").length} new</span></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{suggestions.map(suggestion => <article key={suggestion.suggestionId} className="rounded-xl border border-slate-700/70 bg-slate-950/25 p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-violet-200">{suggestion.category}</p><StatusPill status={suggestion.suggestionStatus} /></div><h2 className="mt-3 text-sm font-bold text-slate-100">{suggestion.title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{suggestion.detail}</p><p className="mt-3 text-[10px] font-semibold uppercase tracking-[.08em] text-slate-500">From {suggestion.caregiverName} · {formatUpdated(suggestion.suggestedAt)}</p></article>)}</div></div></>}
    </section>
  );
}

function DemoBankOperationsPage({ status, onAccept }: { status: DemoState["reservationStatus"]; onAccept: () => void }) {
  const accepted = status === "accepted";
  return (
    <section className="space-y-5">
      <div><p className="eyebrow">LifeLink demo mode · blood bank operations</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">Kolkata Central Blood Bank — Reservation Requests</h1></div>
      <article className="rounded-2xl border border-slate-700/75 bg-[#111b32] p-5 shadow-[0_18px_48px_rgba(0,0,0,.2)]">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${accepted ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-100"}`}><PackageCheck className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-slate-100">Srijan · B+ PRBC reservation</h2><StatusPill status={accepted ? "available" : "limited"} /></div><p className="mt-1 text-xs leading-5 text-slate-400">2 PRBC units · 05 September 2026 · Patient care coordination request</p></div></div><span className="rounded-full border border-slate-600 bg-slate-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Demo request</span></div>
        <div className="mt-5 grid gap-3 border-t border-slate-700/60 pt-4 sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Requested units</p><p className="mt-1 text-lg font-extrabold text-slate-100">2 B+ PRBC</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Inventory allocation</p><p className={`mt-1 text-lg font-extrabold ${accepted ? "text-emerald-200" : "text-amber-100"}`}>{accepted ? "Allocated" : "Awaiting review"}</p></div><div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Patient notification</p><p className={`mt-1 text-lg font-extrabold ${accepted ? "text-cyan-200" : "text-slate-300"}`}>{accepted ? "Prepared" : "Pending"}</p></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-950/30 px-4 py-3"><p className="text-xs leading-5 text-slate-400">{accepted ? "The demo allocation is accepted. Advance to deliver the patient and caregiver alert." : "Review the incoming request, then accept it to allocate demonstration inventory."}</p>{!accepted && <Button onClick={onAccept} className="bg-emerald-500 text-white hover:bg-emerald-400"><CheckCircle2 className="mr-2 h-4 w-4" /> Accept reservation</Button>}</div>
      </article>
    </section>
  );
}

function DemoScenarioNotice({ demo }: { demo: DemoState }) {
  if (demo.step === 3) return <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-4 py-3 text-sm text-amber-100"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" /><div><strong className="font-bold">Demo reservation pending.</strong><p className="mt-1 text-xs leading-5 text-amber-100/70">Two B+ PRBC units are held in the guided scenario until the blood bank accepts the request.</p></div></div>;
  if (demo.step === 5) return <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[.06] px-4 py-3 text-sm text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><div><strong className="font-bold">Demo reservation accepted.</strong><p className="mt-1 text-xs leading-5 text-emerald-100/70">The guided inventory allocation is complete and the patient notification is ready.</p></div></div>;
  if (demo.step === 6) return <div className="mb-5 flex items-start gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3 text-sm text-cyan-100"><Bell className="mt-0.5 h-4 w-4 shrink-0" /><div><strong className="font-bold">Blood Reservation Accepted.</strong><p className="mt-1 text-xs leading-5 text-cyan-100/70">Srijan and caregiver Anita have been notified in this guided demonstration.</p></div></div>;
  return null;
}

function InteractiveDemoPanel({ demo, onBack, onNext, onRestart, onClose }: { demo: DemoState; onBack: () => void; onNext: () => void; onRestart: () => void; onClose: () => void }) {
  const step = DEMO_STEPS[demo.step];
  const isLast = demo.step === DEMO_STEPS.length - 1;
  return (
    <aside aria-live="polite" className="fixed inset-x-4 bottom-4 z-[60] max-w-md rounded-2xl border border-rose-300/30 bg-[#111b32]/95 p-4 shadow-[0_0_0_1px_rgba(244,63,94,.10),0_20px_55px_rgba(0,0,0,.5)] backdrop-blur sm:left-auto sm:right-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-rose-300"><PlayCircle className="h-3.5 w-3.5" /> Guided demo</p><h2 className="mt-1 text-sm font-bold text-slate-100">Step {demo.step + 1}: {step.title}</h2></div><button onClick={onClose} aria-label="Close guided demo" className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-700 hover:text-white"><X className="h-4 w-4" /></button></div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-cyan-400 transition-all duration-300" style={{ width: `${((demo.step + 1) / DEMO_STEPS.length) * 100}%` }} /></div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{step.description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-500">Step {demo.step + 1} of {DEMO_STEPS.length}</span><Button variant="ghost" onClick={onRestart} className="h-7 px-2 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400 hover:bg-slate-700 hover:text-white"><RefreshCw className="mr-1 h-3 w-3" /> Restart</Button></div><div className="flex gap-2"><Button variant="outline" disabled={demo.step === 0} onClick={onBack} className="h-8 border-slate-600 bg-transparent px-3 text-xs text-slate-200 hover:bg-slate-700 hover:text-white">Back</Button><Button onClick={onNext} className="h-8 bg-rose-500 px-3 text-xs font-bold text-white hover:bg-rose-400">{isLast ? "Finish demo" : "Next step"}</Button></div></div>
    </aside>
  );
}

function DashboardPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const actions = [
    { title: "Find Blood", description: "Live availability across regional blood banks", icon: Droplets, view: "blood" as const, tint: "text-rose-300" },
    { title: "Medicines", description: "Availability, stock status & source contacts", icon: Pill, view: "medicines" as const, tint: "text-violet-300" },
    { title: "Treatment", description: "Thalassemia 21-day cycles & chemotherapy milestones", icon: Stethoscope, view: "treatments" as const, tint: "text-cyan-300" },
    { title: "Caregiver", description: "Sync alerts and reservation updates with family", icon: UsersRound, view: "caregivers" as const, tint: "text-amber-300" },
  ];
  return (
    <section className="space-y-5"><div><p className="eyebrow">LifeLink Critical Care</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">Patient Care Coordination</h1></div><div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]"><article className="overflow-hidden rounded-2xl border border-rose-400/25 bg-[#111b32] p-5 shadow-[inset_3px_0_0_rgba(244,63,94,.9),0_18px_48px_rgba(0,0,0,.2)]"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300"><Clock3 className="h-3.5 w-3.5" /> Next care task</div><h2 className="mt-2 text-xl font-extrabold text-white">Blood Transfusion (B+ · 2 Units)</h2><p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><CalendarDays className="h-4 w-4 text-slate-500" /> 05 September 2026 <span className="text-slate-600">•</span> <Hospital className="h-4 w-4 text-slate-500" /> Care team venue</p><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => onNavigate("blood")} className="bg-rose-500 text-white hover:bg-rose-400"><Droplets className="mr-2 h-4 w-4" /> Arrange blood</Button><Button onClick={() => toast.info("The schedule view remains part of the original workflow.")} variant="outline" className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700 hover:text-white"><CalendarDays className="mr-2 h-4 w-4" /> View schedule</Button></div></article><article className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-[#151b3f] to-[#121b31] p-5"><div className="inline-flex items-center gap-2 rounded-full bg-indigo-400/15 px-2.5 py-1 text-[10px] font-bold text-indigo-100"><HeartPulse className="h-3.5 w-3.5" /> Daily care status</div><h2 className="mt-3 text-base font-bold text-white">Good evening, Srijan</h2><p className="mt-2 text-sm leading-6 text-slate-400">Your critical-care discovery tools are connected. Search availability before arranging a reservation.</p></article></div><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Quick actions</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(action => <button key={action.title} onClick={() => onNavigate(action.view)} className="group rounded-xl border border-slate-700/75 bg-[#111b32] p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-[#152039]"><action.icon className={`h-5 w-5 ${action.tint}`} /><h3 className="mt-5 text-sm font-bold text-slate-100">{action.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p><ChevronRight className="mt-3 h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300" /></button>)}</div></div><article className="rounded-xl border border-slate-700/75 bg-[#101a31] px-5 py-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-100"><CalendarDays className="h-4 w-4 text-rose-300" /> Upcoming care schedule</p></article></section>
  );
}

const navItems: Array<{ label: string; view?: View; icon: typeof HeartPulse }> = [
  { label: "Home Dashboard", view: "home", icon: HeartPulse },
  { label: "Find Blood & Map", view: "blood", icon: Search },
  { label: "My Reservations", view: "reservations", icon: CalendarDays },
  { label: "Transfusion & Chemo", view: "treatments", icon: Stethoscope },
  { label: "Medicine Tracker", view: "medicines", icon: Pill },
  { label: "Albumin & Critical Meds", view: "critical", icon: ShieldCheck },
  { label: "Caregiver Mode", view: "caregivers", icon: UsersRound },
];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demo, setDemo] = useState<DemoState | null>(null);
  const navigate = (nextView: View) => { setView(nextView); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startDemo = () => { const session = startDemoSession(); setDemo(session.demo); navigate(session.view); };
  const restartDemo = () => { const session = restartDemoSession(); setDemo(session.demo); navigate(session.view); };
  const closeDemo = () => { const session = closeDemoSession(); setDemo(session.demo); navigate(session.view); };
  const advanceDemo = () => {
    if (!demo) return;
    const next = nextDemoState(demo);
    if (!next) { setDemo(null); navigate("home"); return; }
    setDemo(next);
    navigate(demoStepView(next.step));
  };
  const rewindDemo = () => {
    if (!demo) return;
    const previous = previousDemoState(demo);
    setDemo(previous);
    navigate(demoStepView(previous.step));
  };
  const currentContent = view === "blood" ? <BloodSearchPage /> : view === "reservations" ? <ReservationStatusPage /> : view === "treatments" ? <TreatmentStatusPage /> : view === "caregivers" ? <CaregiverModePage /> : view === "medicines" ? <MedicineTrackerPage /> : view === "critical" ? <MedicineTrackerPage criticalOnly /> : view === "demo-bank" ? <DemoBankOperationsPage status={demo?.reservationStatus ?? "pending"} onAccept={advanceDemo} /> : <DashboardPage onNavigate={navigate} />;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100">
      <div className="fixed inset-x-0 top-0 z-50 flex min-h-10 items-center justify-between gap-3 bg-gradient-to-r from-[#6046df] via-[#5c69ed] to-[#00c9cb] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg sm:px-6"><span className="rounded-full bg-white/15 px-2.5 py-1 uppercase tracking-wide">Hackathon pitch</span><span className="hidden flex-1 text-center sm:block">Killer Demo: Blood Search → Reservation → Acceptance → Patient Alert</span><Button size="sm" onClick={startDemo} className="h-7 bg-white text-[11px] font-extrabold text-slate-900 hover:bg-slate-100"><PlayCircle className="mr-1.5 h-3.5 w-3.5 text-rose-500" /> Run interactive demo</Button></div>
      <div className="pt-10 lg:grid lg:grid-cols-[188px_minmax(0,1fr)]">
        <aside className={`fixed inset-y-10 left-0 z-40 w-[244px] border-r border-slate-800 bg-[#0d1425] transition-transform lg:sticky lg:top-10 lg:h-[calc(100vh-2.5rem)] lg:w-auto lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col"><div className="border-b border-slate-800 px-5 py-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500 shadow-[0_6px_14px_rgba(244,63,94,.25)]"><HeartPulse className="h-4 w-4 text-white" /></span><div><p className="text-sm font-black tracking-tight text-white">LIFELINK</p><p className="text-[8px] font-bold uppercase tracking-[0.13em] text-slate-500">Right blood · right time</p></div></div><label className="mt-5 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Active portal role<select defaultValue="patient" className="mt-1.5 h-9 w-full rounded-md border border-slate-600 bg-[#121d34] px-2 text-xs font-semibold text-slate-100 outline-none focus:border-indigo-400"><option value="patient">Patient View (Srijan · B+)</option><option value="blood">Blood Bank Portal</option><option value="caregiver">Caregiver Mode</option><option value="admin">System Administrator</option></select></label></div><nav className="flex-1 overflow-y-auto px-2 py-4"><p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Patient care coordination</p>{navItems.map(item => { const active = item.view === view; return <button key={item.label} onClick={() => item.view ? navigate(item.view) : toast.info(`${item.label} remains part of the existing workflow.`)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${active ? "bg-rose-500/15 text-rose-100 shadow-[inset_2px_0_0_rgb(244,63,94)]" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}><item.icon className={`h-4 w-4 ${active ? "text-rose-300" : "text-slate-500"}`} />{item.label}</button>; })}<p className="mt-6 px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Alerts &amp; notifications</p><button onClick={() => toast.info("No new critical care alerts.")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-100"><Bell className="h-4 w-4 text-slate-500" />Notifications</button></nav><div className="border-t border-slate-800 px-4 py-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-xs font-bold">S</span><div><p className="text-xs font-bold text-slate-200">Srijan</p><p className="text-[9px] text-slate-500">Patient · Thalassemia Major (B+)</p></div></div></div></div>
        </aside>
        {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <main className="min-w-0"><header className="sticky top-10 z-20 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0b1120]/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 text-slate-300 lg:hidden"><span className="block h-0.5 w-4 bg-current shadow-[0_5px_0_currentColor,0_-5px_0_currentColor]" /></button><p className="flex items-center gap-2 text-sm font-bold text-slate-100"><HeartPulse className="h-4 w-4 text-rose-400" /> LifeLink Critical Care</p></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-400 sm:inline">Secure care coordination</span><button onClick={() => toast.info("No new critical care alerts.")} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200"><Bell className="h-4 w-4" /></button></div></header><div className="mx-auto max-w-[1420px] px-4 py-7 sm:px-6 lg:px-7">{demo && <DemoScenarioNotice demo={demo} />}{currentContent}</div></main>
      </div>
      {demo && <InteractiveDemoPanel demo={demo} onBack={rewindDemo} onNext={advanceDemo} onRestart={restartDemo} onClose={closeDemo} />}
    </div>
  );
}
