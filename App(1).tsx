import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Home from "./pages/Home";
import Read from "./pages/Read";
import ArticleSlides from "./pages/ArticleSlides";
import Media from "./pages/Media";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CompleteProfile from "./pages/CompleteProfile";
import AboutProject from "./pages/AboutProject";
import NotFound from "./pages/NotFound";
import LiveSessions from "./pages/LiveSessions";
import LiveRoomPage from "./pages/LiveRoomPage";
import LiveSessionNew from "./pages/LiveSessionNew";
import Rewrite from "./pages/Rewrite";
import ChangePassword from "./pages/ChangePassword";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/read" element={<Read />} />
                  <Route path="/read/:slug" element={<ArticleSlides />} />
                  <Route path="/media" element={<Media />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/about-project" element={<AboutProject />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/live" element={<LiveSessions />} />
            <Route path="/live/new" element={<LiveSessionNew />} />
            <Route path="/live/:id" element={<LiveRoomPage />} />
            <Route path="/rewrite" element={<Rewrite />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
