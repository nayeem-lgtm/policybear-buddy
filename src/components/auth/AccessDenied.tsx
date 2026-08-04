import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

export function AccessDenied({ path }: { path: string }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md gap-4 p-6 text-center shadow-card">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Restricted area</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your role does not include access to{" "}
            <span className="font-medium text-foreground">{path}</span>. Ask Operations or
            IT Administration to grant the permission.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          Signed in as
          <Badge variant="secondary">{user?.role}</Badge>
          <span>· {user?.department}</span>
        </div>
        <Button asChild variant="outline" className="mx-auto">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </Card>
    </div>
  );
}
