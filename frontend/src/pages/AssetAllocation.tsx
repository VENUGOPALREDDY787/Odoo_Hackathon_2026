import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Repeat2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { assets, departments, employees } from "../lib/assetflow-data";

export default function AssetAllocation() {
  const [assetTag, setAssetTag] = useState("AF-0001");
  const [holder, setHolder] = useState("Aarav Mehta");
  const [returnDate, setReturnDate] = useState("2026-07-20");
  const [workflowMessage, setWorkflowMessage] = useState("");
  const selectedAsset = useMemo(() => assets.find((asset) => asset.tag === assetTag) || assets[0], [assetTag]);
  const isBlocked = selectedAsset.status === "Allocated" || selectedAsset.status === "Under Maintenance" || selectedAsset.status === "Reserved";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="border-b-8 border-black pb-8">
        <NeoBadge color="bg-purple-400 text-white">Conflict-safe custody</NeoBadge>
        <h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Allocation.</h1>
        <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Allocate, transfer, return, and block double-allocation</p>
      </div>

      {workflowMessage && (
        <NeoCard color="bg-[#ccff00]" className="p-4" interactive={false}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-black uppercase">{workflowMessage}</p>
            <NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => setWorkflowMessage("")}>Dismiss</NeoButton>
          </div>
        </NeoCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-8">
        <NeoCard color="bg-purple-200" interactive={false}>
          <h2 className="text-3xl font-black uppercase mb-6">Allocation Builder</h2>
          <div className="space-y-5">
            <div>
              <label className="font-black uppercase text-xs">Asset</label>
              <NeoSelect className="w-full mt-1 bg-white" value={assetTag} onChange={(event) => setAssetTag(event.target.value)}>
                {assets.map((asset) => <option key={asset.tag} value={asset.tag}>{asset.tag} - {asset.name}</option>)}
              </NeoSelect>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-black uppercase text-xs">Employee</label>
                <NeoSelect className="w-full mt-1 bg-white" value={holder} onChange={(event) => setHolder(event.target.value)}>
                  {employees.filter((employee) => employee.status === "Active").map((employee) => <option key={employee.email}>{employee.name}</option>)}
                </NeoSelect>
              </div>
              <div>
                <label className="font-black uppercase text-xs">Expected Return</label>
                <NeoInput type="date" className="w-full mt-1 bg-white" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
              </div>
            </div>

            <div className={`border-4 border-black rounded-xl p-5 shadow-[4px_4px_0_0_#000] ${isBlocked ? "bg-red-400" : "bg-[#ccff00]"}`}>
              <div className="flex items-start gap-3">
                {isBlocked ? <AlertTriangle className="shrink-0" /> : <CheckCircle2 className="shrink-0" />}
                <div>
                  <h3 className="font-black uppercase">{isBlocked ? "Allocation blocked" : "Ready to allocate"}</h3>
                  <p className="font-bold text-sm mt-1">{isBlocked ? `${selectedAsset.tag} is currently ${selectedAsset.status.toLowerCase()} by ${selectedAsset.holder}. Create a transfer request instead.` : `${selectedAsset.tag} can be assigned to ${holder} with return tracking.`}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NeoButton variant="black" disabled={isBlocked} onClick={() => setWorkflowMessage(`${selectedAsset.tag} allocated to ${holder} until ${returnDate}.`)}>Allocate</NeoButton>
              <NeoButton variant="orange" disabled={!isBlocked} onClick={() => setWorkflowMessage(`Transfer request created for ${selectedAsset.tag}. Current holder: ${selectedAsset.holder}.`)}><Repeat2 size={18} /> Transfer</NeoButton>
              <NeoButton variant="white" onClick={() => setWorkflowMessage(`${selectedAsset.tag} returned and queued for condition check-in.`)}><RotateCcw size={18} /> Return</NeoButton>
            </div>
          </div>
        </NeoCard>

        <NeoCard color="bg-white" className="p-0 overflow-hidden" interactive={false}>
          <div className="p-6 bg-black text-white border-b-4 border-black">
            <h2 className="text-3xl font-black uppercase">Custody Map</h2>
            <p className="font-bold text-sm text-white/70 mt-1">Department holdings and transfer paths.</p>
          </div>
          <div className="p-6 space-y-5">
            {departments.filter((dept) => dept.status === "Active").map((dept, index) => (
              <motion.div key={dept.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="border-4 border-black rounded-xl p-5 bg-[#f3f4f6] shadow-[4px_4px_0_0_#000]">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div><h3 className="text-xl font-black uppercase">{dept.name}</h3><p className="font-bold text-neutral-600 text-sm">Head: {dept.head} / Parent: {dept.parent}</p></div>
                  <NeoBadge color="bg-[#ccff00]">{dept.assets} Assets</NeoBadge>
                </div>
                <div className="mt-4 h-4 border-2 border-black rounded-full overflow-hidden bg-white"><div className="h-full bg-purple-400" style={{ width: `${Math.min(100, dept.assets / 2)}%` }} /></div>
              </motion.div>
            ))}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-orange-400 border-4 border-black rounded-xl p-4">
              <div><p className="font-black uppercase">Requested</p><p className="text-sm font-bold">Aarav Mehta</p></div>
              <ArrowRight />
              <div className="text-right"><p className="font-black uppercase">Approved</p><p className="text-sm font-bold">Asset Manager</p></div>
            </div>
          </div>
        </NeoCard>
      </div>
    </div>
  );
}
