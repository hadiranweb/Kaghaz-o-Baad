import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
const Home = lazy(() => import("./pages/Home"));
const Read = lazy(() => import("./pages/Read"));
const ArticleSlides = lazy(() => import("./pages/ArticleSlides"));
const Media = lazy(() => import("./pages/Media"));
const About = lazy(() => import("./pages/About"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const AboutProject = lazy(() => import("./pages/AboutProject"));
const Community = lazy(() => import("./pages/Community"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LiveSessions = lazy(() => import("./pages/LiveSessions"));
const LiveRoomPage = lazy(() => import("./pages/LiveRoomPage"));
const LiveSessionNew = lazy(() => import("./pages/LiveSessionNew"));
const Rewrite = lazy(() => import("./pages/Rewrite"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
    در حال بارگذاری…
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">
                <ErrorBoundary>
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/read" element={<Read />} />
                    <Route path="/read/:slug" element={<ArticleSlides />} />
                    <Route path="/media" element={<Media />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/about-project" element={<AboutProject />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/complete-profile" element={<CompleteProfile />} />
                    <Route path="/live" element={<LiveSessions />} />
                    <Route path="/live/new" element={<LiveSessionNew />} />
                    <Route path="/live/:id" element={<LiveRoomPage />} />
                    <Route path="/rewrite" element={<Rewrite />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
                <Footer />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
