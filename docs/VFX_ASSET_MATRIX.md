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

## Phase 2: second classes (60 active skills, passives have no effect)

Every class keeps its first class's colours, grown stronger. Large (area) effects also get a soft filled glow under their rings (added in `public/vfx.js`), and every skill effect is drawn 1.7x (basic hits 1.25x) so it reads on a phone.

### Knight

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| โล่กระแทก `kn_bash` | `kn.cast` | — | `kn.bash.hit` | — | starlight shell flash | TESTED |
| ท่าผู้พิทักษ์ `kn_stance` | `kn.stance` | — | — | — | runes barrier spark | TESTED |
| ยั่วยุ `kn_taunt` | — | — | — | `kn.taunt` | glow ring compass | TESTED |
| ปราการเหล็ก `kn_iron` | `kn.iron` | — | — | — | shell spark | TESTED |
| คลื่นโล่ `kn_wave` | — | — | `kn.wave.hit` | `kn.wave` | shell glow ring | TESTED |

### Berserker

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| ฟันโทสะ `bs_rage` | `bs.cast` | — | `bs.rage.hit` | — | flame slash_wide blast dust | TESTED |
| พายุหมุน `bs_whirl` | — | — | `bs.whirl.hit` | `bs.whirl` | slash_thin glow slash_wide twirl dust | TESTED |
| โลหิตเดือด `bs_fury` | `bs.fury` | — | — | — | ring flame glow | TESTED |
| ประหาร `bs_exec` | `bs.cast` | — | `bs.exec.hit` | — | flame slash_wide flash spark | TESTED |
| คำรามศึก `bs_warcry` | `bs.warcry` | — | — | — | glow ring burst spark | TESTED |

### Sharpshooter

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| ศรเจาะทะลวง `ss_pierce` | `ss.draw` | `ss.pierce` | `ss.pierce.hit` | — | sparkle trail streak star_hit | TESTED |
| ศรอัดพลัง `ss_charged` | `ss.charge` | `ss.charged` | `ss.charged.hit` | — | compass glow trail sparkle blast flash spark | TESTED |
| สมาธิคริติคอล `ss_focus` | `ss.focus` | — | — | — | compass sparkle | TESTED |
| ตาเหยี่ยว `ss_eagle` | `ss.eagle` | — | — | — | halo streak | TESTED |
| ฝนศร `ss_rain` | `ss.draw` | — | `ss.rain.hit` | `ss.rain` | sparkle star_hit glow ring trail dust | TESTED |

### Beasthunter

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| กับดักบ่วง `bh_snare` | `bh.cast` | — | — | `bh.snare` | claw ring runes spark | TESTED |
| รอยล่า `bh_mark` | `bh.cast` | — | `bh.mark.hit` | — | claw compass | TESTED |
| กับดักพิษ `bh_ptrap` | `bh.cast` | — | — | `bh.ptrap` | claw splash bubble | TESTED |
| สัญชาตญาณสัตว์ป่า `bh_instinct` | `bh.instinct` | — | — | — | twirl claw streak | TESTED |
| ล่าไม่หยุด `bh_rapid` | `bh.cast` | `bh.rapid` | `bh.rapid.hit` | — | claw trail | TESTED |

### Elementalist

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| สายฟ้าลูกโซ่ `el_chain` | `el.cast` | `el.chain` | `el.chain.hit` | — | rune_arc arc sparkle bolt spark | TESTED |
| ทุ่งน้ำแข็ง `el_frost` | `el.cast` | — | `el.frost.hit` | `el.frost` | rune_arc arc crystal glow ring needle bubble | TESTED |
| โล่ธาตุ `el_shield` | `el.shield` | — | — | — | barrier rune_arc | TESTED |
| อุกกาบาตเพลิง `el_meteor` | `el.cast` | — | `el.meteor.hit` | `el.meteor` | rune_arc arc blast glow flame flash | TESTED |
| พายุธาตุ `el_surge` | `el.cast` | — | `el.surge.hit` | `el.surge` | rune_arc arc glow twirl flame | TESTED |

### Warlock

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| ลูกศรเงา `wl_bolt` | `wl.cast` | `wl.bolt` | `wl.bolt.hit` | — | runes smoke sparkle blast | TESTED |
| คำสาปอ่อนแรง `wl_curse` | `wl.cast` | — | `wl.curse.hit` | — | runes smoke compass | TESTED |
| ดูดชีวิต `wl_drain` | `wl.cast` | — | `wl.drain.hit` | — | runes smoke bubble sparkle | TESTED |
| ตราวิญญาณ `wl_mark` | `wl.cast` | — | `wl.mark.hit` | — | runes smoke | TESTED |
| โนวาทมิฬ `wl_nova` | `wl.cast` | — | `wl.nova.hit` | `wl.nova` | runes smoke glow ring flash | TESTED |

### Priest

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| ฟื้นฟูขั้นสูง `pr_heal` | `pr.heal` | — | — | — | glow trail runes starlight | TESTED |
| บาเรียศักดิ์สิทธิ์ `pr_barrier` | `pr.barrier` | — | — | — | glow halo barrier starlight | TESTED |
| รักษาหมู่ `pr_group` | `pr.group` | — | — | — | glow halo runes sparkle | TESTED |
| ชำระล้าง `pr_purify` | — | — | `pr.purify.hit` | `pr.purify` | starlight glow halo flash | TESTED |
| คืนชีพ `pr_resurrect` | `pr.revive` | — | — | — | glow trail halo starlight | TESTED |

### Oracle

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| พรแห่งโชคชะตา `or_fate` | `or.fate` | — | — | — | glow compass starlight | TESTED |
| เร่งเวลา `or_haste` | `or.haste` | — | — | — | glow twirl streak | TESTED |
| ดวงดาวนำโชค `or_fortune` | `or.fortune` | — | — | — | glow starlight halo sparkle | TESTED |
| หยั่งรู้อนาคต `or_foresight` | `or.foresight` | — | — | — | halo compass | TESTED |
| ผนึกดวงดาว `or_ward` | `or.ward` | — | — | — | glow runes shell starlight | TESTED |

### Assassin

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| แทงข้างหลัง `as_backstab` | `as.cast` | — | `as.back.hit` | — | smoke claw slash_thin flash | TESTED |
| แทงพิษ `as_venom` | — | — | `as.venom.hit` | — | claw bubble | TESTED |
| ก้าวเงา `as_step` | `as.step` | — | `as.step.hit` | — | trail smoke slash_thin | TESTED |
| ตราจุดตาย `as_mark` | `as.cast` | — | `as.mark.hit` | — | smoke compass | TESTED |
| ปลิดชีพ `as_execute` | `as.cast` | — | `as.exec.hit` | — | smoke slash_wide claw flash spark | TESTED |

### Shadowdancer

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| พุ่งเงา `sd_dash` | `sd.dash` | — | `sd.dash.hit` | — | trail smoke claw | TESTED |
| ม่านเงามืด `sd_veil` | — | — | — | `sd.veil` | glow smoke sparkle | TESTED |
| ฟันมายา `sd_phantom` | — | — | `sd.phantom.hit` | `sd.phantom` | slash_thin glow claw twirl | TESTED |
| ระบำหลบหลีก `sd_dance` | `sd.dance` | — | — | — | twirl streak sparkle | TESTED |
| รัตติกาล `sd_nightfall` | — | — | `sd.nightfall.hit` | `sd.nightfall` | claw glow smoke flash | TESTED |

### Alchemist

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| ขวดกรด `al_acid` | `al.cast` | `al.flask` | `al.acid.hit` | — | bubble splash | TESTED |
| หมอกรักษา `al_mist` | `al.mist` | — | — | — | glow splash smoke bubble | TESTED |
| ส่วนผสมระเบิด `al_bomb` | `al.cast` | — | `al.bomb.hit` | `al.bomb` | bubble blast glow splash flash | TESTED |
| ตัวเร่งปฏิกิริยา `al_catalyst` | `al.catalyst` | — | — | — | ring bubble | TESTED |
| เร่งแปรธาตุ `al_transmute` | `al.transmute` | — | — | — | runes weld sparkle | TESTED |

### Machinist

| Skill | Cast | Projectile | Hit | Area | Textures | Status |
|---|---|---|---|---|---|---|
| ยิงรัว `mc_burst` | `mc.cast` | `mc.shot` | `mc.shot.hit` | — | muzzle streak spark star_hit | TESTED |
| ทุ่นช็อต `mc_mine` | `mc.cast` | — | — | `mc.mine` | muzzle ring arc | TESTED |
| โอเวอร์ชาร์จ `mc_overcharge` | `mc.overcharge` | — | — | — | ring arc weld | TESTED |
| โดรนซ่อมแซม `mc_drone` | `mc.drone` | — | — | — | compass sparkle | TESTED |
| ตั้งป้อมปืน `mc_turret` | `mc.cast` | — | — | `mc.turret` | muzzle ring weld spark | TESTED |

## World feedback

| Case | Effect | Textures | Status |
|---|---|---|---|
| Level up / class change | `lvup.burst` | trail halo runes starlight | TESTED |
| Monster dies | `mob.die` | smoke sparkle flash | TESTED |
| Boss dies | `boss.die` | blast ring starlight flash | TESTED |
| Player walking (Medium+ quality) | `walk.dust` | dust | TESTED |

Boss warnings (red circles) are unchanged and are drawn after every skill effect, at every quality setting.
