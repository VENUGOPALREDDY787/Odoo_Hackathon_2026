import React, { useState } from "react";
import { NeoCard, NeoButton, NeoBadge } from "../components/ui/NeoBrutalist";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../lib/api";

export default function ResourceBooking() {
  const queryClient = useQueryClient();
  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  
  const { data: bookingData } = useQuery({
    queryKey: ['bookings-today'],
    queryFn: () => apiClient.get('/bookings/calendar/today').then(res => res.data)
  });
  
  const { data: resourcesData } = useQuery({
    queryKey: ['shared-assets'],
    queryFn: () => apiClient.get('/assets?isShared=true').then(res => res.data)
  });

  const bookings = bookingData?.data?.bookings || (Array.isArray(bookingData?.data) ? bookingData.data : []);
  const resources = resourcesData?.data?.assets || (Array.isArray(resourcesData?.data) ? resourcesData.data : [{id:"1", name: "Conference Room A"}, {id:"2", name: "Conference Room B"}, {id:"3", name: "Studio 1"}]);

  const bookMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/bookings', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings-today'] }),
    onError: (err: any) => alert(err.response?.data?.error?.message || "Booking failed")
  });

  const handleBook = (resourceId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0];
    bookMutation.mutate({
      assetId: resourceId,
      startTime: `${today}T${time}:00.000Z`,
      endTime: `${today}T${parseInt(time.split(':')[0]) + 1}:00:00.000Z`,
      notes: "Quick meeting"
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-end mb-8 border-b-8 border-black pb-8">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter">Booking.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Reserve Shared Resources</p>
        </div>
        <NeoButton variant="lime"><CalendarIcon className="mr-2" /> Book Resource</NeoButton>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <NeoCard className="p-0 overflow-hidden bg-white">
          <div className="flex border-b-4 border-black">
            <div className="w-48 p-4 border-r-4 border-black flex items-center justify-center font-black uppercase bg-neutral-100">
              Resources
            </div>
            <div className="flex-1 flex overflow-x-auto">
              {timeSlots.map((time) => (
                <div key={time} className="min-w-[100px] flex-1 p-4 border-r-4 border-black text-center font-bold uppercase border-b-4 border-b-transparent">
                  {time}
                </div>
              ))}
            </div>
          </div>

          {resources.map((resource: any, i: number) => (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }} key={i} className="flex border-b-4 border-black last:border-b-0 group">
              <div className="w-48 p-4 border-r-4 border-black font-black uppercase text-sm flex items-center group-hover:bg-[#ccff00] transition-colors overflow-hidden">
                {resource.name}
              </div>
              <div className="flex-1 flex relative">
                {timeSlots.map((time) => {
                  // Basic mock check if booked based on returned bookings array
                  const isBooked = bookings.some((b: any) => b.assetId === resource.id && new Date(b.startTime).getUTCHours() === parseInt(time.split(':')[0]));
                  return (
                    <motion.div onClick={() => !isBooked && handleBook(resource.id, time)} whileHover={{ backgroundColor: isBooked ? "" : "#f3f4f6" }} key={time} className={`min-w-[100px] flex-1 border-r-4 border-black h-20 transition-colors ${isBooked ? '' : 'cursor-pointer'} flex justify-center items-center relative`}>
                       {isBooked ? null : <PlusIcon className="opacity-0 hover:opacity-100 transition-opacity" />}
                    </motion.div>
                  );
                })}
                {/* Mock Booking Block rendering over the grid would be complex dynamically without a real calendar component. Rendering simplified version. */}
              </div>
            </motion.div>
          ))}
        </NeoCard>
      </motion.div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
