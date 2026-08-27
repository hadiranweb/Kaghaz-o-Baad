import { Suspense, lazy } from "react";
import { DeferredNotifications } from "@/components/DeferredNotifications";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocalizedRoute } from "@/components/LocalizedRoute";
import { SeoGuard } from "@/components/SeoGuard";
import { PublicSeoRoute } from "@/components/PublicSeoRoute";
import { MotionProvider } from "@/components/creative/MotionProvider";
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
const Contact = lazy(() => import("./pages/Contact"));
const Community = lazy(() => import("./pages/Community"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LiveSessions = lazy(() => import("./pages/LiveSessions"));
const LiveRoomPage = lazy(() => import("./pages/LiveRoomPage"));
const LiveSessionNew = lazy(() => import("./pages/LiveSessionNew"));
const Rewrite = lazy(() => import("./pages/Rewrite"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

const RouteFallback = () => (
  <div className="flex min-h-[calc(100vh-5.5rem)] items-center justify-center text-sm text-muted-foreground" aria-busy="true">
    در حال بارگذاری…
  </div>
);

const queryClient = new QueryClient();

const AppShell = () => {
  const { pathname } = useLocation();
  const isMinimalHome = pathname === '/' || pathname === '/fa' || pathname === '/en';

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        {!isMinimalHome && <Header />}
        <main className={isMinimalHome ? 'flex-1' : 'min-h-[calc(100vh-5.5rem)] flex-1'}>
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                    <Route path="/" element={<PublicSeoRoute page="home"><Home /></PublicSeoRoute>} />
                    <Route path="/read" element={<PublicSeoRoute page="read"><Read /></PublicSeoRoute>} />
                    <Route path="/fa" element={<LocalizedRoute locale="fa"><PublicSeoRoute page="home"><Home /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/en" element={<LocalizedRoute locale="en"><PublicSeoRoute page="home"><Home /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/fa/read" element={<LocalizedRoute locale="fa"><PublicSeoRoute page="read"><Read /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/en/read" element={<LocalizedRoute locale="en"><PublicSeoRoute page="read"><Read /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/fa/read/:slug" element={<LocalizedRoute locale="fa"><ArticleSlides /></LocalizedRoute>} />
                    <Route path="/en/read/:slug" element={<LocalizedRoute locale="en"><ArticleSlides /></LocalizedRoute>} />
                    <Route path="/read/:slug" element={<ArticleSlides />} />
                    <Route path="/media" element={<PublicSeoRoute page="media"><Media /></PublicSeoRoute>} />
                    <Route path="/fa/media" element={<LocalizedRoute locale="fa"><PublicSeoRoute page="media"><Media /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/en/media" element={<LocalizedRoute locale="en"><PublicSeoRoute page="media"><Media /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/about" element={<PublicSeoRoute page="about"><About /></PublicSeoRoute>} />
                    <Route path="/about-project" element={<AboutProject />} />
                    <Route path="/contact" element={<PublicSeoRoute page="contact"><Contact /></PublicSeoRoute>} />
                    <Route path="/fa/about" element={<LocalizedRoute locale="fa"><PublicSeoRoute page="about"><About /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/en/about" element={<LocalizedRoute locale="en"><PublicSeoRoute page="about"><About /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/fa/about-project" element={<LocalizedRoute locale="fa"><AboutProject /></LocalizedRoute>} />
                    <Route path="/en/about-project" element={<LocalizedRoute locale="en"><AboutProject /></LocalizedRoute>} />
                    <Route path="/fa/contact" element={<LocalizedRoute locale="fa"><PublicSeoRoute page="contact"><Contact /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/en/contact" element={<LocalizedRoute locale="en"><PublicSeoRoute page="contact"><Contact /></PublicSeoRoute></LocalizedRoute>} />
                    <Route path="/community" element={<SeoGuard><Community /></SeoGuard>} />
                    <Route path="/auth" element={<SeoGuard><Auth /></SeoGuard>} />
                    <Route path="/auth/verify-email" element={<SeoGuard><VerifyEmail /></SeoGuard>} />
                    <Route path="/dashboard" element={<SeoGuard><Dashboard /></SeoGuard>} />
                    <Route path="/admin" element={<SeoGuard><AdminDashboard /></SeoGuard>} />
                    <Route path="/complete-profile" element={<SeoGuard><CompleteProfile /></SeoGuard>} />
                    <Route path="/live" element={<SeoGuard><LiveSessions /></SeoGuard>} />
                    <Route path="/live/new" element={<SeoGuard><LiveSessionNew /></SeoGuard>} />
                    <Route path="/live/:id" element={<SeoGuard><LiveRoomPage /></SeoGuard>} />
                    <Route path="/rewrite" element={<SeoGuard><Rewrite /></SeoGuard>} />
                    <Route path="/change-password" element={<SeoGuard><ChangePassword /></SeoGuard>} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        {!isMinimalHome && <Footer />}
      </div>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <LanguageProvider>
        <MotionProvider>
          <TooltipProvider>
            <DeferredNotifications />
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </TooltipProvider>
        </MotionProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
