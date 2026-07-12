import React from "react";
import { NeoCard, NeoBadge, NeoButton } from "../components/ui/NeoBrutalist";
import { Activity, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

export default function ActivityLogs() {
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/notifications/my').then(res => res.data)
  });
  
  // Use mock fallback if backend is empty during testing
  const apiLogs = notifData?.data?.notifications || (Array.isArray(notifData?.data) ? notifData.data : []);
  const logs = apiLogs.length > 0 ? apiLogs : [
    { title: "Asset Allocated", message: "AST-002 assigned to Rosa Diaz", createdAt: new Date().toISOString(), type: "allocate" }
  ];

  const markReadMutation = useMutation({
    mutationFn: () => apiClient.put('/notifications/read', { ids: logs.map((l:any)=>l.id) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
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
        <NeoButton onClick={() => markReadMutation.mutate()} disabled={markReadMutation.isPending} variant="white">
          <Bell className="mr-2" /> Mark All Read
        </NeoButton>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="relative border-l-8 border-black ml-4 pl-8 space-y-8 py-4">
        {logs.map((log: any, i: number) => (
          <motion.div variants={item} key={i} className="relative group">
            <motion.div 
              whileHover={{ scale: 1.5, backgroundColor: "#ccff00" }} 
              className={`absolute -left-[44px] top-4 w-6 h-6 border-4 border-black rounded-full ${!log.read ? 'bg-[#ccff00]' : 'bg-white'} transition-colors z-10 cursor-pointer`}
            ></motion.div>
            
            <NeoCard color={!log.read && i === 0 ? "bg-[#ccff00]" : "bg-white"} className="hover:translate-x-4 transition-transform cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black uppercase flex items-center gap-2 group-hover:text-purple-600 transition-colors">
                    <Activity size={20} /> {log.title || log.action}
                  </h3>
                  <p className="font-bold text-neutral-700 mt-2">{log.message || log.desc}</p>
                </div>
                <NeoBadge color="bg-black text-white group-hover:scale-110 transition-transform">
                  {new Date(log.createdAt || log.time).toLocaleTimeString()}
                </NeoBadge>
              </div>
            </NeoCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
