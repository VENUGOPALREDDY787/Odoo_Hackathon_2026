import React from "react";
import { NeoCard, NeoButton, NeoBadge, NeoInput } from "../components/ui/NeoBrutalist";
import { ClipboardCheck, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";

export default function AssetAudit() {
  return (
    <div className="p-8 max-w-7xl mx-auto overflow-hidden">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-end mb-12 border-b-8 border-black pb-8">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Audit.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Verify Asset Accuracy</p>
        </div>
        <NeoButton variant="purple"><ClipboardCheck className="mr-2" /> Start New Audit</NeoButton>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <NeoCard color="bg-white">
              <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-2 border-b-4 border-black pb-4">
                Active Audit: Q4 2025
              </h2>
              <div className="flex gap-4 mb-6 relative z-20">
                <NeoInput placeholder="Scan Asset Barcode / Enter ID" className="flex-1 bg-neutral-100" />
                <NeoButton variant="black">Verify</NeoButton>
              </div>
              
              <div className="space-y-4">
                 <motion.div whileHover={{ scale: 1.02, x: 5 }} className="p-4 border-4 border-black rounded-xl bg-[#ccff00] flex justify-between items-center font-bold uppercase cursor-pointer">
                    <span>AST-001 (MacBook Pro M2)</span>
                    <span className="flex items-center gap-2"><CheckCircleIcon /> Verified</span>
                 </motion.div>
                 <motion.div whileHover={{ scale: 1.02, x: 5 }} className="p-4 border-4 border-black rounded-xl bg-white flex justify-between items-center font-bold uppercase cursor-pointer">
                    <span>AST-002 (Dell UltraSharp)</span>
                    <span className="opacity-50">Pending</span>
                 </motion.div>
              </div>
            </NeoCard>
          </motion.div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <NeoCard color="bg-red-400" className="group">
               <h2 className="text-2xl font-black uppercase mb-4 flex items-center gap-2 group-hover:scale-105 transition-transform origin-left">
                <AlertOctagon /> Discrepancies
              </h2>
              <motion.div whileHover={{ y: -5 }} className="bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase text-sm mb-4 cursor-pointer">
                AST-005: Location Mismatch (Expected: HQ, Found: Remote)
              </motion.div>
              <NeoButton variant="black" className="w-full text-xs">Resolve Selected</NeoButton>
            </NeoCard>
          </motion.div>

          <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <NeoCard>
               <h2 className="text-2xl font-black uppercase mb-4">Past Audits</h2>
               <div className="space-y-3">
                 <motion.div whileHover={{ paddingLeft: "10px", backgroundColor: "#f3f4f6" }} className="flex justify-between items-center font-bold uppercase text-sm border-b-2 border-black pb-2 cursor-pointer transition-all">
                   <span>Q3 2025</span>
                   <NeoBadge color="bg-[#ccff00]">100%</NeoBadge>
                 </motion.div>
                 <motion.div whileHover={{ paddingLeft: "10px", backgroundColor: "#f3f4f6" }} className="flex justify-between items-center font-bold uppercase text-sm border-b-2 border-black pb-2 cursor-pointer transition-all">
                   <span>Q2 2025</span>
                   <NeoBadge color="bg-orange-400">98%</NeoBadge>
                 </motion.div>
               </div>
            </NeoCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
