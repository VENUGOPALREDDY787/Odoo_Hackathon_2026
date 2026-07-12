import React from "react";
import { NeoCard, NeoButton, NeoInput, NeoSelect, NeoBadge } from "../components/ui/NeoBrutalist";
import { Filter, Search, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function AssetRegistry() {
  const assets = [
    { id: "AST-001", name: "MacBook Pro M2", category: "Laptop", status: "Allocated", assignee: "Jake Peralta" },
    { id: "AST-002", name: "Dell UltraSharp 27", category: "Monitor", status: "Available", assignee: "-" },
    { id: "AST-003", name: "Herman Miller Chair", category: "Furniture", status: "Maintenance", assignee: "-" },
    { id: "AST-004", name: "Sony A7IV", category: "Camera", status: "Available", assignee: "-" },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b-8 border-black pb-8">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Registry.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Master Asset List</p>
        </motion.div>
        <NeoButton variant="black">Register New Asset</NeoButton>
      </div>

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
        <NeoCard className="mb-8" color="bg-[#ccff00]">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-3.5 z-10 pointer-events-none" />
              <NeoInput placeholder="Search assets..." className="w-full pl-10 bg-white" />
            </div>
            <NeoSelect className="w-48">
              <option>All Categories</option>
              <option>Laptops</option>
              <option>Monitors</option>
              <option>Furniture</option>
            </NeoSelect>
            <NeoSelect className="w-48">
              <option>All Statuses</option>
              <option>Available</option>
              <option>Allocated</option>
              <option>Maintenance</option>
            </NeoSelect>
            <NeoButton variant="white"><Filter className="mr-2" size={20} /> Filter</NeoButton>
          </div>
        </NeoCard>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <NeoCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white uppercase text-sm font-black tracking-widest">
                  <th className="p-6">Asset ID</th>
                  <th className="p-6">Name</th>
                  <th className="p-6">Category</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Assignee</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={container} initial="hidden" animate="show" className="font-bold">
                {assets.map((asset, i) => (
                  <motion.tr variants={item} whileHover={{ scale: 1.01, backgroundColor: "#f3f4f6" }} key={i} className="border-b-4 border-black transition-colors relative z-10 cursor-pointer bg-white">
                    <td className="p-6 font-black italic">{asset.id}</td>
                    <td className="p-6 uppercase">{asset.name}</td>
                    <td className="p-6 uppercase">{asset.category}</td>
                    <td className="p-6">
                      <NeoBadge color={
                        asset.status === "Available" ? "bg-[#ccff00]" : 
                        asset.status === "Allocated" ? "bg-purple-400" : "bg-orange-400"
                      }>
                        {asset.status}
                      </NeoBadge>
                    </td>
                    <td className="p-6 uppercase">{asset.assignee}</td>
                    <td className="p-6 text-right">
                      <NeoButton variant="white" className="px-4 py-2 text-xs inline-flex"><FileText size={16} className="mr-2" /> History</NeoButton>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </NeoCard>
      </motion.div>
    </div>
  );
}
