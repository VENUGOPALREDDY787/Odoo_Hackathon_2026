import React from "react";
import { NeoCard, NeoButton, NeoBadge } from "../components/ui/NeoBrutalist";
import { ArrowUpRight, Box, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const kpis = [
    { title: "Total Assets", value: "1,248", color: "bg-[#ccff00]", icon: <Box size={24} /> },
    { title: "Allocated", value: "942", color: "bg-purple-400", icon: <CheckCircle2 size={24} /> },
    { title: "Under Repair", value: "12", color: "bg-orange-400", icon: <AlertTriangle size={24} /> },
    { title: "Overdue", value: "5", color: "bg-red-400", icon: <Clock size={24} /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-12">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-6xl font-black uppercase tracking-tighter leading-[0.8]">
            Command <br /> <span className="text-outline text-black stroke-black">Center.</span>
          </h1>
        </motion.div>
        <NeoButton variant="black" className="py-4 px-8">Generate Report <ArrowUpRight /></NeoButton>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
            <NeoCard color={kpi.color} className="flex flex-col relative overflow-hidden group h-full cursor-pointer">
              <div className="absolute top-4 right-4 bg-white border-2 border-black p-2 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-12 transition-transform">
                {kpi.icon}
              </div>
              <span className="font-bold text-sm uppercase opacity-80 mb-2">{kpi.title}</span>
              <span className="text-5xl font-black tracking-tighter">{kpi.value}</span>
              {/* Hover visual */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-xl group-hover:scale-[2.5] transition-transform duration-500"></div>
            </NeoCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Overdue Returns */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <NeoCard className="h-full">
            <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
              <h2 className="text-3xl font-black uppercase">Overdue Returns</h2>
              <NeoBadge color="bg-red-400">5 Items</NeoBadge>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <motion.div whileHover={{ scale: 1.02, x: 4 }} key={i} className="flex justify-between items-center p-4 border-4 border-black rounded-xl cursor-pointer bg-white z-10 relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#ccff00] border-2 border-black rounded-lg flex items-center justify-center font-bold rotate-[-5deg]">
                      M2
                    </div>
                    <div>
                      <h3 className="font-bold uppercase">MacBook Pro M2</h3>
                      <p className="text-sm font-medium text-red-500">3 days overdue by Jake P.</p>
                    </div>
                  </div>
                  <NeoButton variant="black" className="px-4 py-2 text-sm z-20">Remind</NeoButton>
                </motion.div>
              ))}
            </div>
          </NeoCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <NeoCard color="bg-black" className="text-white h-full">
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-[#ccff00] pb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Add Asset", color: "bg-[#ccff00] text-black" },
                { label: "Allocate", color: "bg-purple-500 text-white" },
                { label: "Book Room", color: "bg-orange-400 text-black" },
                { label: "Report Issue", color: "bg-white text-black" },
              ].map((action, i) => (
                <motion.button whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 2 : -2 }} whileTap={{ scale: 0.95 }} key={i} className={`
                  ${action.color} border-4 border-[#ccff00] rounded-xl p-6 font-black uppercase text-lg
                  shadow-[4px_4px_0px_0px_#ccff00] transition-colors text-left flex flex-col justify-between h-32
                `}>
                  <span>{action.label}</span>
                  <ArrowUpRight className="self-end" />
                </motion.button>
              ))}
            </div>
          </NeoCard>
        </motion.div>
      </div>
    </div>
  );
}
