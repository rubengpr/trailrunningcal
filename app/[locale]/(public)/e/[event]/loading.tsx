export default function EventLoading() {
  return (
    <div
      aria-hidden="true"
      className="min-h-screen w-full bg-white text-gray-900"
    >
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="motion-safe:animate-pulse">
          <div className="mb-5 h-3 w-40 rounded bg-gray-200" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-8 w-3/4 max-w-xl rounded bg-gray-200" />
              <div className="h-4 w-52 rounded bg-gray-200" />
              <div className="h-4 w-44 rounded bg-gray-200" />
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44">
              <div className="h-10 w-full rounded-md bg-gray-300" />
              <div className="flex gap-2">
                <div className="h-10 flex-1 rounded-md bg-gray-200" />
                <div className="h-10 flex-1 rounded-md bg-gray-200" />
              </div>
            </div>
          </div>

          <div className="my-8 space-y-3">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-2/3 rounded bg-gray-200" />
          </div>

          <section className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <div className="size-5 rounded bg-gray-200" />
              <div className="h-7 w-36 rounded bg-gray-200" />
            </div>
            <div className="px-4 sm:px-6">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="flex flex-col gap-3 border-b border-gray-200 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="h-5 w-2/3 max-w-sm rounded bg-gray-200" />
                  <div className="grid grid-cols-3 gap-3 lg:w-72">
                    <div className="h-5 rounded bg-gray-200" />
                    <div className="h-5 rounded bg-gray-200" />
                    <div className="h-5 rounded bg-gray-200" />
                  </div>
                  <div className="h-6 w-28 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
