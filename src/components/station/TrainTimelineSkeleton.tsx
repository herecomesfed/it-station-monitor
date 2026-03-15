export default function TrainTimelineSkeleton() {
  const skeletonStops = [1, 2, 3];

  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-3/4 mx-auto bg-muted/50 rounded-lg"></div>

      <ul className="relative pl-4">
        {skeletonStops.map((i) => (
          <li key={i}>
            <div className="flex gap-4">
              <div className="relative flex w-6 items-center justify-center py-5 before:absolute before:left-1/2 before:top-0 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-muted before:content-['']">
                <div className="relative z-10 h-2.5 w-2.5 rounded-full bg-muted"></div>
              </div>

              <div className="py-3 flex flex-col justify-center w-full gap-2">
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-3 w-16 bg-muted rounded"></div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
