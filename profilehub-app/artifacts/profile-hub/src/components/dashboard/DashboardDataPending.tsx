export function DashboardDataPending() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-lg font-medium text-foreground">Refreshing your session</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your browser session is being checked. The dashboard will update automatically.
      </p>
    </div>
  );
}
