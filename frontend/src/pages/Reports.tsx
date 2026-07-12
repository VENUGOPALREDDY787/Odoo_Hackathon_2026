import React from "react";
import { NeoCard, NeoButton } from "../components/ui/NeoBrutalist";
import { Download, BarChart2, PieChart } from "lucide-react";
import { motion } from "framer-motion";

export default function Reports() {
  return (
    <div className="p-8 max-w-7xl mx-auto overflow-hidden">
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-end mb-12 border-b-8 border-black pb-8">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Analytics.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Asset Utilization & Health</p>
        </div>
        <NeoButton onClick={() => window.open('/api/reports/analytics?format=pdf', '_blank')} variant="black">
          <Download className="mr-2" /> Export PDF
        </NeoButton>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <NeoCard color="bg-white">
            <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
              <BarChart2 /> Utilization by Department
            </h2>
            {/* Mock Bar Chart */}
            <div className="flex items-end gap-4 h-48 mt-8 border-l-4 border-b-4 border-black p-4">
              {[
                { label: "ENG", val: "80%", color: "bg-[#ccff00]" },
                { label: "DES", val: "60%", color: "bg-purple-400" },
                { label: "MKT", val: "40%", color: "bg-orange-400" },
                { label: "HR", val: "20%", color: "bg-neutral-800" },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer">
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: bar.val }} 
                    transition={{ duration: 1, delay: 0.2 + i * 0.1, type: "spring" }}
                    className={`w-full ${bar.color} border-4 border-black rounded-t-lg transition-all group-hover:-translate-y-2 group-hover:brightness-110 relative`}
                  >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 font-black text-sm transition-opacity bg-black text-white px-2 py-1 rounded">
                       {bar.val}
                     </div>
                  </motion.div>
                  <span className="font-black uppercase text-xs mt-2">{bar.label}</span>
                </div>
              ))}
            </div>
          </NeoCard>
        </motion.div>

        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <NeoCard color="bg-purple-100" className="group">
             <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
              <PieChart /> Maintenance Frequency
            </h2>
            <div className="flex justify-center items-center h-48">
               {/* Abstract brutalist pie chart visual */}
               <motion.div 
                 whileHover={{ scale: 1.1, rotate: 180 }}
                 transition={{ duration: 0.8, type: "spring" }}
                 className="w-32 h-32 rounded-full border-8 border-black bg-[conic-gradient(#ccff00_0%_40%,#fb923c_40%_75%,#121212_75%_100%)] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
               ></motion.div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
               <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-2 font-bold text-xs uppercase cursor-pointer"><div className="w-3 h-3 bg-[#ccff00] border-2 border-black"></div> Laptops</motion.div>
               <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-2 font-bold text-xs uppercase cursor-pointer"><div className="w-3 h-3 bg-[#fb923c] border-2 border-black"></div> Furniture</motion.div>
               <motion.div whileHover={{ scale: 1.1 }} className="flex items-center gap-2 font-bold text-xs uppercase cursor-pointer"><div className="w-3 h-3 bg-black border-2 border-black"></div> Other</motion.div>
            </div>
          </NeoCard>
        </motion.div>
      </div>

      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <NeoCard color="bg-orange-400">
          <h2 className="text-2xl font-black uppercase mb-4">Location Heatmap</h2>
          <div className="w-full h-48 bg-white border-4 border-black rounded-xl relative overflow-hidden grid grid-cols-12 grid-rows-4 gap-1 p-2">
              {/* Mock heatmap grids */}
              {Array.from({ length: 48 }).map((_, i) => (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  transition={{ delay: 0.4 + i * 0.01 }}
                  whileHover={{ scale: 1.2, zIndex: 10, boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)" }}
                  key={i} 
                  className={`border-2 border-black rounded cursor-pointer ${Math.random() > 0.7 ? 'bg-red-400' : Math.random() > 0.4 ? 'bg-[#ccff00]' : 'bg-neutral-100'}`}
                ></motion.div>
              ))}
          </div>
        </NeoCard>
      </motion.div>
    </div>
  );
}
