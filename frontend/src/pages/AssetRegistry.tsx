import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Filter, QrCode, Search, Upload } from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { assets, categories, statusColor } from "../lib/assetflow-data";

export default function AssetRegistry() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [category, setCategory] = useState("All Categories");

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.tag} ${asset.name} ${asset.serial} ${asset.location} ${asset.holder}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All Statuses" || asset.status === status;
    const matchesCategory = category === "All Categories" || asset.category === category;
    return matchesQuery && matchesStatus && matchesCategory;
  }), [category, query, status]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div>
          <NeoBadge color="bg-[#ccff00]">Asset Directory</NeoBadge>
          <h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">Registry.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-3 tracking-widest">Lifecycle, QR, documents, custody, and history</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-full lg:min-w-[360px]">
          <NeoButton variant="black" onClick={() => alert("Register asset drawer opened.")}>Register Asset</NeoButton>
          <NeoButton variant="white" onClick={() => alert("Bulk import template opened.")}><Upload size={18} /> Bulk Import</NeoButton>
        </div>
      </div>

      <NeoCard color="bg-[#ccff00]" interactive={false}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_220px_auto] gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 z-10 pointer-events-none" />
            <NeoInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tag, serial, holder, location..." className="w-full pl-10 bg-white" />
          </div>
          <NeoSelect value={category} onChange={(event) => setCategory(event.target.value)} className="w-full">
            <option>All Categories</option>
            {categories.map((item) => <option key={item.name}>{item.name}</option>)}
          </NeoSelect>
          <NeoSelect value={status} onChange={(event) => setStatus(event.target.value)} className="w-full">
            <option>All Statuses</option><option>Available</option><option>Allocated</option><option>Reserved</option><option>Under Maintenance</option><option>Lost</option><option>Retired</option><option>Disposed</option>
          </NeoSelect>
          <NeoButton variant="white" onClick={() => alert(`${filteredAssets.length} assets match your filters.`)}><Filter size={18} /> Apply</NeoButton>
        </div>
      </NeoCard>

      <NeoCard className="p-0 overflow-hidden" interactive={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-black text-white uppercase text-xs font-black tracking-widest">
                <th className="p-5">Asset</th><th className="p-5">Category</th><th className="p-5">Status</th><th className="p-5">Holder</th><th className="p-5">Location</th><th className="p-5">Condition</th><th className="p-5 text-right min-w-[230px]">Actions</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {filteredAssets.map((asset, index) => (
                <motion.tr initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} key={asset.tag} className="border-b-4 border-black bg-white hover:bg-neutral-100">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border-4 border-black rounded-xl bg-[#ccff00] flex items-center justify-center shadow-[3px_3px_0_0_#000]"><QrCode size={24} /></div>
                      <div><p className="font-black italic">{asset.tag}</p><p className="uppercase">{asset.name}</p><p className="text-xs text-neutral-500">{asset.serial}</p></div>
                    </div>
                  </td>
                  <td className="p-5 uppercase">{asset.category}</td>
                  <td className="p-5"><NeoBadge color={statusColor(asset.status)}>{asset.status}</NeoBadge></td>
                  <td className="p-5 uppercase">{asset.holder}</td>
                  <td className="p-5 uppercase">{asset.location}</td>
                  <td className="p-5 uppercase">{asset.condition}</td>
                  <td className="p-5">
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <NeoButton variant="white" className="min-w-[108px] px-4 py-2 text-xs" aria-label={`View history for ${asset.tag}`} onClick={() => alert(`${asset.tag} allocation and maintenance history opened.`)}><FileText size={16} /> History</NeoButton>
                      <NeoButton variant="black" className="min-w-[92px] px-4 py-2 text-xs" aria-label={`Generate QR code for ${asset.tag}`} onClick={() => alert(`QR generated for ${asset.tag}.`)}><QrCode size={16} /> QR</NeoButton>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>
  );
}
