import { useState } from "react";
import { AlertOctagon, ClipboardCheck, Lock, ScanLine } from "lucide-react";
import { motion } from "framer-motion";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { auditItems, departments, employees, statusColor } from "../lib/assetflow-data";

export default function AssetAudit() {
  const [scan, setScan] = useState("");
  const [cycleLocked, setCycleLocked] = useState(false);
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState(auditItems);

  const verifyScan = () => {
    if (!scan) {
      setNotice("Enter an asset tag first.");
      return;
    }
    setItems((current) => current.map((item) => item.tag === scan ? { ...item, state: "Verified", found: item.expected } : item));
    setNotice(`${scan} verification recorded.`);
    setScan("");
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div>
          <NeoBadge color="bg-purple-400 text-white">Structured verification</NeoBadge>
          <h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Audit.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Cycles, auditors, discrepancies, and locked closeout</p>
        </div>
        <NeoButton variant="purple" onClick={() => setNotice("New audit cycle drafted for selected scope.")}><ClipboardCheck size={18} /> New Cycle</NeoButton>
      </div>

      {notice && <NeoCard color="bg-[#ccff00]" className="p-4" interactive={false}><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><p className="font-black uppercase">{notice}</p><NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => setNotice("")}>Dismiss</NeoButton></div></NeoCard>}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
        <NeoCard color="bg-[#ccff00]" interactive={false}>
          <h2 className="text-3xl font-black uppercase mb-5">Cycle Setup</h2>
          <div className="space-y-4">
            <NeoSelect className="w-full bg-white">{departments.map((dept) => <option key={dept.id}>{dept.name}</option>)}</NeoSelect>
            <NeoSelect className="w-full bg-white">{employees.map((employee) => <option key={employee.email}>{employee.name}</option>)}</NeoSelect>
            <div className="grid grid-cols-2 gap-3"><NeoInput type="date" className="bg-white" defaultValue="2026-07-12" /><NeoInput type="date" className="bg-white" defaultValue="2026-07-18" /></div>
            <NeoButton variant="black" className="w-full" onClick={() => setNotice("Auditors assigned to the active cycle.")}>Assign Auditors</NeoButton>
          </div>
        </NeoCard>

        <NeoCard className="p-0 overflow-hidden" interactive={false}>
          <div className="p-5 bg-black text-white border-b-4 border-black">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div><h2 className="text-2xl font-black uppercase">Active Audit: HQ July Cycle</h2><p className="font-bold text-white/70 text-sm">Scope: Engineering and Design / {items.filter((item) => item.state !== "Verified").length} assets flagged</p></div>
              <NeoBadge color={cycleLocked ? "bg-red-400" : "bg-[#ccff00] text-black"}>{cycleLocked ? "Locked" : "Open"}</NeoBadge>
            </div>
          </div>
          <div className="p-5 border-b-4 border-black bg-orange-400"><div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"><NeoInput value={scan} onChange={(event) => setScan(event.target.value)} placeholder="Scan or type asset tag" className="bg-white" /><NeoButton variant="black" onClick={verifyScan}><ScanLine size={18} /> Verify</NeoButton></div></div>
          <div className="divide-y-4 divide-black">{items.map((item, index) => <motion.div key={item.tag} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="p-5 bg-white grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="font-black italic">{item.tag}</span><NeoBadge color={statusColor(item.state)}>{item.state}</NeoBadge></div><h3 className="text-xl font-black uppercase mt-2">{item.asset}</h3><p className="font-bold text-neutral-600">Expected: {item.expected} / Found: {item.found}</p></div><NeoButton variant={item.state === "Verified" ? "white" : "orange"} className="px-4 py-2 text-xs" onClick={() => setNotice(`${item.tag} discrepancy report selected: ${item.state}.`)}><AlertOctagon size={16} /> Report</NeoButton></motion.div>)}</div>
        </NeoCard>
      </div>

      <NeoCard color={cycleLocked ? "bg-red-400" : "bg-white"} interactive={false}><div className="flex flex-col md:flex-row justify-between gap-5 items-start md:items-center"><div><h2 className="text-3xl font-black uppercase">Close Audit Cycle</h2><p className="font-bold text-neutral-700">Closing locks the cycle and updates confirmed missing assets to Lost.</p></div><NeoButton variant="black" onClick={() => { setCycleLocked(true); setNotice("Audit cycle closed and discrepancy statuses locked."); }}><Lock size={18} /> Close Cycle</NeoButton></div></NeoCard>
    </div>
  );
}
