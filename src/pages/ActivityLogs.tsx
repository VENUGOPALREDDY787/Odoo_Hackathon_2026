import React from "react";
import { NeoCard, NeoBadge, NeoButton } from "../components/ui/NeoBrutalist";
import { Activity, Bell } from "lucide-react";
import { motion } from "framer-motion";

export default function ActivityLogs() {
  const logs = [
    { action: "Asset Allocated", desc: "AST-002 assigned to Rosa Diaz", time: "10 mins ago", type: "allocate" },
    { action: "Maintenance Approved", desc: "AST-001 repair approved by Admin", time: "1 hour ago", type: "maintenance" },
    { action: "New Asset Registered", desc: "AST-004 added by Jake Peralta", time: "3 hours ago", type: "registry" },
    { action: "Role Promoted", desc: "Rosa Diaz promoted to Manager", time: "1 day ago", type: "admin" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -50 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto overflow-hidden">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-end mb-12 border-b-8 border-black pb-8">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Activity.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">System Logs & Notifications</p>
        </div>
        <NeoButton variant="white"><Bell className="mr-2" /> Mark All Read</NeoButton>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="relative border-l-8 border-black ml-4 pl-8 space-y-8 py-4">
        {logs.map((log, i) => (
          <motion.div variants={item} key={i} className="relative group">
            <motion.div 
              whileHover={{ scale: 1.5, backgroundColor: "#ccff00" }} 
              className={`absolute -left-[44px] top-4 w-6 h-6 border-4 border-black rounded-full bg-white transition-colors z-10 cursor-pointer`}
            ></motion.div>
            
            <NeoCard color={i === 0 ? "bg-[#ccff00]" : "bg-white"} className="hover:translate-x-4 transition-transform cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black uppercase flex items-center gap-2 group-hover:text-purple-600 transition-colors">
                    <Activity size={20} /> {log.action}
                  </h3>
                  <p className="font-bold text-neutral-700 mt-2">{log.desc}</p>
                </div>
                <NeoBadge color="bg-black text-white group-hover:scale-110 transition-transform">{log.time}</NeoBadge>
              </div>
            </NeoCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
