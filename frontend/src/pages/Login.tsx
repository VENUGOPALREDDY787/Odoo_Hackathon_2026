import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NeoButton, NeoCard, NeoInput } from "../components/ui/NeoBrutalist";
import { motion } from "framer-motion";
import apiClient from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const loginAction = useAuthStore(state => state.login);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 50,
        y: (e.clientY / window.innerHeight - 0.5) * 50,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background cubes */}
      <motion.div 
        animate={{ x: mousePos.x, y: mousePos.y, rotate: -15 + mousePos.x / 2 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="absolute top-20 left-20 w-24 h-24 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-purple-500" 
      />
      
      <motion.div 
        animate={{ x: -mousePos.x * 1.5, y: -mousePos.y * 1.5, rotate: 15 - mousePos.x / 2 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="absolute bottom-20 right-20 w-32 h-32 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-orange-400" 
      />
      
      <motion.div 
        animate={{ x: mousePos.y * 2, y: mousePos.x * 2, rotate: 45 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        className="absolute top-1/2 left-[80%] w-16 h-16 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-[#ccff00]" 
      />

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md relative z-10"
      >
        <NeoCard color="bg-white">
          <div className="text-center mb-8">
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-[#ccff00] border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4 rotate-3 cursor-pointer"
            >
              <span className="font-black text-2xl">A.</span>
            </motion.div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">
              {isLogin ? "Welcome Back." : "Join the Squad."}
            </h1>
            <p className="font-medium mt-2 text-neutral-600">
              {isLogin ? "Log in to manage your assets." : "Employee signup. Admin will assign roles."}
            </p>
          </div>

          {error && <div className="text-red-500 font-bold mb-4 text-sm uppercase">{error}</div>}

          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError("");
            try {
              if (isLogin) {
                const res = await apiClient.post("/auth/login", { email, password });
                loginAction(res.data.data.user, res.data.data.accessToken);
                navigate("/");
              } else {
                await apiClient.post("/auth/signup", { name, email, password });
                setIsLogin(true);
                setError("Account created. Please log in.");
              }
            } catch (err: any) {
              setError(err.response?.data?.error?.message || err.response?.data?.message || "Authentication failed");
            } finally {
              setLoading(false);
            }
          }}>
            {!isLogin && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="space-y-1 overflow-hidden">
                <label className="font-bold uppercase text-xs">Full Name</label>
                <NeoInput type="text" placeholder="Jake Peralta" className="w-full" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
              </motion.div>
            )}
            <div className="space-y-1">
              <label className="font-bold uppercase text-xs">Work Email</label>
              <NeoInput type="email" placeholder="jake@chunky.agency" className="w-full" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="font-bold uppercase text-xs">Password</label>
              <NeoInput type="password" placeholder="••••••••" className="w-full" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            
            <NeoButton variant="lime" className="w-full mt-8 py-4 text-xl" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Enter System" : "Create Account"}
            </NeoButton>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold uppercase text-sm hover:underline decoration-4 underline-offset-4 decoration-[#ccff00] transition-all"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </NeoCard>
      </motion.div>
    </div>
  );
}
