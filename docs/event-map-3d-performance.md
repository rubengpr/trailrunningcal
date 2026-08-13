# Default 3D event-map performance

## Decision

Use an adaptive default rather than unconditional 3D:

- Render the existing interactive 2D map first.
- In the non-production preview, wait 500 ms after the map is ready before deciding whether to request 3D. This gives the fallback a paint opportunity and keeps initial map work off the critical path.
- Automatically request terrain and satellite imagery on eligible connections and devices.
- Skip the automatic request when Data Saver is enabled, the effective connection is `slow-2g`, `2g`, or `3g`, reported device memory is 2 GB or less, or either capability signal is unavailable.
- Use one terrain DEM source for the automatic first view. The separate hillshade DEM remains available for explicit 3D requests, preserving the existing full-quality path.
- Keep the existing 8-second slow warning, 20-second timeout, cancellation, retry, source-error recovery, and analytics behavior.

The automatic behavior is deliberately unavailable in production. It can only be exercised in development with `?event-map-3d=auto`.

## Benchmark method

The repository benchmark runner launches a fresh headless Chrome profile for every run and uses the Chrome DevTools Protocol directly. Each measurement uses:

- Pixel 7-sized viewport: 390 × 844 CSS pixels at device pixel ratio 3
- disabled and cleared browser cache before the 3D request
- the Pedraforca Xtrail event route
- three runs per scenario; table values are medians
- provider transfer bytes from completed OSM, Mapterhorn, and ICGC requests
- Chrome `Performance.getMetrics` task duration during the attempt
- browser `longtask` entries during the attempt

The baseline is the existing explicit, full-quality 3D request. The optimized result is the adaptive automatic request with the lightweight first presentation.

| Scenario | Emulation |
|---|---|
| Fast 4G | 20 Mbps down, 10 Mbps up, 40 ms latency, 1× CPU |
| Slow 4G | 8 Mbps down, 3 Mbps up, 80 ms latency, 1× CPU |
| 3G | 0.75 Mbps down, 0.25 Mbps up, 300 ms latency, 1× CPU |
| Slow 4G + 4× CPU | Slow 4G network with 4× CPU slowdown |

## Results

| Scenario | Baseline outcome | Optimized outcome | Payload before → after | 3D readiness before → after | Main-thread task time before → after | Long tasks before → after |
|---|---|---|---:|---:|---:|---:|
| Fast 4G | 3/3 ready | 3/3 ready | 4.38 → 2.81 MiB (−36%) | 3.09 → 2.41 s (−22%) | 409 → 287 ms (−30%) | 85 → 69 ms |
| Slow 4G | 3/3 ready | 3/3 ready | 4.38 → 2.81 MiB (−36%) | 5.43 → 4.08 s (−25%) | 433 → 355 ms (−18%) | 53 → 75 ms |
| 3G | 3/3 timed out | 3/3 suppressed to 2D | ~0.20 MiB completed before timeout → 0 terrain/satellite | 20.04 s timeout → ~0.46 s decision | 914 → 27 ms | 61 → 0 ms |
| Slow 4G + 4× CPU | 3/3 ready | 3/3 ready | 4.38 → 2.81 MiB (−36%) | 5.38 → 4.04 s (−25%) | 655 → 677 ms (+3%) | 106 → 103 ms |

The optimized Fast/Slow 4G payload consists of approximately 2.62 MiB of DEM data and 0.20 MiB of satellite imagery. The baseline used approximately 4.18 MiB of DEM data because terrain and hillshade were independent sources.

## Interpretation

- Automatic 3D is viable on the tested 4G profiles: median readiness remains below 4.1 seconds and no attempts failed.
- A separate hillshade DEM is the largest avoidable first-load cost. Omitting it from automatic activation reduces transferred map data by 36% without changing the explicit full-quality path.
- Unconditional 3D is not viable on the tested 3G profile: every baseline attempt reached the existing 20-second timeout.
- Connection gating converts that failure into an immediately usable 2D fallback with no automatic terrain or satellite transfer.
- CPU throttling did not materially worsen readiness after the network optimization, although task time did not improve. Network transfer remains the primary bottleneck for this route.

## Repeat the benchmark

Start the local application, then run:

```bash
pnpm perf:event-map \
  --url http://127.0.0.1:3000/es/e/pedraforca-xtrail \
  --mode manual \
  --runs 3 \
  --output /tmp/event-map-baseline.json

pnpm perf:event-map \
  --url http://127.0.0.1:3000/es/e/pedraforca-xtrail \
  --mode auto \
  --runs 3 \
  --output /tmp/event-map-optimized.json
```

Use `--scenario fast-4g`, `slow-4g`, `3g`, or `slow-4g-4x-cpu` to run one profile. Set `CHROME_PATH` when Chrome is not installed at the default macOS location.

## Limits and rollout gate

- Results describe one representative event, viewport, and Chrome implementation. Route bounds and tile cache state materially change the payload.
- Completed-response bytes understate partial data transferred before a timeout.
- Network Information and Device Memory hints are not available in every browser. Those browsers remain in 2D by default but can still request 3D explicitly.
- The lighter automatic presentation intentionally excludes the second hillshade DEM. Visual review on representative mountain routes is required before rollout.
- Before production, run a controlled product experiment and monitor readiness, timeout/error rate, return-to-2D behavior, map interaction, and page exits by device and connection segment.
