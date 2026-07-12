import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Sidebar, CustomCursor, PageTransition } from "./components/ui/NeoBrutalist";
import { useAuthStore } from "./store/auth";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrganizationSetup from "./pages/OrganizationSetup";
import AssetRegistry from "./pages/AssetRegistry";
import AssetAllocation from "./pages/AssetAllocation";
import ResourceBooking from "./pages/ResourceBooking";
import Maintenance from "./pages/Maintenance";
import AssetAudit from "./pages/AssetAudit";
import Reports from "./pages/Reports";
import ActivityLogs from "./pages/ActivityLogs";

const queryClient = new QueryClient();

gsap.registerPlugin(ScrollTrigger);

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = useAuthStore(state => state.token);
  const isLogin = location.pathname === "/login";

  useEffect(() => {
    // Disabled authentication check for now
    /*
    if (!token && !isLogin) {
      window.location.href = "/login";
    } else if (token && isLogin) {
      window.location.href = "/";
    }
    */
  }, [token, isLogin]);

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <CustomCursor />
      {!isLogin && <Sidebar />}
      <main className={`${!isLogin ? "ml-64" : ""} min-h-screen`}>
        {children}
      </main>
    </div>
  );
}

function SmoothScroller() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/setup" element={<PageTransition><OrganizationSetup /></PageTransition>} />
        <Route path="/registry" element={<PageTransition><AssetRegistry /></PageTransition>} />
        <Route path="/allocation" element={<PageTransition><AssetAllocation /></PageTransition>} />
        <Route path="/booking" element={<PageTransition><ResourceBooking /></PageTransition>} />
        <Route path="/maintenance" element={<PageTransition><Maintenance /></PageTransition>} />
        <Route path="/audit" element={<PageTransition><AssetAudit /></PageTransition>} />
        <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
        <Route path="/logs" element={<PageTransition><ActivityLogs /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SmoothScroller />
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
