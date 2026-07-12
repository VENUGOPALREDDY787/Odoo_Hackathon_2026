import React from "react";
import { NeoCard, NeoButton, NeoBadge } from "../components/ui/NeoBrutalist";
import { Wrench, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

export default function Maintenance() {
  const queryClient = useQueryClient();

  const { data: mainData, isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => apiClient.get('/maintenance').then(res => res.data)
  });
  
  const requests = mainData?.data?.requests || (Array.isArray(mainData?.data) ? mainData.data : []);

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/maintenance/${id}/approve`, {
      assignedTechnician: "Internal Tech",
      estimatedCompletionDate: new Date(Date.now() + 7*86400000).toISOString(),
      estimatedCost: 0
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] })
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/maintenance/${id}/reject`, { reason: "Denied by admin" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] })
  });

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
        {requests.length === 0 && !isLoading && (
          <div className="p-12 text-center font-bold uppercase text-neutral-500">No maintenance requests found</div>
        )}
        {requests.map((req: any, i: number) => (
          <motion.div 
            key={req.id} 
            initial={{ x: i % 2 === 0 ? -50 : 50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 100 }}
          >
            <NeoCard className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:-translate-y-2 transition-transform cursor-pointer" color={req.status === "Pending Approval" ? "bg-white" : req.status === "In Progress" ? "bg-orange-100" : "bg-neutral-100"}>
              <div className="flex items-center gap-6">
                <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }} className="w-16 h-16 bg-black text-white font-black flex items-center justify-center rounded-xl border-4 border-black group-hover:bg-[#ccff00] group-hover:text-black transition-colors">
                  {req.id ? req.id.toString().slice(-3) : "REQ"}
                </motion.div>
                <div>
                  <h3 className="text-2xl font-black uppercase">{req.asset?.name || "Unknown Asset"}</h3>
                  <p className="font-bold text-neutral-600 uppercase text-sm mt-1">{req.issueDescription}</p>
                  <div className="text-xs font-bold mt-2 opacity-50 uppercase">{new Date(req.createdAt || Date.now()).toLocaleDateString()}</div>
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
                    <NeoButton onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(req.id); }} variant="white" className="py-2 px-4 text-xs" disabled={rejectMutation.isPending}>Deny</NeoButton>
                    <NeoButton onClick={(e) => { e.stopPropagation(); approveMutation.mutate(req.id); }} variant="lime" className="py-2 px-4 text-xs" disabled={approveMutation.isPending}><CheckCircle size={16} className="mr-1" /> Approve</NeoButton>
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
