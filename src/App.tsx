import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Home from "./pages/Home";
import CanvasExport from "./pages/CanvasExport";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import QuestionBank from "./pages/QuestionBank";
import QuestionEditor from "./pages/QuestionEditor";
import LessonPlanner from "./pages/LessonPlanner";
import UnitDetail from "./pages/UnitDetail";
import LessonPlanEditor from "./pages/LessonPlanEditor";
import AdminDashboard from "./pages/AdminDashboard";
import StandardsBrowser from "./pages/StandardsBrowser";
import CanvasResults from "./pages/CanvasResults";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { needsOnboarding, loading: profileLoading } = useProfile();

  if (loading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute() {
  const { user, loading } = useAuth();
  const { needsOnboarding, loading: profileLoading } = useProfile();

  if (loading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!needsOnboarding) return <Navigate to="/" replace />;
  return <Onboarding />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/canvas" element={<ProtectedRoute><CanvasExport /></ProtectedRoute>} />
          <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
          <Route path="/create-question" element={<ProtectedRoute><QuestionEditor /></ProtectedRoute>} />
          <Route path="/lesson-planner" element={<ProtectedRoute><LessonPlanner /></ProtectedRoute>} />
          <Route path="/units/:id" element={<ProtectedRoute><UnitDetail /></ProtectedRoute>} />
          <Route path="/lessons/:id" element={<ProtectedRoute><LessonPlanEditor /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/standards" element={<ProtectedRoute><StandardsBrowser /></ProtectedRoute>} />
          <Route path="/canvas-results" element={<ProtectedRoute><CanvasResults /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
