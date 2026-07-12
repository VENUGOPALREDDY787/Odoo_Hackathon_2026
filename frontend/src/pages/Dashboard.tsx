import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Bell, Box, CalendarCheck, ClipboardCheck, Repeat2, ShieldCheck, Wrench } from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoModal, NeoSelect } from "../components/ui/NeoBrutalist";
import { assets, maintenanceRequests, notifications, stats, statusColor } from "../lib/assetflow-data";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ asset: "AF-0001", issue: "", priority: "Medium" });

  const kpis = [
    { label: "Available", value: stats.available, icon: <Box size={22} />, color: "bg-[#ccff00]" },
    { label: "Allocated", value: stats.allocated, icon: <ShieldCheck size={22} />, color: "bg-purple-400 text-white" },
    { label: "Maintenance", value: stats.maintenanceToday, icon: <Wrench size={22} />, color: "bg-orange-400" },
    { label: "Bookings", value: stats.activeBookings, icon: <CalendarCheck size={22} />, color: "bg-white" },
    { label: "Transfers", value: stats.pendingTransfers, icon: <Repeat2 size={22} />, color: "bg-black text-white" },
    { label: "Returns", value: stats.upcomingReturns, icon: <ClipboardCheck size={22} />, color: "bg-red-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <section className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <NeoCard color="bg-black text-white" className="relative overflow-hidden min-h-[360px]" interactive={false}>
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(135deg,#ccff00_0_20%,transparent_20%_40%,#a855f7_40%_60%,transparent_60%_80%,#fb923c_80%)] opacity-20" />
          <div className="relative z-10 max-w-3xl">
            <NeoBadge color="bg-[#ccff00] text-black">Enterprise ERP Console</NeoBadge>
            <h1 className="mt-6 text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.82]">AssetFlow<br />Command Center</h1>
            <p className="mt-6 text-lg md:text-xl font-bold text-white/75 max-w-2xl">Track assets, prevent allocation conflicts, approve maintenance, validate bookings, run audits, and surface every overdue risk from one responsive workspace.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <NeoButton variant="lime" onClick={() => navigate("/registry")}>Register Asset <ArrowUpRight size={18} /></NeoButton>
              <NeoButton variant="orange" onClick={() => navigate("/booking")}>Book Resource</NeoButton>
              <NeoButton variant="white" onClick={() => setIsMaintenanceOpen(true)}>Raise Request</NeoButton>
            </div>
          </div>
        </NeoCard>

        <NeoCard color="bg-[#ccff00]" className="space-y-5" interactive={false}>
          <div className="flex items-center justify-between border-b-4 border-black pb-4">
            <div>
              <p className="font-black uppercase text-sm">Signed in as</p>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Asset Manager</h2>
            </div>
            <Bell />
          </div>
          <div className="space-y-3">
            {notifications.map((item) => (
              <motion.button type="button" key={item.title} whileHover={{ x: 4 }} onClick={() => navigate("/logs")} className="w-full text-left bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black uppercase">{item.title}</h3>
                    <p className="font-bold text-sm text-neutral-600 mt-1">{item.detail}</p>
                  </div>
                  <span className="text-xs font-black whitespace-nowrap">{item.time}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </NeoCard>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <NeoCard color={kpi.color} className="p-5 min-h-36 flex flex-col justify-between" interactive>
              <div className="flex justify-between items-start">
                <p className="font-black uppercase text-sm">{kpi.label}</p>
                {kpi.icon}
              </div>
              <p className="text-5xl font-black tracking-tighter">{kpi.value}</p>
            </NeoCard>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <NeoCard color="bg-white" className="p-0 overflow-hidden" interactive={false}>
          <div className="p-6 bg-black text-white border-b-4 border-black flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase">Lifecycle Monitor</h2>
            <NeoButton variant="lime" className="py-2 px-4 text-xs" onClick={() => navigate("/registry")}>Open Registry</NeoButton>
          </div>
          <div className="divide-y-4 divide-black">
            {assets.slice(0, 5).map((asset) => (
              <div key={asset.tag} className="p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black italic">{asset.tag}</span>
                    <NeoBadge color={statusColor(asset.status)}>{asset.status}</NeoBadge>
                    {asset.shared && <NeoBadge color="bg-white">Bookable</NeoBadge>}
                  </div>
                  <h3 className="mt-2 text-xl font-black uppercase">{asset.name}</h3>
                  <p className="font-bold text-neutral-600 text-sm">{asset.location} / {asset.holder}</p>
                </div>
                <NeoButton variant="white" className="py-2 px-4 text-xs" onClick={() => alert(`${asset.tag} history opened.`)}>History</NeoButton>
              </div>
            ))}
          </div>
        </NeoCard>

        <NeoCard color="bg-orange-400" interactive={false}>
          <div className="flex justify-between items-start gap-4 border-b-4 border-black pb-5 mb-5">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">Approval Workbench</h2>
              <p className="font-bold text-sm text-black/70">Maintenance, transfer, return, and audit actions that need a manager.</p>
            </div>
            <NeoButton variant="black" className="py-2 px-4 text-xs" onClick={() => setIsReportOpen(true)}>Generate Report</NeoButton>
          </div>
          <div className="space-y-4">
            {maintenanceRequests.map((request) => (
              <div key={request.id} className="bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-black">{request.id}</span>
                      <NeoBadge color={statusColor(request.status)}>{request.status}</NeoBadge>
                      <NeoBadge color="bg-black text-white">{request.priority}</NeoBadge>
                    </div>
                    <h3 className="font-black uppercase mt-2">{request.asset}</h3>
                    <p className="font-bold text-sm text-neutral-600">{request.issue}</p>
                  </div>
                  <NeoButton variant={request.status === "Pending" ? "lime" : "white"} className="py-2 px-4 text-xs" onClick={() => navigate("/maintenance")}>Review</NeoButton>
                </div>
              </div>
            ))}
          </div>
        </NeoCard>
      </section>

      <NeoModal isOpen={isMaintenanceOpen} onClose={() => setIsMaintenanceOpen(false)} title="Raise Maintenance">
        <div className="space-y-4">
          <NeoSelect className="w-full" value={maintenanceForm.asset} onChange={(event) => setMaintenanceForm((form) => ({ ...form, asset: event.target.value }))}>
            {assets.map((asset) => <option key={asset.tag} value={asset.tag}>{asset.tag} - {asset.name}</option>)}
          </NeoSelect>
          <NeoInput className="w-full" placeholder="Describe the issue" value={maintenanceForm.issue} onChange={(event) => setMaintenanceForm((form) => ({ ...form, issue: event.target.value }))} />
          <NeoSelect className="w-full" value={maintenanceForm.priority} onChange={(event) => setMaintenanceForm((form) => ({ ...form, priority: event.target.value }))}>
            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </NeoSelect>
          <NeoButton className="w-full" variant="black" onClick={() => alert(maintenanceForm.issue ? "Maintenance request submitted." : "Add an issue description first.")}>Submit Request</NeoButton>
        </div>
      </NeoModal>

      <NeoModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} title="Generate ERP Report">
        <div className="space-y-4">
          <NeoSelect className="w-full"><option>Asset Utilization Trends</option><option>Department Allocation Summary</option><option>Maintenance Frequency</option><option>Resource Booking Heatmap</option><option>Audit Discrepancies</option></NeoSelect>
          <NeoSelect className="w-full"><option>PDF</option><option>CSV</option><option>XLSX</option></NeoSelect>
          <NeoButton variant="black" className="w-full" onClick={() => alert("Report export queued.")}>Export Report</NeoButton>
        </div>
      </NeoModal>
    </div>
  );
}
