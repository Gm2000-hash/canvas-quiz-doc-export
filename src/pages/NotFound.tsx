import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, GraduationCap, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  usePageTitle("Page Not Found");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-4xl">📚</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold text-primary">404</h1>
          <p className="text-xl font-semibold text-foreground">Page not found</p>
          <p className="text-sm text-muted-foreground">
            The page <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{location.pathname}</code> doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild>
            <Link to="/"><Home className="mr-2 h-4 w-4" /> Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/lesson-planner"><GraduationCap className="mr-2 h-4 w-4" /> Lesson Planner</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/reading-library"><BookOpen className="mr-2 h-4 w-4" /> Reading Library</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
