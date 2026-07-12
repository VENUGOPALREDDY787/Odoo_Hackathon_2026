import { useMemo, useState } from "react";
import { Activity, Bell, Search, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { notifications } from "../lib/assetflow-data";

const auditLog = [
  { actor: "Mark Liu", action: "Promoted Rosa Diaz to Asset Manager", module: "Organization", time: "08:20", severity: "Admin" },
  { actor: "Rosa Diaz", action: "Approved MR-104 maintenance request", module: "Maintenance", time: "09:10", severity: "Workflow" },
  { actor: "Priya Nair", action: "Booked Conference Room B2", module: "Booking", time: "09:30", severity: "Booking" },
  { actor: "System", action: "Flagged AF-0005 as overdue", module: "Allocation", time: "10:00", severity: "Alert" },
  { actor: "Auditor", action: "Marked Tripod Kit missing", module: "Audit", time: "11:25", severity: "Audit" },
];

export default function ActivityLogs() {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("All Modules");
  const [unread, setUnread] = useState(notifications);
  const filteredLogs = useMemo(() => auditLog.filter((item) => `${item.actor} ${item.action} ${item.module}`.toLowerCase().includes(query.toLowerCase()) && (module === "All Modules" || item.module === module)), [module, query]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div><NeoBadge color="bg-[#ccff00]">Notifications and audit trail</NeoBadge><h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Activity.</h1><p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Who did what, when, and which workflow changed</p></div>
        <NeoButton variant="white" onClick={() => setUnread([])}><Bell size={18} /> Mark All Read</NeoButton>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
        <NeoCard color="bg-[#ccff00]" interactive={false}><h2 className="text-3xl font-black uppercase mb-5">Unread</h2><div className="space-y-3">{unread.length === 0 && <div className="bg-white border-4 border-black rounded-xl p-4 font-black uppercase">No unread notifications.</div>}{unread.map((item) => <div key={item.title} className="bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000]"><h3 className="font-black uppercase">{item.title}</h3><p className="font-bold text-sm text-neutral-600 mt-1">{item.detail}</p><p className="font-black text-xs mt-2">{item.time}</p></div>)}</div></NeoCard>
        <NeoCard className="p-0 overflow-hidden" interactive={false}>
          <div className="p-5 bg-black text-white border-b-4 border-black"><h2 className="text-2xl font-black uppercase">Full Audit Log</h2></div>
          <div className="p-5 bg-orange-400 border-b-4 border-black grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4"><div className="relative"><Search className="absolute left-3 top-3.5 z-10 pointer-events-none" /><NeoInput className="w-full bg-white pl-10" placeholder="Search actor, action, module..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><NeoSelect className="w-full bg-white" value={module} onChange={(event) => setModule(event.target.value)}><option>All Modules</option><option>Organization</option><option>Maintenance</option><option>Booking</option><option>Allocation</option><option>Audit</option></NeoSelect></div>
          <div className="divide-y-4 divide-black">{filteredLogs.map((item, index) => <motion.div key={`${item.actor}-${item.time}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="p-5 bg-white grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-center"><div className="w-12 h-12 rounded-xl border-4 border-black bg-[#ccff00] flex items-center justify-center shadow-[3px_3px_0_0_#000]">{item.severity === "Admin" ? <Shield /> : <Activity />}</div><div><h3 className="font-black uppercase">{item.action}</h3><p className="font-bold text-neutral-600 text-sm">{item.actor} / {item.module}</p></div><NeoBadge color={item.severity === "Alert" ? "bg-red-400" : "bg-white"}>{item.time}</NeoBadge></motion.div>)}</div>
        </NeoCard>
      </div>
    </div>
  );
}
