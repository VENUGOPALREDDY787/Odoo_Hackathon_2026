import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, X } from "lucide-react";
import { useAuthStore } from "../../store/auth";

export function NeoButton({ children, variant = "lime", className = "", type = "button", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  const bg = variant === "lime" ? "bg-[#ccff00] text-black" : variant === "black" ? "bg-black text-white" : variant === "purple" ? "bg-[#a855f7] text-white" : variant === "orange" ? "bg-[#fb923c] text-black" : "bg-white text-black";

  return (
    <motion.button
      whileHover={{ scale: props.disabled ? 1 : 1.02, x: props.disabled ? 0 : 2, y: props.disabled ? 0 : 2, boxShadow: props.disabled ? undefined : "0px 0px 0px 0px rgba(0,0,0,1)" }}
      whileTap={{ scale: props.disabled ? 1 : 0.95 }}
      type={type}
      className={`relative px-8 py-3 font-bold uppercase tracking-wider border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors duration-200 ${bg} ${className} flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props as any}
    >
      {children}
    </motion.button>
  );
}

export function NeoCard({ children, className = "", color = "bg-white", interactive = true }: { children: React.ReactNode; className?: string; color?: string; interactive?: boolean }) {
  return (
    <motion.div
      whileHover={interactive ? { y: -5, boxShadow: "12px 12px 0px 0px rgba(0,0,0,1)" } : {}}
      className={`border-4 border-black rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-colors duration-300 ${color} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function NeoInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <motion.input
      whileFocus={{ x: 2, y: 2, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" }}
      className={`border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-medium ${className}`}
      {...props as any}
    />
  );
}

export function NeoSelect({ className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <motion.select
      whileFocus={{ x: 2, y: 2, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" }}
      className={`border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all outline-none font-medium appearance-none bg-white ${className}`}
      {...props as any}
    >
      {children}
    </motion.select>
  );
}

export function NeoBadge({ children, color = "bg-white", className = "" }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <motion.span whileHover={{ scale: 1.06 }} className={`border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase inline-block cursor-default ${color} ${className}`}>
      {children}
    </motion.span>
  );
}

export function NeoModal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-lg bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b-4 border-black bg-[#ccff00] rounded-t-xl">
          <h2 className="text-2xl font-black uppercase tracking-tighter">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close modal" className="p-2 transition-transform border-2 border-black rounded-full hover:scale-110 hover:bg-black hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

export function Sidebar({ isOpen = false, setIsOpen = () => {} }: { isOpen?: boolean; setIsOpen?: (value: boolean) => void }) {
  const { user, logout } = useAuthStore();
  const role = user?.role || "Admin";
  const location = useLocation();
  const navigate = useNavigate();

  const allLinks = [
    { name: "Dashboard", path: "/", roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { name: "Registry", path: "/registry", roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { name: "Allocation", path: "/allocation", roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { name: "Booking", path: "/booking", roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { name: "Maintenance", path: "/maintenance", roles: ["Admin", "Asset Manager", "Department Head", "Employee"] },
    { name: "Audit", path: "/audit", roles: ["Admin", "Asset Manager"] },
    { name: "Reports", path: "/reports", roles: ["Admin", "Asset Manager", "Department Head"] },
    { name: "Setup", path: "/setup", roles: ["Admin"] },
    { name: "Logs", path: "/logs", roles: ["Admin", "Asset Manager"] },
  ];

  const links = allLinks.filter((link) => link.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {isOpen && <button type="button" aria-label="Close navigation backdrop" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white border-r-4 border-black flex flex-col z-40 overflow-y-auto shadow-[12px_0_0_0_rgba(0,0,0,0.05)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-6 border-b-4 border-black flex items-center justify-between gap-3 bg-[#ccff00]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black text-[#ccff00] rounded-lg rotate-12 flex items-center justify-center">
              <Boxes size={20} />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tighter block leading-none">AssetFlow</span>
              <span className="font-black text-[10px] uppercase">{role}</span>
            </div>
          </div>
          <button type="button" aria-label="Close navigation menu" className="md:hidden p-1 border-2 border-black rounded hover:bg-black hover:text-white" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </motion.div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {links.map((link, index) => {
            const isActive = location.pathname === link.path;
            return (
              <motion.div key={link.path} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.04 }}>
                <Link onClick={() => setIsOpen(false)} to={link.path} className={`block px-4 py-3 font-bold uppercase border-4 rounded-xl transition-all ${isActive ? "border-black bg-[#ccff00]" : "border-transparent hover:border-black hover:bg-neutral-100 hover:translate-x-2"}`}>
                  {link.name}
                </Link>
              </motion.div>
            );
          })}
        </nav>
        <div className="p-4 border-t-4 border-black">
          <NeoButton variant="black" className="w-full text-sm" onClick={handleLogout}>Logout</NeoButton>
        </div>
      </aside>
    </>
  );
}

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (event: MouseEvent) => setMousePosition({ x: event.clientX, y: event.clientY });
    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      setIsHovering(Boolean(target.closest("button") || target.closest("a")));
    };
    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseover", handleMouseOver);
    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <motion.div className="fixed top-0 left-0 w-8 h-8 rounded-full border-4 border-black bg-[#ccff00] mix-blend-difference pointer-events-none z-[100] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" animate={{ x: mousePosition.x - 16, y: mousePosition.y - 16, scale: isHovering ? 1.5 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 28, mass: 0.5 }} />
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }} transition={{ duration: 0.4, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
