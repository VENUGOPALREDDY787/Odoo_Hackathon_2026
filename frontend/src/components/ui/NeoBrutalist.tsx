import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function NeoButton({ children, variant = "lime", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; as?: any }) {
  const bg = variant === "lime" ? "bg-[#ccff00] text-black" : variant === "black" ? "bg-black text-white" : variant === "purple" ? "bg-[#a855f7] text-white" : variant === "orange" ? "bg-[#fb923c] text-black" : "bg-white text-black";

  return (
    <motion.button 
      whileHover={{ scale: 1.02, x: 2, y: 2, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" }}
      whileTap={{ scale: 0.95 }}
      className={`
      relative px-8 py-3 font-bold uppercase tracking-wider border-4 border-black rounded-full 
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      transition-colors duration-200 ${bg} ${className} flex items-center justify-center gap-2
    `} {...props as any}>
      {children}
    </motion.button>
  );
}

export function NeoCard({ children, className = "", color = "bg-white", interactive = true }: { children: React.ReactNode; className?: string; color?: string; interactive?: boolean }) {
  return (
    <motion.div 
      whileHover={interactive ? { y: -5, boxShadow: "12px 12px 0px 0px rgba(0,0,0,1)" } : {}}
      className={`
    border-4 border-black rounded-2xl p-8 
    shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] 
    transition-colors duration-300 ${color} ${className}
  `}>
      {children}
    </motion.div>
  );
}

export function NeoInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <motion.input 
      whileFocus={{ x: 2, y: 2, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" }}
      className={`border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-medium ${className}`}
      {...props}
    />
  );
}

export function NeoSelect({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <motion.select 
      whileFocus={{ x: 2, y: 2, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" }}
      className={`border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-medium appearance-none bg-white ${className}`}
      {...props}
    >
      {children}
    </motion.select>
  );
}

export function NeoBadge({ children, color = "bg-white", className = "" }: { children: React.ReactNode, color?: string, className?: string }) {
  return (
    <motion.span 
      whileHover={{ scale: 1.1, rotate: [-2, 2, -2] }}
      className={`border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase inline-block cursor-default ${color} ${className}`}>
      {children}
    </motion.span>
  );
}

export function Sidebar() {
  const links = [
    { name: "Dashboard", path: "/" },
    { name: "Registry", path: "/registry" },
    { name: "Allocation", path: "/allocation" },
    { name: "Booking", path: "/booking" },
    { name: "Maintenance", path: "/maintenance" },
    { name: "Audit", path: "/audit" },
    { name: "Reports", path: "/reports" },
    { name: "Setup", path: "/setup" },
    { name: "Logs", path: "/logs" },
  ];

  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r-4 border-black flex flex-col z-40 overflow-y-auto shadow-[12px_0_0_0_rgba(0,0,0,0.05)]">
      <motion.div 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="p-6 border-b-4 border-black flex items-center gap-3 bg-[#ccff00]"
      >
        <div className="w-8 h-8 bg-black rounded-md rotate-12"></div>
        <span className="font-black text-2xl tracking-tighter">ASSETS.</span>
      </motion.div>
      <nav className="flex-1 p-4 flex flex-col gap-2">
        {links.map((link, i) => {
          const isActive = location.pathname === link.path;
          return (
            <motion.div
              key={link.path}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={link.path} className={`block px-4 py-3 font-bold uppercase border-4 rounded-xl transition-all ${isActive ? 'border-black bg-[#ccff00]' : 'border-transparent hover:border-black hover:bg-neutral-100 hover:translate-x-2'}`}>
                {link.name}
              </Link>
            </motion.div>
          );
        })}
      </nav>
      <div className="p-4 border-t-4 border-black">
        <Link to="/login" className="block">
          <NeoButton variant="black" className="w-full text-sm">Logout</NeoButton>
        </Link>
      </div>
    </aside>
  );
}

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'button' || target.tagName.toLowerCase() === 'a' || target.closest('button') || target.closest('a')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 rounded-full border-4 border-black bg-[#ccff00] mix-blend-difference pointer-events-none z-[100] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      animate={{
        x: mousePosition.x - 16,
        y: mousePosition.y - 16,
        scale: isHovering ? 1.5 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 28,
        mass: 0.5
      }}
    />
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
