import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-lg">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Under Maintenance</h1>
        <p className="text-muted-foreground mb-6">
          We're currently performing scheduled maintenance. We'll be back shortly. Thank you for your patience.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Maintenance in progress
        </div>
      </div>
    </div>
  );
}
