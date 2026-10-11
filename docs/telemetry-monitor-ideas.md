# Telemetry monitor ideas

Ideas for improving the telemetry monitor later. None of these are built yet.
Launch ops should decide what is actually useful before anything here is added.

## Finding things faster

- **Group by board**: put channels under headings like "Injector" or
  "Recovery" so related ones sit together.
- **Problems first**: sort so stale, missing, and disconnected channels move to
  the top.
- **Pin channels**: keep the most important channels at the top of the list.
- **Remember filters**: keep searches and hidden channels after the app
  restarts.
- **Summary line**: show counts above the table, like "12 active, 2 stale,
  1 disconnected".

## Reading values

- **Round numbers**: show fewer decimal places (for example `21.1 °C` instead
  of `21.078 °C`), set per channel.
- **Small trend line**: draw a tiny graph next to each value using the history
  we already keep, so you can see if it's going up or down.
- **Limits**: turn a value red when it goes outside a safe range, like
  pressure that is too high.

## Status

- **Stale time per channel**: some sensors update slowly, so "stale" after
  2 seconds is too strict for them. Let each channel set its own time.
- **Alert on disconnect**: flash the row or play a sound when a channel drops.
- **Show when it dropped**: show "disconnected at 14:32:05" instead of only
  "21.7 s ago".

## Layout

- **Compact mode**: smaller rows so lots of channels fit on one screen.
- **One connection**: the connection message and the table each open their own
  connection to the server. They could share one.
