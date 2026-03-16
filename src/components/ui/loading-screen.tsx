export function LoadingScreen({ title = "Cargando BossFit..." }: { title?: string }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-44 rounded-2xl bg-black/8 dark:bg-white/10" />
      <div className="h-40 rounded-[28px] bg-black/8 dark:bg-white/10" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-28 rounded-[28px] bg-black/8 dark:bg-white/10" />
        <div className="h-28 rounded-[28px] bg-black/8 dark:bg-white/10" />
      </div>
      <p className="text-sm text-foreground/50">{title}</p>
    </div>
  );
}
