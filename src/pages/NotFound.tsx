import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, Home } from "lucide-react";
import PageHead from "@/components/PageHead";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-background p-4">
    <PageHead title="Page Not Found" />
    <div className="text-center animate-fade-in">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
        <DollarSign className="h-10 w-10 text-primary" />
      </div>
      <h1 className="font-display text-7xl font-bold text-primary">404</h1>
      <p className="mt-4 text-xl font-medium">Page not found</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild className="gap-2">
          <Link to="/dashboard">
            <Home className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  </div>
);

export default NotFound;
