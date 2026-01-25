import { Link } from "react-router-dom";
import { Activity, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="gradient-bg p-2 rounded-lg">
          <Activity className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-xl">SmartTraffic</span>
      </div>

      {/* 404 Content */}
      <div className="text-center animate-fade-in">
        <h1 className="text-8xl font-display font-bold gradient-text mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved to a different location.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/">
            <Button className="gap-2 gradient-bg">
              <Home className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default NotFound;
