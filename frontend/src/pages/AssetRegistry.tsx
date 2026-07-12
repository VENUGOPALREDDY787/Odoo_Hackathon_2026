import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Filter, QrCode, Search, Upload } from "lucide-react";
import QRCode from "qrcode";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoModal, NeoSelect } from "../components/ui/NeoBrutalist";
import { assets, categories, statusColor } from "../lib/assetflow-data";
import { downloadDataUrl } from "../lib/downloads";

export default function AssetRegistry() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [category, setCategory] = useState("All Categories");
  const [selectedAsset, setSelectedAsset] = useState<(typeof assets)[number] | null>(null);
  const [historyAsset, setHistoryAsset] = useState<(typeof assets)[number] | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [notice, setNotice] = useState("");

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const matchesQuery = `${asset.tag} ${asset.name} ${asset.serial} ${asset.location} ${asset.holder}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All Statuses" || asset.status === status;
    const matchesCategory = category === "All Categories" || asset.category === category;
    return matchesQuery && matchesStatus && matchesCategory;
  }), [category, query, status]);

  const openQr = async (asset: (typeof assets)[number]) => {
    const payload = JSON.stringify({
      tag: asset.tag,
      name: asset.name,
      serial: asset.serial,
      status: asset.status,
      holder: asset.holder,
      location: asset.location,
    });
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    setSelectedAsset(asset);
    setQrDataUrl(dataUrl);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div>
          <NeoBadge color="bg-[#ccff00]">Asset Directory</NeoBadge>
          <h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">Registry.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-3 tracking-widest">Lifecycle, QR, documents, custody, and history</p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-full lg:min-w-[360px]">
          <NeoButton variant="black" onClick={() => setNotice("Register form ready: enter asset details in the ERP register flow.")}>Register Asset</NeoButton>
          <NeoButton variant="white" onClick={() => setNotice("Bulk import ready: upload CSV/XLSX from the backend import workflow.")}><Upload size={18} /> Bulk Import</NeoButton>
        </div>
      </div>

      {notice && (
        <NeoCard color="bg-white" className="p-4" interactive={false}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-black uppercase">{notice}</p>
            <NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => setNotice("")}>Dismiss</NeoButton>
          </div>
        </NeoCard>
      )}

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
          <NeoButton variant="white" onClick={() => setNotice(`${filteredAssets.length} assets match the selected filters.`)}><Filter size={18} /> Apply</NeoButton>
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
                      <NeoButton variant="white" className="min-w-[108px] px-4 py-2 text-xs" aria-label={`View history for ${asset.tag}`} onClick={() => setHistoryAsset(asset)}><FileText size={16} /> History</NeoButton>
                      <NeoButton variant="black" className="min-w-[92px] px-4 py-2 text-xs" aria-label={`Generate QR code for ${asset.tag}`} onClick={() => openQr(asset)}><QrCode size={16} /> QR</NeoButton>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeoCard>

      <NeoModal isOpen={Boolean(selectedAsset)} onClose={() => { setSelectedAsset(null); setQrDataUrl(""); }} title="Asset QR Code">
        {selectedAsset && (
          <div className="space-y-5">
            <div className="bg-white border-4 border-black rounded-xl p-4 flex justify-center">
              {qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${selectedAsset.tag}`} className="w-72 h-72 image-render-pixel" /> : <div className="w-72 h-72 flex items-center justify-center font-black uppercase">Generating...</div>}
            </div>
            <div className="border-4 border-black rounded-xl p-4 bg-[#ccff00]">
              <h3 className="font-black uppercase text-xl">{selectedAsset.tag} / {selectedAsset.name}</h3>
              <p className="font-bold text-sm mt-1">Scan payload includes tag, serial, status, holder, and location.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NeoButton variant="black" disabled={!qrDataUrl} onClick={() => downloadDataUrl(`${selectedAsset.tag}-qr.png`, qrDataUrl)}>Download PNG</NeoButton>
              <NeoButton variant="white" onClick={() => navigator.clipboard?.writeText(selectedAsset.tag).then(() => setNotice(`${selectedAsset.tag} copied to clipboard.`))}>Copy Tag</NeoButton>
            </div>
          </div>
        )}
      </NeoModal>

      <NeoModal isOpen={Boolean(historyAsset)} onClose={() => setHistoryAsset(null)} title="Asset History">
        {historyAsset && (
          <div className="space-y-4">
            <div className="border-4 border-black rounded-xl p-4 bg-[#ccff00]">
              <h3 className="font-black uppercase text-xl">{historyAsset.tag} / {historyAsset.name}</h3>
              <p className="font-bold text-sm">{historyAsset.status} / {historyAsset.holder} / {historyAsset.location}</p>
            </div>
            {[
              `Registered in ${historyAsset.dept} with condition ${historyAsset.condition}.`,
              historyAsset.holder === "-" ? "Currently available for allocation." : `Allocated to ${historyAsset.holder}.`,
              historyAsset.status === "Under Maintenance" ? "Maintenance request active in repair workflow." : "No open maintenance blocker.",
            ].map((item) => (
              <div key={item} className="border-4 border-black rounded-xl p-4 bg-white font-bold">{item}</div>
            ))}
          </div>
        )}
      </NeoModal>
    </div>
  );
}
