import React from "react";
import { NeoCard, NeoButton, NeoBadge } from "../components/ui/NeoBrutalist";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function ResourceBooking() {
  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const resources = ["Conference Room A", "Conference Room B", "Studio 1"];

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

          {resources.map((resource, i) => (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }} key={i} className="flex border-b-4 border-black last:border-b-0 group">
              <div className="w-48 p-4 border-r-4 border-black font-black uppercase text-sm flex items-center group-hover:bg-[#ccff00] transition-colors">
                {resource}
              </div>
              <div className="flex-1 flex relative">
                {timeSlots.map((time) => (
                  <motion.div whileHover={{ backgroundColor: "#f3f4f6" }} key={time} className="min-w-[100px] flex-1 border-r-4 border-black h-20 transition-colors cursor-pointer flex justify-center items-center">
                     <PlusIcon className="opacity-0 hover:opacity-100 transition-opacity" />
                  </motion.div>
                ))}
                {/* Mock Booking Block */}
                {i === 0 && (
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} className="absolute left-[100px] w-[200px] h-full p-2 z-10 cursor-pointer">
                    <div className="bg-[#ccff00] border-4 border-black w-full h-full rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-shadow p-2 font-bold text-xs uppercase overflow-hidden">
                      Design Sync
                      <div className="text-[10px] opacity-70 flex items-center mt-1"><Clock size={10} className="mr-1" /> 10:00 - 12:00</div>
                    </div>
                  </motion.div>
                )}
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
