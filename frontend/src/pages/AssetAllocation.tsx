import React, { useState } from "react";
import { NeoCard, NeoButton, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import apiClient from "../lib/api";

export default function AssetAllocation() {
  const [search, setSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assigneeType, setAssigneeType] = useState("Employee");
  const [assigneeId, setAssigneeId] = useState("");

  const { data: assetsData } = useQuery({
    queryKey: ['assets', 'available'],
    queryFn: () => apiClient.get('/assets?status=Available').then(res => res.data)
  });
  const assets = assetsData?.data?.assets || (Array.isArray(assetsData?.data) ? assetsData.data : []);
  
  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiClient.get('/departments').then(res => res.data)
  });
  const departments = deptsData?.data?.departments || (Array.isArray(deptsData?.data) ? deptsData.data : []);

  const { data: empData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get('/employees').then(res => res.data)
  });
  const employees = empData?.data?.employees || (Array.isArray(empData?.data) ? empData.data : []);

  const allocateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/allocations', data),
    onSuccess: () => {
      alert("Allocated successfully!");
      setSelectedAssetId("");
      setAssigneeId("");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || "Allocation failed");
    }
  });

  const filteredAssets = assets.filter((a: any) => (a.name || "").toLowerCase().includes(search.toLowerCase()) || (a.tagId || a.id || "").toString().includes(search));
  const selectedAsset = assets.find((a: any) => a.id === selectedAssetId || a.tagId === selectedAssetId);

  const handleAllocate = () => {
    if (!selectedAssetId || !assigneeId) {
      alert("Please select an asset and an assignee");
      return;
    }
    const expectedReturn = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    allocateMutation.mutate({
      assetId: selectedAssetId,
      allocatedToType: assigneeType,
      employeeId: assigneeType === 'Employee' ? assigneeId : null,
      departmentId: assigneeType === 'Department' ? assigneeId : null,
      expectedReturnDate: expectedReturn
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto overflow-hidden">
      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12 border-b-8 border-black pb-8">
        <h1 className="text-6xl font-black uppercase tracking-tighter">Allocation.</h1>
        <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Transfer & Assign Assets</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <NeoCard color="bg-purple-200" className="flex flex-col h-full relative group">
            <h2 className="text-3xl font-black uppercase mb-6 group-hover:skew-x-3 transition-transform">Select Asset</h2>
            <div className="space-y-4 flex-1">
              <div>
                <label className="font-bold uppercase text-xs">Search Asset</label>
                <NeoInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type name or ID..." className="w-full bg-white mt-1" />
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredAssets.length === 0 && <div className="text-sm font-bold uppercase text-neutral-600">No assets found</div>}
                {filteredAssets.map((asset: any) => (
                  <motion.div 
                    key={asset.id} 
                    onClick={() => setSelectedAssetId(asset.id)}
                    whileHover={{ scale: 1.02 }} 
                    className={`bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-colors ${selectedAssetId === asset.id ? '!bg-[#ccff00]' : ''}`}
                  >
                    <div className="font-black italic text-sm opacity-60">{asset.tagId || asset.id}</div>
                    <div className="text-xl font-bold uppercase mt-1">{asset.name}</div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-bold uppercase text-sm">Status: {asset.status}</span>
                      <span className="w-4 h-4 rounded-full bg-[#ccff00] border-2 border-black"></span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/30 rounded-full blur-2xl group-hover:scale-150 transition-all pointer-events-none"></div>
          </NeoCard>
        </motion.div>

        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <NeoCard color="bg-orange-200" className="flex flex-col h-full group relative">
            <h2 className="text-3xl font-black uppercase mb-6 group-hover:-skew-x-3 transition-transform">Assign To</h2>
            <div className="space-y-4 flex-1">
               <div>
                <label className="font-bold uppercase text-xs">Assignee Type</label>
                <NeoSelect value={assigneeType} onChange={(e) => { setAssigneeType(e.target.value); setAssigneeId(""); }} className="w-full mt-1 mb-4">
                  <option value="Employee">Employee</option>
                  <option value="Department">Department</option>
                </NeoSelect>
              </div>
              
              <div>
                <label className="font-bold uppercase text-xs">Select {assigneeType}</label>
                <NeoSelect value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full mt-1">
                  <option value="">-- Select --</option>
                  {assigneeType === 'Employee' ? (
                    employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>)
                  ) : (
                    departments.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)
                  )}
                </NeoSelect>
              </div>
            </div>
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/30 rounded-full blur-2xl group-hover:scale-150 transition-all pointer-events-none"></div>
          </NeoCard>
        </motion.div>
      </div>

      {/* Transfer Action */}
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12 text-center relative z-20 flex flex-col items-center">
        {/* Decorative arrow */}
        <motion.div whileHover={{ y: 5 }} transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.5 }} className="bg-white border-4 border-black p-4 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 cursor-pointer">
          <ArrowRight size={32} />
        </motion.div>
        
        {/* Conflict block simulation 
        <motion.div whileHover={{ scale: 1.05 }} className="bg-red-400 border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 flex items-center gap-3 font-bold uppercase text-sm max-w-md text-left hidden">
          <Lock size={24} /> Rosa already has a monitor allocated. Require admin override to assign duplicate asset types.
        </motion.div>
        */}

        <NeoButton onClick={handleAllocate} disabled={allocateMutation.isPending} variant="black" className="py-6 px-16 text-2xl">
          {allocateMutation.isPending ? "Allocating..." : "Confirm Allocation"}
        </NeoButton>
      </motion.div>
    </div>
  );
}
