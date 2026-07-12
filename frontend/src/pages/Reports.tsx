import { BarChart2, Download, Flame, PieChart, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { NeoBadge, NeoButton, NeoCard, NeoSelect } from "../components/ui/NeoBrutalist";
import { assets, departments, maintenanceRequests } from "../lib/assetflow-data";

export default function Reports() {
  const utilization = departments.filter((dept) => dept.status === "Active").map((dept) => ({ label: dept.name.slice(0, 3).toUpperCase(), value: Math.min(95, Math.round(dept.assets / 2.4)) }));
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div><NeoBadge color="bg-black text-white">Manager analytics</NeoBadge><h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Reports.</h1><p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Utilization, maintenance, retirement, allocation, and heatmaps</p></div>
        <div className="flex flex-col sm:flex-row gap-3"><NeoSelect className="bg-white"><option>PDF</option><option>CSV</option><option>XLSX</option></NeoSelect><NeoButton variant="black" onClick={() => alert("Analytics export generated.")}><Download size={18} /> Export</NeoButton></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <NeoCard color="bg-[#ccff00]" interactive={false}><TrendingUp /><p className="mt-6 text-5xl font-black tracking-tighter">82%</p><h2 className="font-black uppercase mt-2">Average utilization</h2></NeoCard>
        <NeoCard color="bg-orange-400" interactive={false}><Flame /><p className="mt-6 text-5xl font-black tracking-tighter">{maintenanceRequests.length}</p><h2 className="font-black uppercase mt-2">Open maintenance cases</h2></NeoCard>
        <NeoCard color="bg-purple-400 text-white" interactive={false}><PieChart /><p className="mt-6 text-5xl font-black tracking-tighter">{assets.filter((asset) => asset.shared).length}</p><h2 className="font-black uppercase mt-2">Shared bookable assets</h2></NeoCard>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <NeoCard color="bg-white" interactive={false}><h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2"><BarChart2 /> Department Utilization</h2><div className="flex items-end gap-4 h-64 border-l-4 border-b-4 border-black p-4">{utilization.map((bar, index) => <div key={bar.label} className="flex-1 flex flex-col items-center justify-end h-full group"><motion.div initial={{ height: 0 }} animate={{ height: `${bar.value}%` }} transition={{ delay: index * 0.08, type: "spring" }} className="w-full bg-[#ccff00] border-4 border-black rounded-t-lg relative group-hover:bg-purple-400"><div className="absolute -top-8 left-1/2 -translate-x-1/2 font-black text-xs bg-black text-white px-2 py-1">{bar.value}%</div></motion.div><span className="font-black uppercase text-xs mt-2">{bar.label}</span></div>)}</div></NeoCard>
        <NeoCard color="bg-purple-100" interactive={false}><h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2"><PieChart /> Maintenance Frequency</h2><div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 items-center"><motion.div whileHover={{ rotate: 180 }} className="w-40 h-40 rounded-full border-8 border-black bg-[conic-gradient(#ccff00_0%_38%,#fb923c_38%_70%,#a855f7_70%_88%,#121212_88%_100%)] shadow-[8px_8px_0_0_#000]" /><div className="space-y-3">{["Electronics - 38%", "Furniture - 32%", "Vehicles - 18%", "Rooms - 12%"].map((item) => <div key={item} className="border-4 border-black rounded-xl p-3 bg-white font-black uppercase shadow-[3px_3px_0_0_#000]">{item}</div>)}</div></div></NeoCard>
      </div>
      <NeoCard color="bg-orange-400" interactive={false}><h2 className="text-2xl font-black uppercase mb-4">Resource Booking Heatmap</h2><div className="grid grid-cols-12 grid-rows-4 gap-2 h-64 bg-white border-4 border-black rounded-xl p-3">{Array.from({ length: 48 }).map((_, index) => <motion.button type="button" key={index} whileHover={{ scale: 1.2, zIndex: 10 }} onClick={() => alert(`Usage window ${index + 1}: ${index % 3 === 0 ? "Peak" : "Normal"}.`)} className={`border-2 border-black rounded ${index % 7 === 0 ? "bg-red-400" : index % 3 === 0 ? "bg-[#ccff00]" : index % 4 === 0 ? "bg-purple-400" : "bg-neutral-100"}`} aria-label={`Booking heatmap cell ${index + 1}`} />)}</div></NeoCard>
    </div>
  );
}
