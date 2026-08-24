import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AppShell } from "@/components/AppShell";
import Home from "./pages/Home";
import CanvasHub from "./pages/CanvasHub";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import QuestionBank from "./pages/QuestionBank";
import QuestionEditor from "./pages/QuestionEditor";
import LessonPlanner from "./pages/LessonPlanner";
import UnitDetail from "./pages/UnitDetail";
import LessonPlanEditor from "./pages/LessonPlanEditor";
import LessonsBrowser from "./pages/LessonsBrowser";
import AdminDashboard from "./pages/AdminDashboard";
import StandardsBrowser from "./pages/StandardsBrowser";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import ActivityBuilder from "./pages/ActivityBuilder";
import ActivityEditorPage from "./pages/ActivityEditorPage";
import ReadingLibrary from "./pages/ReadingLibrary";
import SharedReading from "./pages/SharedReading";
import ISATExamPlayer from "./pages/ISATExamPlayer";
import ISATExamEditor from "./pages/ISATExamEditor";
import ISATReviewPage from "./pages/ISATReviewPage";
import QuizBuilder from "./pages/QuizBuilder";
import PublicActivityPlayer from "./pages/PublicActivityPlayer";
import NotePage from "./pages/NotePage";
import NotesHome from "./pages/NotesHome";
import SharedNote from "./pages/SharedNote";
import NotFound from "./pages/NotFound";
import { CanvasTokenRescue } from "@/components/CanvasTokenRescue";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

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
  return <AppShell>{children}</AppShell>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { needsOnboarding, isAdmin, loading: profileLoading } = useProfile();

  if (loading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AppShell>{children}</AppShell>;
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
      <CanvasTokenRescue />
      <BrowserRouter>
        <Routes>
          {/* Public / shell-less */}
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/share/:token" element={<SharedNote />} />
          <Route path="/isat-exam/:id" element={<ISATExamPlayer />} />
          <Route path="/isat-exam/:id/review" element={<ISATReviewPage />} />
          <Route path="/shared-reading/:token" element={<SharedReading />} />
          <Route path="/activities/:id/play" element={<PublicActivityPlayer />} />

          {/* Protected — wrapped in AppShell */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><NotesHome /></ProtectedRoute>} />
          <Route path="/notes/:id" element={<ProtectedRoute><NotePage /></ProtectedRoute>} />
          <Route path="/canvas" element={<ProtectedRoute><CanvasHub /></ProtectedRoute>} />
          <Route path="/question-bank" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
          <Route path="/create-question" element={<ProtectedRoute><QuestionEditor /></ProtectedRoute>} />
          <Route path="/lesson-planner" element={<ProtectedRoute><LessonPlanner /></ProtectedRoute>} />
          <Route path="/units/:id" element={<ProtectedRoute><UnitDetail /></ProtectedRoute>} />
          <Route path="/lessons" element={<ProtectedRoute><LessonsBrowser /></ProtectedRoute>} />
          <Route path="/lessons/:id" element={<ProtectedRoute><LessonPlanEditor /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/library" element={<AdminRoute><Library /></AdminRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/standards" element={<ProtectedRoute><StandardsBrowser /></ProtectedRoute>} />
          <Route path="/canvas-results" element={<Navigate to="/canvas?tab=results" replace />} />
          <Route path="/activities" element={<ProtectedRoute><ActivityBuilder /></ProtectedRoute>} />
          <Route path="/activities/:id" element={<ProtectedRoute><ActivityEditorPage /></ProtectedRoute>} />
          <Route path="/reading-library" element={<ProtectedRoute><ReadingLibrary /></ProtectedRoute>} />
          <Route path="/library" element={<Navigate to="/admin/library" replace />} />
          <Route path="/isat-exam/:id/edit" element={<ProtectedRoute><ISATExamEditor /></ProtectedRoute>} />
          <Route path="/quiz-builder" element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>} />
          <Route path="/quiz-builder/:id" element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>} />
          <Route path="/quiz-analytics" element={<Navigate to="/canvas?tab=analytics" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
