import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
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
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
type BloodGroup = (typeof BLOOD_GROUPS)[number];
type View = "home" | "blood" | "medicines" | "critical";

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
  if (status === "available" || status === "in_stock") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "limited" || status === "low_stock" || status === "on_request") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
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

function DataState({ loading, error, empty, onRetry, itemName }: { loading: boolean; error?: string; empty: boolean; onRetry: () => void; itemName: string }) {
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
        <p className="text-sm font-semibold text-rose-100">We could not load {itemName}.</p>
        <p className="mt-1 max-w-md text-xs text-rose-100/65">{error}</p>
        <Button variant="outline" onClick={onRetry} className="mt-4 border-rose-200/20 bg-transparent text-rose-50 hover:bg-rose-400/10 hover:text-rose-50">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-950/30 px-6 text-center">
        <Search className="mb-2 h-5 w-5 text-slate-500" />
        <p className="text-sm font-semibold text-slate-200">No {itemName} found</p>
        <p className="mt-1 text-xs text-slate-500">Try a different name, category, blood group, component, or location.</p>
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

function DashboardPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const actions = [
    { title: "Find Blood", description: "Live availability across regional blood banks", icon: Droplets, view: "blood" as const, tint: "text-rose-300" },
    { title: "Medicines", description: "Availability, stock status & source contacts", icon: Pill, view: "medicines" as const, tint: "text-violet-300" },
    { title: "Treatment", description: "Thalassemia 21-day cycles & chemotherapy milestones", icon: Stethoscope, view: "home" as const, tint: "text-cyan-300" },
    { title: "Caregiver", description: "Sync alerts and reservation updates with family", icon: UsersRound, view: "home" as const, tint: "text-amber-300" },
  ];
  return (
    <section className="space-y-5"><div><p className="eyebrow">LifeLink Critical Care</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">Patient Care Coordination</h1></div><div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]"><article className="overflow-hidden rounded-2xl border border-rose-400/25 bg-[#111b32] p-5 shadow-[inset_3px_0_0_rgba(244,63,94,.9),0_18px_48px_rgba(0,0,0,.2)]"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300"><Clock3 className="h-3.5 w-3.5" /> Next care task</div><h2 className="mt-2 text-xl font-extrabold text-white">Blood Transfusion (B+ · 2 Units)</h2><p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><CalendarDays className="h-4 w-4 text-slate-500" /> 05 September 2026 <span className="text-slate-600">•</span> <Hospital className="h-4 w-4 text-slate-500" /> Care team venue</p><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => onNavigate("blood")} className="bg-rose-500 text-white hover:bg-rose-400"><Droplets className="mr-2 h-4 w-4" /> Arrange blood</Button><Button onClick={() => toast.info("The schedule view remains part of the original workflow.")} variant="outline" className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700 hover:text-white"><CalendarDays className="mr-2 h-4 w-4" /> View schedule</Button></div></article><article className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-[#151b3f] to-[#121b31] p-5"><div className="inline-flex items-center gap-2 rounded-full bg-indigo-400/15 px-2.5 py-1 text-[10px] font-bold text-indigo-100"><HeartPulse className="h-3.5 w-3.5" /> Daily care status</div><h2 className="mt-3 text-base font-bold text-white">Good evening, Srijan</h2><p className="mt-2 text-sm leading-6 text-slate-400">Your critical-care discovery tools are connected. Search availability before arranging a reservation.</p></article></div><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Quick actions</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(action => <button key={action.title} onClick={() => action.view === "home" ? toast.info(`${action.title} remains in the existing workflow.`) : onNavigate(action.view)} className="group rounded-xl border border-slate-700/75 bg-[#111b32] p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-[#152039]"><action.icon className={`h-5 w-5 ${action.tint}`} /><h3 className="mt-5 text-sm font-bold text-slate-100">{action.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p><ChevronRight className="mt-3 h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-slate-300" /></button>)}</div></div><article className="rounded-xl border border-slate-700/75 bg-[#101a31] px-5 py-4"><p className="flex items-center gap-2 text-sm font-bold text-slate-100"><CalendarDays className="h-4 w-4 text-rose-300" /> Upcoming care schedule</p></article></section>
  );
}

const navItems: Array<{ label: string; view?: View; icon: typeof HeartPulse }> = [
  { label: "Home Dashboard", view: "home", icon: HeartPulse },
  { label: "Find Blood & Map", view: "blood", icon: Search },
  { label: "My Reservations", icon: CalendarDays },
  { label: "Transfusion & Chemo", icon: Stethoscope },
  { label: "Medicine Tracker", view: "medicines", icon: Pill },
  { label: "Albumin & Critical Meds", view: "critical", icon: ShieldCheck },
  { label: "Caregiver Mode", icon: UsersRound },
];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = (nextView: View) => { setView(nextView); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const currentContent = view === "blood" ? <BloodSearchPage /> : view === "medicines" ? <MedicineTrackerPage /> : view === "critical" ? <MedicineTrackerPage criticalOnly /> : <DashboardPage onNavigate={navigate} />;

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100">
      <div className="fixed inset-x-0 top-0 z-50 flex min-h-10 items-center justify-between gap-3 bg-gradient-to-r from-[#6046df] via-[#5c69ed] to-[#00c9cb] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg sm:px-6"><span className="rounded-full bg-white/15 px-2.5 py-1 uppercase tracking-wide">Hackathon pitch</span><span className="hidden flex-1 text-center sm:block">Killer Demo: End-to-End Blood Search → Availability → Directions</span><Button size="sm" onClick={() => navigate("blood")} className="h-7 bg-white text-[11px] font-extrabold text-slate-900 hover:bg-slate-100"><Droplets className="mr-1.5 h-3.5 w-3.5 text-rose-500" /> Run discovery demo</Button></div>
      <div className="pt-10 lg:grid lg:grid-cols-[188px_minmax(0,1fr)]">
        <aside className={`fixed inset-y-10 left-0 z-40 w-[244px] border-r border-slate-800 bg-[#0d1425] transition-transform lg:sticky lg:top-10 lg:h-[calc(100vh-2.5rem)] lg:w-auto lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col"><div className="border-b border-slate-800 px-5 py-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500 shadow-[0_6px_14px_rgba(244,63,94,.25)]"><HeartPulse className="h-4 w-4 text-white" /></span><div><p className="text-sm font-black tracking-tight text-white">LIFELINK</p><p className="text-[8px] font-bold uppercase tracking-[0.13em] text-slate-500">Right blood · right time</p></div></div><label className="mt-5 block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Active portal role<select defaultValue="patient" className="mt-1.5 h-9 w-full rounded-md border border-slate-600 bg-[#121d34] px-2 text-xs font-semibold text-slate-100 outline-none focus:border-indigo-400"><option value="patient">Patient View (Srijan · B+)</option><option value="blood">Blood Bank Portal</option><option value="caregiver">Caregiver Mode</option><option value="admin">System Administrator</option></select></label></div><nav className="flex-1 overflow-y-auto px-2 py-4"><p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Patient care coordination</p>{navItems.map(item => { const active = item.view === view; return <button key={item.label} onClick={() => item.view ? navigate(item.view) : toast.info(`${item.label} remains part of the existing workflow.`)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${active ? "bg-rose-500/15 text-rose-100 shadow-[inset_2px_0_0_rgb(244,63,94)]" : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"}`}><item.icon className={`h-4 w-4 ${active ? "text-rose-300" : "text-slate-500"}`} />{item.label}</button>; })}<p className="mt-6 px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Alerts &amp; notifications</p><button onClick={() => toast.info("No new critical care alerts.")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-100"><Bell className="h-4 w-4 text-slate-500" />Notifications</button></nav><div className="border-t border-slate-800 px-4 py-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-500 text-xs font-bold">S</span><div><p className="text-xs font-bold text-slate-200">Srijan</p><p className="text-[9px] text-slate-500">Patient · Thalassemia Major (B+)</p></div></div></div></div>
        </aside>
        {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <main className="min-w-0"><header className="sticky top-10 z-20 flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0b1120]/95 px-4 backdrop-blur sm:px-6"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-700 text-slate-300 lg:hidden"><span className="block h-0.5 w-4 bg-current shadow-[0_5px_0_currentColor,0_-5px_0_currentColor]" /></button><p className="flex items-center gap-2 text-sm font-bold text-slate-100"><HeartPulse className="h-4 w-4 text-rose-400" /> LifeLink Critical Care</p></div><div className="flex items-center gap-2"><span className="hidden rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-slate-400 sm:inline">Secure care coordination</span><button onClick={() => toast.info("No new critical care alerts.")} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200"><Bell className="h-4 w-4" /></button></div></header><div className="mx-auto max-w-[1420px] px-4 py-7 sm:px-6 lg:px-7">{currentContent}</div></main>
      </div>
    </div>
  );
}
