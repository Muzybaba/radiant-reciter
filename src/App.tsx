import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Home from "./pages/Home.tsx";
import Hadith from "./pages/Hadith.tsx";
import Hifz from "./pages/Hifz.tsx";
import Salah from "./pages/Salah.tsx";
import NotFound from "./pages/NotFound.tsx";
import BottomTabs from "./components/BottomTabs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quran" element={<Index />} />
          <Route path="/hadith" element={<Hadith />} />
          <Route path="/hifz" element={<Hifz />} />
          <Route path="/salah" element={<Salah />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomTabs />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
