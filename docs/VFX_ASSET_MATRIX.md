# ELYNDRA ONLINE — VFX Asset Matrix

Which effect each skill plays. Effect ids live in `public/vfx.js` (VFX_DEF); skills point at them from `content/skills.js`
(castVfx / projectileVfx / hitVfx / areaVfx). Textures: Kenney Particle Pack (CC0) — see VFX_ASSET_LICENSES.md.

Status: MISSING → DOWNLOADED → INTEGRATED → TESTED → FINAL (FINAL after the owner reviews Phase 1).

## Basic attacks and combat feedback

| Case | Effect | Textures | Status |
|---|---|---|---|
| Sword / no weapon | `atk.sword` | slash_arc spark | TESTED |
| Greatsword / mace | `atk.heavy` | slash_wide dust | TESTED |
| Spear | `atk.spear` | streak spark | TESTED |
| Dagger | `atk.dagger` | claw | TESTED |
| Bow (+ arrow `proj.arrow`) | `atk.bow` | star_hit | TESTED |
| Staff / wand (+ `proj.magic` for wand) | `atk.magic` | sparkle bubble | TESTED |
| Device (+ `proj.arrow`) | `atk.device` | muzzle spark | TESTED |
| Monster hits a player | `atk.mob` | star_hit | TESTED |
| Critical | `crit.flash` | flash halo | TESTED |
| MISS (no impact) | `miss.whiff` | streak | TESTED |
| Block / barrier absorb | `block.spark` | shell spark | TESTED |
| Evade | `evade.whiff` | twirl | TESTED |

## Skills

| Class | Skill | Cast VFX | Projectile VFX | Hit VFX | Area VFX | Asset Source | License | Status |
|---|---|---|---|---|---|---|---|---|
| Beginner | `bash` Bash | `cast.glint` | — | `bash.hit` | — | Kenney Particle Pack: sparkle, slash_wide, star_hit, spark | CC0 | TESTED |
| Beginner | `heal` First Aid | `heal.self` | — | — | — | Kenney Particle Pack: halo, sparkle, glow | CC0 | TESTED |
| Beginner | `bolt` Spark Bolt | `bolt.cast` | `bolt.proj` | `bolt.hit` | — | Kenney Particle Pack: arc, sparkle, spark | CC0 | TESTED |
| Beginner | `focus` Focus | `focus.self` | — | — | — | Kenney Particle Pack: rune_arc, bubble | CC0 | TESTED |
| Beginner | `cleave` Cleave | — | — | `cleave.hit` | `cleave.area` | Kenney Particle Pack: slash_thin, slash_arc, ring | CC0 | TESTED |
| Beginner | `twin` Twin Strike | — | — | `twin.hit` | — | Kenney Particle Pack: slash_thin, spark | CC0 | TESTED |
| Vanguard | `v_wall` Bulwark | `vg.bulwark` | — | — | — | Kenney Particle Pack: shell, barrier, spark | CC0 | TESTED |
| Vanguard | `v_strike` Rally Strike | `vg.taunt` | — | `vg.strike` | — | Kenney Particle Pack: ring, slash_wide, star_hit, dust | CC0 | TESTED |
| Vanguard | `v_charge` Breach Charge | `vg.charge` | — | `vg.charge.hit` | — | Kenney Particle Pack: trail, dust, burst, spark | CC0 | TESTED |
| Ranger | `r_pierce` Piercing Arrow | `rg.draw` | `rg.pierce` | `rg.pierce.hit` | — | Kenney Particle Pack: sparkle, trail, streak, star_hit, twirl | CC0 | TESTED |
| Ranger | `r_volley` Twin Volley | `rg.draw` | `rg.volley` | `rg.volley.hit` | — | Kenney Particle Pack: sparkle, trail, star_hit | CC0 | TESTED |
| Ranger | `r_step` Windstep | `rg.windstep` | — | — | — | Kenney Particle Pack: twirl, streak | CC0 | TESTED |
| Arcanist | `a_ember` Ember Lance | `ar.cast.fire` | `ar.ember` | `ar.ember.hit` | — | Kenney Particle Pack: rune_arc, flame, bubble, blast, flash, spark | CC0 | TESTED |
| Arcanist | `a_frost` Frost Needle | `ar.cast.ice` | `ar.frost` | `ar.frost.hit` | — | Kenney Particle Pack: rune_arc, crystal, needle, bubble | CC0 | TESTED |
| Arcanist | `a_nova` Rune Nova | `ar.cast.nova` | — | `ar.nova.hit` | `ar.nova` | Kenney Particle Pack: rune_arc, arc, runes, ring, flash | CC0 | TESTED |
| Cleric | `c_mend` Mending Light | `cl.mend` | — | — | — | Kenney Particle Pack: runes, glow, starlight | CC0 | TESTED |
| Cleric | `c_smite` Dawn Smite | `cl.cast` | `cl.smite` | `cl.smite.hit` | — | Kenney Particle Pack: starlight, trail, halo, flash | CC0 | TESTED |
| Cleric | `c_bless` Sanctum Blessing | `cl.bless` | — | — | — | Kenney Particle Pack: halo, starlight, compass | CC0 | TESTED |
| Rogue | `g_back` Shadow Fang | `rq.shadow` | — | `rq.fang` | — | Kenney Particle Pack: smoke, claw, slash_thin | CC0 | TESTED |
| Rogue | `g_venom` Venom Flurry | — | — | `rq.venom` | — | Kenney Particle Pack: claw, bubble | CC0 | TESTED |
| Rogue | `g_veil` Smoke Veil | `rq.veil` | — | — | — | Kenney Particle Pack: smoke | CC0 | TESTED |
| Artisan | `t_hammer` Hammer Toss | — | `t.hammer` | `t.hammer.hit` | — | Kenney Particle Pack: HAMMER, burst, star_hit, spark (HAMMER = drawn in code) | CC0 | TESTED |
| Artisan | `t_bomb` Flask Bomb | — | — | `t.bomb.hit` | `t.bomb` | Kenney Particle Pack: spark, blast, splash, bubble | CC0 | TESTED |
| Artisan | `t_repair` Field Repair | `t.repair` | — | — | — | Kenney Particle Pack: ring, weld, sparkle | CC0 | TESTED |

## Status effects (drawn every frame from the server snapshot / my buffs)

| Status | Look | Textures | Status |
|---|---|---|---|
| Stun | 3 yellow stars circling the head | stun | TESTED |
| Slow / freeze | blue ring on the ground + small ice crystal | ring, crystal | TESTED |
| Poison | green bubbles rising | bubble | TESTED |
| Acid | yellow-green bubbles | bubble | TESTED |
| Bleed | red drops | bubble | TESTED |
| Burn | two small flames at the feet | flame | TESTED |
| Curse | purple smoke wisp | smoke | TESTED |
| Mark | red rune turning above the head | compass | TESTED |
| Weakened | grey drop | bubble | TESTED |
| Shield / Bulwark / Barrier / Field Repair (me) | see-through blue barrier | shell | TESTED |
| Windstep (me) | green wind at the feet | streak | TESTED |
| Sanctum Blessing (me) | gold star motes | starlight | TESTED |
| Smoke Veil (me) | dark wisp | smoke | TESTED |

## Not in Phase 1

Second-class skills (72) keep their current effects until the Phase 2 review. Boss warnings (red circles) are unchanged and are drawn after every skill effect, at every quality setting.
