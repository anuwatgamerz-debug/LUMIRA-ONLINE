# ELYNDRA ONLINE — VFX Asset Licenses

Every image the skill VFX system uses, where it came from and under which licence. Phase 1 covers basic attacks,
the six beginner skills and the 18 first-class skills.

## Policy

- Allowed: **CC0** (preferred), then CC-BY with commercial use (credit kept in this file and in `public/credits.html`).
- Not used: CC-BY-SA, GPL, NC (non-commercial), ND when we modify, unknown sources, and ripped game assets
  (no Ragnarok or any other commercial game).
- Original source files stay untouched in `public/assets/vfx/source/<pack>/` together with the pack's licence file.
- Runtime textures are derived files built by `tools/art/build_vfx.py` (see "Modifications").

## Sites checked

| Site | Result |
|---|---|
| Kenney.nl (Particle Pack) | CC0 — **used**. kenney.nl itself is not reachable from the build machine, so the files were taken from the GitHub mirror below and checked against the OpenGameArt page. |
| OpenGameArt.org — "Particle Pack (80+ sprites)" by Kenney | Same pack, page states CC0, author Kenney — licence confirmed here. |
| GitHub — Calinou/kenney-particle-pack | Mirror of Particle Pack 1.1 with Kenney's original `LICENSE.txt` ("License (Creative Commons Zero, CC0)") — **downloaded from here**. |
| itch.io / CraftPix / other free VFX packs | Not needed in Phase 1 — the CC0 pack covered every effect, so no custom-licence packs were brought in. |
| CC-BY-SA / GPL / NC effect sheets | Excluded by policy, not downloaded. |

## Pack

| Field | Value |
|---|---|
| Original Asset Name | Particle Pack 1.1 (80 sprites) |
| Creator | Kenney Vleugels (Kenney.nl) |
| Source Website | OpenGameArt.org / GitHub mirror (original publisher Kenney.nl) |
| Exact Source URL | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack |
| License | Creative Commons Zero (CC0 1.0) — https://creativecommons.org/publicdomain/zero/1.0/ |
| Commercial Use | Yes |
| Modification Allowed | Yes |
| Attribution Required | No (credited anyway in `public/credits.html`) |
| Date Accessed | 2026-10-07 |
| Licence file | `public/assets/vfx/source/kenney_particle_pack/LICENSE.txt` |

## Files

| Asset ID | File Name | Original Asset Name | Creator | Source Website | Exact Source URL | License | Commercial Use | Modification Allowed | Attribution Required | Date Accessed | Used By Skills |
|---|---|---|---|---|---|---|---|---|---|---|---|
| VFX-001 | `sword/slash_arc.webp` (id `slash_arc`) | slash_02.png (slash_arc) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/slash_02.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | cleave, basic attack |
| VFX-002 | `sword/slash_wide.webp` (id `slash_wide`) | slash_04.png (slash_wide) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/slash_04.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | bash, v_strike, basic attack |
| VFX-003 | `sword/slash_thin.webp` (id `slash_thin`) | slash_03.png (slash_thin) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/slash_03.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | cleave, twin, g_back |
| VFX-004 | `melee/claw.webp` (id `claw`) | scratch_01.png (claw) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/scratch_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | g_back, g_venom, basic attack |
| VFX-005 | `impact/star_hit.webp` (id `star_hit`) | star_07.png (star_hit) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/star_07.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | bash, v_strike, r_pierce, r_volley, t_hammer, basic attack, combat feedback |
| VFX-006 | `impact/flash.webp` (id `flash`) | star_09.png (flash) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/star_09.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | a_ember, a_nova, c_smite, combat feedback |
| VFX-007 | `impact/burst.webp` (id `burst`) | scorch_01.png (burst) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/scorch_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | v_charge, t_hammer |
| VFX-008 | `impact/spark.webp` (id `spark`) | star_04.png (spark) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/star_04.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | bash, bolt, twin, v_wall, v_charge, a_ember, t_hammer, t_bomb, basic attack, combat feedback |
| VFX-009 | `impact/compass.webp` (id `compass`) | magic_03.png (compass) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/magic_03.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | c_bless, status |
| VFX-010 | `environment/dust.webp` (id `dust`) | smoke_04.png (dust) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/smoke_04.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | v_strike, v_charge, basic attack |
| VFX-011 | `fire/flame.webp` (id `flame`) | flame_05.png (flame) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/flame_05.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | a_ember, status |
| VFX-012 | `fire/blast.webp` (id `blast`) | fire_01.png (blast) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/fire_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | a_ember, t_bomb |
| VFX-013 | `fire/muzzle.webp` (id `muzzle`) | muzzle_02.png (muzzle) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/muzzle_02.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | basic attack |
| VFX-014 | `ice/needle.webp` (id `needle`) | trace_06.png (needle) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/trace_06.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | a_frost |
| VFX-015 | `ice/crystal.webp` (id `crystal`) | magic_04.png (crystal) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/magic_04.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | a_frost, status |
| VFX-016 | `lightning/bolt.webp` (id `bolt`) | spark_05.png (bolt) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/spark_05.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 |  |
| VFX-017 | `lightning/arc.webp` (id `arc`) | spark_01.png (arc) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/spark_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | bolt, a_nova |
| VFX-018 | `holy/runes.webp` (id `runes`) | magic_02.png (runes) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/magic_02.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | a_nova, c_mend |
| VFX-019 | `holy/halo.webp` (id `halo`) | circle_02.png (halo) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/circle_02.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | heal, c_smite, c_bless, combat feedback |
| VFX-020 | `holy/glow.webp` (id `glow`) | light_01.png (glow) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/light_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | heal, c_mend |
| VFX-021 | `holy/starlight.webp` (id `starlight`) | star_06.png (starlight) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/star_06.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | c_mend, c_smite, c_bless, buff aura |
| VFX-022 | `buff/ring.webp` (id `ring`) | circle_03.png (ring) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/circle_03.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | cleave, v_strike, a_nova, t_repair, status |
| VFX-023 | `buff/rune_arc.webp` (id `rune_arc`) | magic_01.png (rune_arc) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/magic_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | focus, a_ember, a_frost, a_nova |
| VFX-024 | `shield/barrier.webp` (id `barrier`) | light_03.png (barrier) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/light_03.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | v_wall |
| VFX-025 | `shield/shell.webp` (id `shell`) | circle_01.png (shell) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/circle_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | v_wall, combat feedback, buff aura |
| VFX-026 | `arrow/trail.webp` (id `trail`) | trace_01.png (trail) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/trace_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | v_charge, r_pierce, r_volley, c_smite, basic attack |
| VFX-027 | `wind/twirl.webp` (id `twirl`) | twirl_01.png (twirl) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/twirl_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | r_pierce, r_step, combat feedback |
| VFX-028 | `wind/streak.webp` (id `streak`) | trace_02.png (streak) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/trace_02.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | r_pierce, r_step, basic attack, combat feedback, buff aura |
| VFX-029 | `dark/smoke.webp` (id `smoke`) | smoke_07.png (smoke) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/smoke_07.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | g_back, g_veil, status |
| VFX-030 | `poison/bubble.webp` (id `bubble`) | circle_05.png (bubble) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/circle_05.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | focus, a_ember, a_frost, g_venom, t_bomb, basic attack, combat feedback, status |
| VFX-031 | `heal/sparkle.webp` (id `sparkle`) | star_01.png (sparkle) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/star_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | bash, heal, bolt, r_pierce, r_volley, t_repair, basic attack |
| VFX-032 | `alchemy/splash.webp` (id `splash`) | dirt_01.png (splash) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/dirt_01.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | t_bomb |
| VFX-033 | `mechanical/weld.webp` (id `weld`) | spark_07.png (weld) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/spark_07.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | t_repair |
| VFX-034 | `status/stun.webp` (id `stun`) | symbol_02.png (stun) | Kenney (Kenney Vleugels) | OpenGameArt / GitHub mirror | https://opengameart.org/content/particle-pack-80-sprites · https://github.com/Calinou/kenney-particle-pack/blob/master/addons/kenney_particle_pack/symbol_02.png | CC0 1.0 | Yes | Yes | No | 2026-10-07 | status |
| VFX-PROC-1 | (procedural, `public/vfx.js` `HAMMER`) | — | ELYNDRA team (drawn in code) | — | — | Own work | Yes | Yes | No | 2026-10-07 | t_hammer (thrown hammer) |

All runtime paths are relative to `public/assets/vfx/`.

## Modifications (all allowed by CC0)

`tools/art/build_vfx.py` makes every runtime texture from its source PNG:

1. converted to **white + alpha** (alpha = source alpha × brightness) so the game can tint it per class / element at runtime;
2. trimmed to the visible area (kept centred so rotation stays correct);
3. resized from 512 px to 32–96 px (mobile-friendly) and saved as lossless **WebP**.

Colours, scale, rotation, timing and blending are applied at runtime by `public/vfx.js` (no extra files per colour).
Total runtime size ≈ 50 KB for 34 textures.

## Missing / not used

Nothing in Phase 1 is missing: effects without a fitting texture are drawn in code (thrown hammer) or combine the
textures above. Trap, turret and second-class effects come in later phases (`public/assets/vfx/trap/` is reserved).
