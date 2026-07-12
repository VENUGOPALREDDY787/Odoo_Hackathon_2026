import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Boxes, ShieldCheck } from "lucide-react";
import { NeoBadge, NeoButton, NeoCard, NeoInput } from "../components/ui/NeoBrutalist";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("admin@assetflow.io");
  const [password, setPassword] = useState("password");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => setMousePos({ x: (event.clientX / window.innerWidth - 0.5) * 50, y: (event.clientY / window.innerHeight - 0.5) * 50 });
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      if (isLogin) {
        loginAction({ id: 1, name: "Mark Liu", email: email || "admin@assetflow.io", role: "Admin" }, "mock-token");
        navigate("/");
      } else {
        setIsLogin(true);
        alert(`${name || "Employee"} account created as Employee. Admin can promote roles from Organization Setup.`);
      }
      setLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] grid lg:grid-cols-[1.05fr_0.95fr] relative overflow-hidden">
      <motion.div animate={{ x: mousePos.x, y: mousePos.y, rotate: -15 + mousePos.x / 2 }} transition={{ type: "spring", stiffness: 100, damping: 20 }} className="absolute top-20 left-20 w-24 h-24 border-4 border-black rounded-xl shadow-[8px_8px_0_0_#000] bg-purple-500" />
      <motion.div animate={{ x: -mousePos.x * 1.5, y: -mousePos.y * 1.5, rotate: 15 - mousePos.x / 2 }} transition={{ type: "spring", stiffness: 100, damping: 20 }} className="absolute bottom-20 right-20 w-32 h-32 border-4 border-black rounded-xl shadow-[8px_8px_0_0_#000] bg-orange-400" />

      <section className="relative z-10 flex items-center p-6 md:p-12">
        <div className="max-w-3xl">
          <NeoBadge color="bg-[#ccff00]">Enterprise Asset ERP</NeoBadge>
          <h1 className="mt-6 text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.82]">AssetFlow</h1>
          <p className="mt-6 text-xl md:text-2xl font-bold text-neutral-700 max-w-2xl">A full ERP demo for asset lifecycles, conflict-safe allocation, overlap-safe bookings, maintenance approvals, audit cycles, and role-based operations.</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["No role self-selection", "Conflict blocked allocation", "Overlap booking checks"].map((item) => <div key={item} className="bg-white border-4 border-black rounded-xl p-4 font-black uppercase shadow-[4px_4px_0_0_#000]">{item}</div>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 flex items-center justify-center p-6 md:p-12">
        <NeoCard color="bg-white" className="w-full max-w-md" interactive={false}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ccff00] border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] mb-4 rotate-3"><Boxes /></div>
            <h2 className="text-4xl font-black uppercase tracking-tighter">{isLogin ? "Welcome Back." : "Employee Signup."}</h2>
            <p className="font-bold mt-2 text-neutral-600">{isLogin ? "Use demo credentials or your work email." : "Signup always creates Employee access only."}</p>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            {!isLogin && <div className="space-y-1"><label className="font-bold uppercase text-xs">Full Name</label><NeoInput type="text" placeholder="Aarav Mehta" className="w-full" value={name} onChange={(event) => setName(event.target.value)} required /></div>}
            <div className="space-y-1"><label className="font-bold uppercase text-xs">Work Email</label><NeoInput type="email" placeholder="admin@assetflow.io" className="w-full" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="space-y-1"><label className="font-bold uppercase text-xs">Password</label><NeoInput type="password" placeholder="password" className="w-full" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            {!isLogin && <div className="bg-orange-400 border-4 border-black rounded-xl p-3 font-black uppercase text-sm flex gap-2"><ShieldCheck className="shrink-0" size={18} /> Admin promotes employees later from Organization Setup.</div>}
            <NeoButton type="submit" variant="lime" className="w-full mt-8 py-4 text-xl" disabled={loading}>{loading ? "Processing..." : isLogin ? "Enter System" : "Create Employee"}</NeoButton>
          </form>
          <div className="mt-8 text-center"><button type="button" onClick={() => setIsLogin(!isLogin)} className="font-bold uppercase text-sm hover:underline decoration-4 underline-offset-4 decoration-[#ccff00] transition-all">{isLogin ? "Need an employee account? Sign up" : "Already have an account? Log in"}</button></div>
        </NeoCard>
      </section>
    </div>
  );
}
