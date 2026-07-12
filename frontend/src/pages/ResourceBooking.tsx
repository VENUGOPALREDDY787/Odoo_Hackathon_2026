import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Clock, RefreshCw, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { NeoBadge, NeoButton, NeoCard, NeoInput, NeoSelect } from "../components/ui/NeoBrutalist";
import { bookings, statusColor } from "../lib/assetflow-data";

const resources = ["Conference Room B2", "EV Pool Car", "Studio 1", "Conference Room A"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function overlaps(start: string, end: string, busyStart: string, busyEnd: string) {
  return start < busyEnd && end > busyStart;
}

export default function ResourceBooking() {
  const [resource, setResource] = useState("Conference Room B2");
  const [start, setStart] = useState("09:30");
  const [end, setEnd] = useState("10:30");
  const [currentBookings, setCurrentBookings] = useState(bookings);
  const [bookingNotice, setBookingNotice] = useState("");
  const resourceBookings = useMemo(() => currentBookings.filter((booking) => booking.resource === resource), [currentBookings, resource]);
  const conflict = resourceBookings.find((booking) => overlaps(start, end, booking.start, booking.end));

  const confirmBooking = () => {
    if (conflict) {
      setBookingNotice(`Rejected: ${resource} overlaps ${conflict.start}-${conflict.end} by ${conflict.owner}.`);
      return;
    }
    const newBooking = { resource, owner: "You", start, end, status: "Upcoming" };
    setCurrentBookings((items) => [...items, newBooking]);
    setBookingNotice(`${resource} booked from ${start} to ${end}.`);
  };

  const cancelBooking = (booking: (typeof bookings)[number]) => {
    setCurrentBookings((items) => items.map((item) => item === booking ? { ...item, status: "Cancelled" } : item));
    setBookingNotice(`${booking.resource} booking cancelled.`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6 border-b-8 border-black pb-8">
        <div>
          <NeoBadge color="bg-orange-400">Overlap validation</NeoBadge>
          <h1 className="mt-3 text-5xl md:text-7xl font-black uppercase tracking-tighter">Booking.</h1>
          <p className="font-bold text-neutral-600 uppercase mt-2 tracking-widest">Rooms, vehicles, and shared equipment by time slot</p>
        </div>
        <NeoButton variant="lime" onClick={confirmBooking}><CalendarIcon size={18} /> Book Resource</NeoButton>
      </div>

      {bookingNotice && (
        <NeoCard color={bookingNotice.startsWith("Rejected") ? "bg-red-400" : "bg-[#ccff00]"} className="p-4" interactive={false}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-black uppercase">{bookingNotice}</p>
            <NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => setBookingNotice("")}>Dismiss</NeoButton>
          </div>
        </NeoCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8">
        <NeoCard color="bg-[#ccff00]" interactive={false}>
          <h2 className="text-3xl font-black uppercase mb-5">Booking Request</h2>
          <div className="space-y-4">
            <NeoSelect className="w-full bg-white" value={resource} onChange={(event) => setResource(event.target.value)}>
              {resources.map((item) => <option key={item}>{item}</option>)}
            </NeoSelect>
            <div className="grid grid-cols-2 gap-3">
              <NeoInput type="time" className="w-full bg-white" value={start} onChange={(event) => setStart(event.target.value)} />
              <NeoInput type="time" className="w-full bg-white" value={end} onChange={(event) => setEnd(event.target.value)} />
            </div>
            <div className={`border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000] ${conflict ? "bg-red-400" : "bg-white"}`}>
              <h3 className="font-black uppercase">{conflict ? "Conflict detected" : "Slot available"}</h3>
              <p className="font-bold text-sm mt-1">{conflict ? `${conflict.resource} is already booked by ${conflict.owner} from ${conflict.start} to ${conflict.end}.` : "No overlapping booking found for this resource."}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NeoButton variant="black" disabled={Boolean(conflict)} onClick={confirmBooking}>Confirm</NeoButton>
              <NeoButton variant="white" onClick={() => setBookingNotice(`Reminder set 15 minutes before ${resource} starts.`)}><Clock size={18} /> Remind</NeoButton>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="p-0 overflow-hidden" interactive={false}>
          <div className="p-5 bg-black text-white border-b-4 border-black flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase">Daily Calendar</h2>
            <NeoBadge color="bg-[#ccff00] text-black">{resource}</NeoBadge>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[180px_repeat(9,1fr)] border-b-4 border-black">
                <div className="p-4 font-black uppercase bg-neutral-100 border-r-4 border-black">Resource</div>
                {timeSlots.map((time) => <div key={time} className="p-4 font-black text-center border-r-4 border-black">{time}</div>)}
              </div>
              {resources.map((item, row) => (
                <div key={item} className="grid grid-cols-[180px_repeat(9,1fr)] border-b-4 border-black last:border-b-0 min-h-24">
                  <div className="p-4 font-black uppercase border-r-4 border-black flex items-center bg-white">{item}</div>
                  {timeSlots.map((slot) => {
                    const busy = currentBookings.find((booking) => booking.resource === item && booking.status !== "Cancelled" && booking.start <= slot && booking.end > slot);
                    return (
                      <motion.button type="button" key={`${item}-${slot}`} whileHover={{ scale: 1.04 }} onClick={() => { setResource(item); setStart(slot); setEnd(timeSlots[Math.min(timeSlots.indexOf(slot) + 1, timeSlots.length - 1)]); }} className={`border-r-4 border-black p-2 text-xs font-black uppercase ${busy ? statusColor(busy.status) : row % 2 ? "bg-neutral-100" : "bg-white"}`}>
                        {busy ? busy.owner : "+"}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </NeoCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentBookings.map((booking) => (
          <NeoCard key={`${booking.resource}-${booking.start}`} color="bg-white" className="p-5" interactive>
            <div className="flex justify-between gap-4">
              <div><h3 className="font-black uppercase text-xl">{booking.resource}</h3><p className="font-bold text-neutral-600">{booking.owner} / {booking.start} - {booking.end}</p></div>
              <NeoBadge color={statusColor(booking.status)}>{booking.status}</NeoBadge>
            </div>
            <div className="mt-4 flex gap-2">
              <NeoButton variant="white" className="px-4 py-2 text-xs" onClick={() => { setResource(booking.resource); setStart(booking.start); setEnd(booking.end); setBookingNotice("Edit the time fields above, then press Confirm to reschedule."); }}><RefreshCw size={16} /> Reschedule</NeoButton>
              <NeoButton variant="black" className="px-4 py-2 text-xs" onClick={() => cancelBooking(booking)}><XCircle size={16} /> Cancel</NeoButton>
            </div>
          </NeoCard>
        ))}
      </div>
    </div>
  );
}
