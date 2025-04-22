export default function LoadingState() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4 w-1/3"></div>
          <div className="flex flex-wrap gap-4">
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded w-full md:w-[calc(33.333%-1rem)]"></div>
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded w-full md:w-[calc(33.333%-1rem)]"></div>
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded w-full md:w-[calc(33.333%-1rem)]"></div>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4 w-1/4"></div>
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4">
                <div className="col-span-1 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="col-span-5 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="col-span-3 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="col-span-3 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
