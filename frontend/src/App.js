import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { PwaProvider } from "@/context/PwaContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/ChatWidget";
import ContactModal from "@/components/ContactModal";
import InstallNudge from "@/components/InstallNudge";
import Home from "@/pages/Home";
import SearchPage from "@/pages/SearchPage";
import ProductDetail from "@/pages/ProductDetail";
import PrintRequest from "@/pages/PrintRequest";
import Community from "@/pages/Community";
import Dashboard from "@/pages/Dashboard";
import AuthCallback from "@/pages/AuthCallback";
import AdminProducts from "@/pages/AdminProducts";
import "@/i18n";

function AppRouter() {
  const location = useLocation();
  const [contactOpen, setContactOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <>
      <Header onOpenContact={() => setContactOpen(true)} onOpenChat={() => setChatOpen(true)} />
      <main className="relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/print" element={<PrintRequest />} />
          <Route path="/community" element={<Community />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
        </Routes>
      </main>
      <Footer onOpenContact={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} onOpenChat={() => setChatOpen(true)} />
      <ChatWidget openState={chatOpen} onOpenChange={setChatOpen} />
      <InstallNudge/>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <PwaProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" theme="dark" richColors closeButton />
        </BrowserRouter>
      </PwaProvider>
    </AuthProvider>
  );
}

export default App;
