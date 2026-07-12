import React from "react";
import { NeoCard, NeoButton, NeoBadge } from "../components/ui/NeoBrutalist";
import { Wrench, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Maintenance() {
  const requests = [
    { id: "REQ-01", asset: "MacBook Pro M2", issue: "Battery Replacement", status: "Pending Approval", date: "Oct 12, 2025" },
    { id: "REQ-02", asset: "Sony A7IV", issue: "Sensor Cleaning", status: "In Progress", date: "Oct 10, 2025" },
    { id: "REQ-03", asset: "Herman Miller Chair", issue: "Armrest Broken", status: "Completed", date: "Oct 05, 2025" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto overflow-hidden">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-end mb-12 border-b-8 border-black pb-8">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Maintenance.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Repair Workflow & Approvals</p>
        </div>
        <NeoButton variant="orange"><Wrench className="mr-2" /> Report Issue</NeoButton>
      </motion.div>

      <div className="space-y-6">
        {requests.map((req, i) => (
          <motion.div 
            key={i} 
            initial={{ x: i % 2 === 0 ? -50 : 50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 100 }}
          >
            <NeoCard className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:-translate-y-2 transition-transform cursor-pointer" color={req.status === "Pending Approval" ? "bg-white" : req.status === "In Progress" ? "bg-orange-100" : "bg-neutral-100"}>
              <div className="flex items-center gap-6">
                <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }} className="w-16 h-16 bg-black text-white font-black flex items-center justify-center rounded-xl border-4 border-black group-hover:bg-[#ccff00] group-hover:text-black transition-colors">
                  {req.id.split("-")[1]}
                </motion.div>
                <div>
                  <h3 className="text-2xl font-black uppercase">{req.asset}</h3>
                  <p className="font-bold text-neutral-600 uppercase text-sm mt-1">{req.issue}</p>
                  <div className="text-xs font-bold mt-2 opacity-50 uppercase">{req.date}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-4 z-10">
                <NeoBadge color={
                  req.status === "Pending Approval" ? "bg-red-400" :
                  req.status === "In Progress" ? "bg-orange-400" : "bg-[#ccff00]"
                }>
                  {req.status}
                </NeoBadge>
                {req.status === "Pending Approval" && (
                  <div className="flex gap-2">
                    <NeoButton variant="white" className="py-2 px-4 text-xs">Deny</NeoButton>
                    <NeoButton variant="lime" className="py-2 px-4 text-xs"><CheckCircle size={16} className="mr-1" /> Approve</NeoButton>
                  </div>
                )}
              </div>
            </NeoCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
