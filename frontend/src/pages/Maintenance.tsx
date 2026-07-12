import { useState } from "react";
import { Camera, CheckCircle, UserCog, Wrench, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { assets, maintenanceRequests, statusColor } from "../lib/assetflow-data";

const nextStatus: Record<string, string> = { Pending: "Approved", Approved: "Technician Assigned", "Technician Assigned": "In Progress", "In Progress": "Resolved" };

export default function Maintenance() {
  const [requests, setRequests] = useState(maintenanceRequests);
  const [asset, setAsset] = useState("AF-0001");
  const [issue, setIssue] = useState("");
  const advance = (id: string) => setRequests((items) => items.map((item) => item.id === id ? { ...item, status: nextStatus[item.status] || item.status } : item));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div><NeoBadge color="bg-red-400">Approval before repair</NeoBadge><h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Maintenance.</h1><p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Pending, approved, assigned, in progress, resolved</p></div>
        <NeoButton variant="orange" onClick={() => alert(issue ? `Request raised for ${asset}.` : "Describe the issue first.")}><Wrench size={18} /> Raise Request</NeoButton>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
        <NeoCard color="bg-orange-400" interactive={false}>
          <h2 className="text-3xl font-black uppercase mb-5">New Request</h2>
          <div className="space-y-4">
            <NeoSelect className="w-full bg-white" value={asset} onChange={(event) => setAsset(event.target.value)}>{assets.map((item) => <option key={item.tag} value={item.tag}>{item.tag} - {item.name}</option>)}</NeoSelect>
            <NeoInput className="w-full bg-white" placeholder="Issue description" value={issue} onChange={(event) => setIssue(event.target.value)} />
            <NeoSelect className="w-full bg-white"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></NeoSelect>
            <button type="button" onClick={() => alert("Photo attachment picker opened.")} className="w-full border-4 border-black rounded-xl bg-white p-4 font-black uppercase flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#000]"><Camera size={18} /> Attach Photo</button>
          </div>
        </NeoCard>
        <NeoCard className="p-0 overflow-hidden" interactive={false}>
          <div className="p-5 bg-black text-white border-b-4 border-black"><h2 className="text-2xl font-black uppercase">Repair Queue</h2></div>
          <div className="divide-y-4 divide-black">
            {requests.map((request, index) => (
              <motion.div key={request.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="p-5 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5">
                  <div><div className="flex flex-wrap gap-2 items-center"><span className="font-black italic">{request.id}</span><NeoBadge color={statusColor(request.status)}>{request.status}</NeoBadge><NeoBadge color="bg-black text-white">{request.priority}</NeoBadge></div><h3 className="text-2xl font-black uppercase mt-2">{request.asset}</h3><p className="font-bold text-neutral-600">{request.issue}</p><p className="font-black uppercase text-xs mt-2">Owner: {request.owner} / Technician: {request.technician} / Age: {request.age}</p></div>
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2"><NeoButton variant="lime" className="px-4 py-2 text-xs" onClick={() => advance(request.id)} disabled={request.status === "Resolved"}><CheckCircle size={16} /> Advance</NeoButton><NeoButton variant="white" className="px-4 py-2 text-xs" onClick={() => alert(`Technician assigned to ${request.id}.`)}><UserCog size={16} /> Assign</NeoButton><NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => alert(`${request.id} rejected.`)}><XCircle size={16} /> Reject</NeoButton></div>
                </div>
              </motion.div>
            ))}
          </div>
        </NeoCard>
      </div>
    </div>
  );
}
