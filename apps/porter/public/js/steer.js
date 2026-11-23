// A copy of hub/public/js/steer.js (test/copies.test.js keeps them the same).
// Walking without walking through each other: a tiny steering step for the games' 3D people and animals (Monastery
// Porter now; Candle Rack and Mass Usher can use it too). Pure math on a flat floor (x, z): no THREE, tested in
// hub/test/steer.test.js. The master copy is here; the games keep identical copies (their test/copies.test.js).
//
// Each agent is {x, z, r?, goal: {x, z} | null, speed, fixed?, tol?, ignore?}: someone with no goal (or fixed) is standing still
// but is still something to walk around. (`ignore`: a walker who never steers around others, like a server on his way
// to a candle; the others still walk around him.) Each step, every walker heads for its goal and:
//  - steers around whoever is in front of it (keeping to its right when it's head-on, like a road),
//  - slows when someone is right in its way, and is pushed apart if two overlap,
//  - and if it makes no progress for a moment ("stuck"), ignores the others for a moment so it always gets there.
// stepAgents moves them and returns the ones that arrived this step; each agent also gets vx, vz (to face the way it walks).
export const RADIUS = 1.5;

export function stepAgents(agents, dt) {
  const arrived = [];
  for (const a of agents) {
    if (!a.goal || a.fixed) { a.vx = a.vz = 0; continue; }
    a.ghost = Math.max(0, (a.ghost ?? 0) - dt);
    const gx = a.goal.x - a.x, gz = a.goal.z - a.z, dist = Math.hypot(gx, gz);
    if (dist <= (a.tol ?? 0.5)) { a.x = a.goal.x; a.z = a.goal.z; a.goal = null; a.vx = a.vz = 0; a.bestDist = null; arrived.push(a); continue; }
    const dx = gx / dist, dz = gz / dist, speed = a.speed ?? 14, ra = a.r ?? RADIUS;
    let sx = 0, sz = 0, slow = 1;
    if (!a.ghost && !a.ignore) {
      for (const b of agents) {
        if (b === a) continue;
        const rx = b.x - a.x, rz = b.z - a.z, d = Math.hypot(rx, rz), rr = ra + (b.r ?? RADIUS);
        if (d >= rr * 1.9) continue;
        if (d < 1e-6) { sx += (a.id ?? 0) % 2 ? 0.6 : -0.6; continue; }                       // exactly on top of each other: nudge apart
        if (d < rr) { const k = (rr - d) * 6 / d; sx -= rx * k; sz -= rz * k; }               // overlapping: push apart
        const ahead = rx * dx + rz * dz;
        if (ahead < -0.3 * rr) continue;                                                       // behind me: not my problem
        const lat = rx * dz - rz * dx;                                                         // + : they're to my right of the way I'm going
        const toRight = Math.abs(lat) < 0.4 * rr ? true : lat < 0;                             // head-on: keep right; else go away from them
        const px = toRight ? dz : -dz, pz = toRight ? -dx : dx;                                // my right (or left) as a direction
        const near = Math.min(1, Math.max(0, 1 - (d - rr) / (rr * 0.9)));
        sx += px * near * speed * 1.7; sz += pz * near * speed * 1.7;
        if (Math.abs(lat) < rr * 0.8 && ahead < rr * 1.3) slow = Math.min(slow, Math.max(0.3, (d - rr * 0.5) / rr));
      }
    }
    let vx = dx * speed * slow + sx, vz = dz * speed * slow + sz;
    const v = Math.hypot(vx, vz), cap = speed * 1.25;
    if (v > cap) { vx *= cap / v; vz *= cap / v; }
    const reach = Math.hypot(vx, vz) * dt; if (reach > dist && dist > 0) { vx *= dist / reach; vz *= dist / reach; } // never overshoot the goal
    a.x += vx * dt; a.z += vz * dt; a.vx = vx; a.vz = vz;
    // no progress toward the goal for a moment: walk through the others for a moment, so nobody is ever stuck
    const nd = Math.hypot(a.goal.x - a.x, a.goal.z - a.z);
    if (a.bestDist == null || nd < a.bestDist - 0.25) { a.bestDist = nd; a.stuckT = 0; } else if ((a.stuckT = (a.stuckT ?? 0) + dt) > 1.2) { a.ghost = 0.9; a.stuckT = 0; a.bestDist = nd; }
  }
  return arrived;
}
