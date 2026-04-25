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
- Grab rare upgrade cores that appear between planet pairs.
- Avoid asteroid arcs, unstable planets, missiles, and the collapsing edge.

## Upgrades

Upgrades now appear as rare collectible cores on jump paths between planets. Each core shows the upgrade it grants. Collected upgrades persist across retries, but after your Shield is gone, a lethal hit breaks one random installed upgrade before the run can end.

| Upgrade | Effect |
| --- | --- |
| Wider Capture | Larger capture rings |
| Slow Collapse | More room above the collapsing edge |
| Shard Magnet | Nearby shards drift toward the ship |
| Emergency Blink | One missed capture can snap to a nearby well |
| Combo Boost | Chain captures are worth more |
| Shield | Survive one hit or collapse |
| Stable Orbit | Unstable wells hold longer before failing |
| Phase Hull | Smaller hazard hitbox |
| Deep Scan | Upgrade cores appear slightly more often and pulse brighter |
| Reserve Shield | Shards can recharge a spent Shield once per run |
| Gravity Lens | Capture rings gently pull the ship near their edge |
| Star Siphon | Clean captures push the danger edge back |
