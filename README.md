# Orbit Breaker

One-touch endless orbit runner. Tap to launch tangentially from gravity wells, chain captures, collect shards, and outrun the collapsing starfield.

## Play Locally

```sh
cd ~/games/orbit-breaker
python3 -m http.server 8181
```

Open `http://localhost:8181` in a browser. On iPhone, use the Mac's local network IP and add the page to the home screen from Safari.

## Controls

- Tap while orbiting to launch.
- Fly into another gravity well's capture ring to keep the run alive.
- Collect shards for bonus points.
- Avoid asteroid arcs, unstable planets, missiles, and the collapsing edge.

## Upgrades

After a high enough score, pick one upgrade for the next run in the current session:

| Upgrade | Effect |
| --- | --- |
| Wider Capture | Larger capture rings |
| Slow Collapse | More room above the collapsing edge |
| Shard Magnet | Nearby shards drift toward the ship |
| Emergency Blink | One missed capture can snap to a nearby well |
| Combo Boost | Chain captures are worth more |
| Shield | Survive one hit or collapse |
