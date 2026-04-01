export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      {children}
    </div>
  );
}
