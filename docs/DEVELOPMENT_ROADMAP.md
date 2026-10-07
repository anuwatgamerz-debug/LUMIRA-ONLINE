# LUMIRA ONLINE — FULL GAME AUDIT & DEVELOPMENT ROADMAP

อัปเดต 2026-10-07 · ตรวจจาก code/data จริงที่ commit `0d658ca` · ดูตารางเนื้อหาราย Map ใน [CONTENT_MATRIX.md](CONTENT_MATRIX.md)

## สถานะ Milestone

| Milestone | สถานะ | สิ่งที่ทำ |
|---|---|---|
| M1 Audit + Cleanup | ✅ เสร็จ | Job cap ขั้น 1 = 40 / ขั้น 2 = 50 / ขั้น 3 = 70 · ล็อก login 5 นาทีเมื่อผิด 10 ครั้ง · ค่าวาร์ป (ฟรีถึง Lv15, ข้าม Region ×2) · `content/events.js` (Double EXP/Drop ไม่ hardcode) + NPC อีเวนต์แสดงอีเวนต์ที่เปิด · ระบบ Elite (วงทองใต้เท้า, ชื่อ ★, สกิลพิเศษ, เกิดน้อย) · สกิลบอส 3 แบบ (quake / root_slam / spore) · modifier อุปกรณ์ crit / aspdPct / flee · NPC placeholder ติดป้าย [เร็วๆ นี้] · เปลี่ยนชื่อรูปต้นฉบับภาษาไทยเป็น ASCII |
| M2 Region 2 Verdant Wilds | ✅ เสร็จ | เมืองเวอร์แดนต์ เฮเวน + field 5 (ป่าลึก, โพรงเห็ด, สวนวิญญาณ, หุบเขาสัตว์ป่า, หนองหนาม) + dungeon ต้นไม้โบราณ · มอน 24 + elite 4 + บอส 3 · เนื้อเรื่องบท 2 (mq10–mq15) + side 7 + daily 2 · อุปกรณ์ Tier 2 39 ชิ้น + ยาใหม่ · สูตร 10 · ร้าน 4 · env/ทรี/แสง/เพลง/เสียงบรรยากาศเฉพาะแต่ละแผนที่ · test `tests/verdant.test.js` 30 ข้อ |
| M3 Second Class Skills | ✅ COMPLETE | 12 อาชีพขั้น 2 เปิดเล่น + เควสเปลี่ยนอาชีพ · 72 สกิล (60 active + 12 passive) · แต้มสกิล + Skill Lv 1-5 · สถานะ stun/slow/poison/burn/curse/acid/mark/barrier/evade/regen (`engine/status.js`) · กับดัก/ทุ่นระเบิด/ป้อมปืน · ชุบชีวิต · หน้าต่างสกิลแบ่ง 3 ขั้น · AUTO Skill รองรับชนิดใหม่ · ไอคอนจากชีทของเจ้าของเกม · test `tests/skills2.test.js` 46 ข้อ |
| VFX Phase 1 (โจมตีปกติ + สกิลพื้นฐาน + อาชีพขั้น 1) | ✅ COMPLETE — รอเจ้าของเกมตรวจ | `public/vfx.js` registry + pool + cap/priority · 24 สกิลผูก castVfx/projectileVfx/hitVfx/areaVfx · crit/miss/block/evade · status VFX · ตั้งค่าคุณภาพ/ผู้เล่นอื่น/ปาร์ตี้ (คำเตือนบอสปิดไม่ได้) · Kenney Particle Pack CC0 · `docs/VFX_ASSET_LICENSES.md`, `docs/VFX_ASSET_MATRIX.md` · test `tests/vfx.test.js` · VFX อาชีพขั้น 2 ยังไม่เริ่ม |
| Character Portraits | ✅ COMPLETE | 8 ภาพ (registry `public/portraits.js`) · เลือกตอนสร้างตัวละคร + preview HUD · เปลี่ยนภายหลังฟรี · HUD/ปาร์ตี้/ข้อมูลผู้เล่น · ตัวเก่าได้ภาพ default ตามรูปร่าง · server รับเฉพาะ id ใน registry · รองรับ RARE/EVENT/ACHIEVEMENT/CLASS + 🔒 · test `tests/portrait.test.js` |
| M4 Region 3 Ashen Frontier (Lv40-65) | ⏭ ถัดไป (รอคำสั่ง) | |

กติกา: ขยายจากระบบเดิม ห้ามรื้อระบบที่ทำงานแล้ว (Login, Character, Paperdoll, Movement, Joystick, Combat, Target, Skill, Cooldown, AUTO/Auto Skill/Auto Potion, Quest/Auto Quest/Navigation, Inventory, Equipment, Shop, Crafting, Party, Guild, Trade, Chat, Ranking, Minimap, World Map, Audio, Server Authority, Save, Tests)

---

## 1. ระบบที่ COMPLETE

| ระบบ | หลักฐานในโค้ด |
|---|---|
| Login / Register | scrypt hash, ตรวจความยาว, จำรหัสฝั่ง client, test ครอบคลุม |
| Character + Paperdoll | สร้างตัวละคร, layer base→armor→costume→hair→weapon/shield→headgear (`public/paperdoll.js`) |
| Movement / Joystick / Tap-to-move | server A* (`findPath`), warp ผ่าน portal |
| Combat / Target / Skill / Cooldown | server ตัดสินดาเมจทั้งหมด, `failMsg` throttle |
| AUTO Combat + Auto Skill + Auto Potion | `public/autocombat.js` + `sanitizeAuto` + POTION_CD ฝั่ง server |
| Quest engine | stage types: talk, visit, gather, kill, collect, deliver, choice, interact, wave (defend), heal, sneak, craft |
| Auto Quest + Multi-map Navigation | BFS ข้าม portal, marker บนมินิแมพ |
| Inventory / Equipment / Shop / Sell / Storage (100) / Bank / Inn | `server.js` case `shop/sell/storage/bank/inn` |
| Crafting / Smith | 17 สูตร, station check |
| Class change ขั้น 1 | ต้องผ่านเควส `cls_*` ที่ NPC ครู (ไม่ใช่กดฟรี) |
| Party / Guild / Trade / Whisper / Ranking | `engine/social.js` (trade แบบ lock + confirm, atomic) |
| Minimap / World Map | ภาพวาด, จุดเควส |
| Audio | BGM ต่อแผนที่, ambient, เสียงบอส |
| Save | เขียน `.tmp` → rename, เก็บ `.bak`, โหลด backup ถ้าไฟล์เสีย |
| Tests | 7 ชุด ~424 assertion (server 68, world 79, social 28, art 68, auto 39, aq 28, ui 114) |

## 2. ระบบที่ PARTIAL

| ระบบ | มีแล้ว | ขาด |
|---|---|---|
| World / Region | Heartland เปิด 12/14 แผนที่ | Region 2–8 มีแค่ชื่อ+Lv ใน `content/world.js` (40 แผนที่ PLANNED) |
| Class tree | 31 อาชีพใน `content/classes.js` | ขั้น 2 และ 3 `status:'planned'` ไม่มี weapons/armor/quest/master |
| Skill | 24 สกิล, skill level อัตโนมัติจาก Lv/Job Lv (สูงสุด 10) | ไม่มีสกิลขั้น 2/3, ไม่มี passive, ไม่มี skill point / prerequisite |
| Job Level | JOB_CAP {0:10, 1:50, 2:70, 3:70} | ยังไม่ตรงสเปก (ขั้น 1 = 40, ขั้น 2 = 50, ขั้น 3 = endgame) |
| Monster AI | 10 behavior (passive, aggressive, assist, coward, ranged, caster, healer, pack, boss, dummy), 16 ตระกูล | ใช้จริงแค่ 11 ตระกูล, ธาตุใช้จริง 5 (water, neutral, earth, shadow, holy), มอนแทบไม่มีสกิล |
| Elite | role `elite` มีใน ROLES (HP×2.4, EXP×2.6) | ใช้แค่ 1 ตัว (bramblekin), ไม่มี visual marker, ไม่มี special skill, ไม่มี spawn แบบหายาก |
| Boss | phase (ATK/SPD เพิ่ม), telegraph AoE 0.9 วิ, charge, summon minion, respawn | skill pattern มีแค่ quake/charge/summon/root_slam ใช้ร่วมกันทุกตัว, rare drop แบบตารางเดียว |
| Drop table | 4 tier (common, uncommon, rare, veryRare) + owner priority 6 วิ | ไม่มีของ Legendary, ไม่มีกฎ "ห้ามขาย Legendary ใน shop" (ยังไม่มีของ Legendary เลย) |
| Equipment | 83 ชิ้น, 5 ช่อง + คอสตูมหัว, modifier บางชิ้น (str/agi/dex/hp/sp ฯลฯ 12 ชิ้น) | ของต้องการ Lv สูงสุดแค่ 30, ไม่มี crit/aspd/resist/skill bonus, ไม่มี tier 3–8 |
| Shield | วาดใน paperdoll (Vanguard ถือโล่อัตโนมัติ) | ไม่มีช่องสวมโล่จริง (ช่องถูกล็อก) |
| Costume | ช่องคอสตูมหัว 4 ชิ้น | ไม่มีคอสตูมตัว / aura |
| Main Story | 9 เควส (ดาวตก → ทรราชเหมือง) | ไม่มีบทต่อ Region 2–8 |
| Daily | 3 เควสบนกระดานประกาศ รีเซ็ตรายวัน | ไม่มี Weekly |
| Dungeon | 5 แห่ง (มอน + บอส) | ไม่มี elite, treasure, checkpoint, จำกัดรอบ, โหมด party; ทุก dungeon ใช้ BGM `bgm_old_mine` |
| Economy | ที่มาของเงิน: drop zeny ต่อการฆ่า (Lv×40), ขายของ, เควส · ที่ใช้เงิน: ยา, อุปกรณ์, โรงเตี๊ยม, สร้างกิลด์ 5,000z | teleport ฟรี, ไม่มี repair/upgrade/market tax → เงินมีแนวโน้มเฟ้อ |
| Ranking | 5 อันดับ | ไม่มีอันดับ PvP/Guild |

## 3. ระบบที่ PLACEHOLDER (มี NPC/ข้อความ แต่ไม่มีระบบรองรับ)

| NPC | role | สถานะ |
|---|---|---|
| ลานประลอง บรูโน (solkara) | `arena` | ตกไป `default:` ใน dialog → พูดอย่างเดียว |
| ตลาดประมูล มาร์โก (solkara) | `auction` | พูดอย่างเดียว |
| อีเวนต์ เทศกาลดาวตก (solkara) | `event` | พูดอย่างเดียว |
| หอกิลด์ เอเดรีย (solkara) | `guild` | พูดอย่างเดียว (ระบบกิลด์ทำผ่านเมนู) |
| แผนที่ ancient_farm, bandit_road | — | มีใน world.js แต่ไม่มีไฟล์แผนที่ |
| มอนตระกูล orc, dragon, demon, ice, void | — | มีค่า stat ใน FAMILIES แต่ไม่มีมอนใช้ |
| `mail` ใน quest engine | — | แค่ส่งของเข้าคลังเมื่อกระเป๋าเต็ม ไม่ใช่ระบบ Mail |

## 4. ระบบที่ยังไม่มี (NOT IMPLEMENTED)

PvP / Arena · Guild War · Player Market · Mail · World Boss · Event registry (Double EXP/Drop) · Achievement · Title · Monster Book / Collection · Weekly Quest · Friend List · Block List · Death penalty · Equipment upgrade/refine · Skill point / skill tree · Escort quest · Dungeon instance / entry limit · Endgame content

---

## 5. Content ปัจจุบัน

12 แผนที่เปิด (เมือง 2, field 5, dungeon 5) · มอนธรรมดา 53 · elite 1 · บอส 7 · อาชีพเล่นได้ 7 · สกิล 24 · ไอเท็ม 150 (อุปกรณ์ 83) · เควส 27 · NPC 54 · ร้าน 10 · สูตรคราฟต์ 17 · เนื้อหาจริงถึงประมาณ **Lv 33** จาก cap 150

## 6. สิ่งที่ขาดเพื่อถึง Lv150

- 40 แผนที่ (7 Region) และต้องเพิ่ม field ให้แต่ละ Region ครบ 4–7 แผนที่ (ตอนนี้ใน data มี 2–4)
- มอนเพิ่มประมาณ 80–100 ชนิด (Region ละ 10–14 + elite 2–4)
- Boss Region ละ ≥2 (field + dungeon) = 14+
- อุปกรณ์ tier 2–8 (Lv20–150)
- Main Story 7 บท
- EXP curve: `expNext` ถูกออกแบบถึง Lv150 แล้ว แต่ยังไม่ได้ทดสอบเวลาเล่นจริงหลัง Lv33

## 7. Class

- ขั้น 2 (12) และขั้น 3 (12): ต้องเพิ่ม `weapons`, `armor`, `role`, `quest`, `master`, เปลี่ยน `status`
- ต้องมีเควสเปลี่ยนอาชีพขั้น 2 (Lv50) และขั้น 3 (Lv100) พร้อม NPC ครู
- Identity: ตอนนี้ต่างกันที่ตัวคูณ stat อย่างเดียว ต้องมี passive + สกิลเฉพาะ
- `changeClass` รองรับ lineage แล้ว (skill ขั้นก่อนหน้ายังใช้ได้) → ขยายต่อได้โดยไม่ต้องรื้อ

## 8. Skill

- ขั้น 2: 4–6 สกิล/อาชีพ = ~60 สกิล; ขั้น 3: 3–5 = ~48 สกิล
- ต้องเพิ่มชนิดเอฟเฟกต์ใน data: `passive`, debuff (curse/poison DoT), shield/barrier, party buff/heal (ตอนนี้ heal/buff เป็น self อย่างเดียว), summon/turret, trap, ground AoE ที่ตำแหน่ง, revive
- ข้อเสนอ Skill Tree (เรียบง่าย, mobile): คงระบบ "skill level ขึ้นตาม Job Lv" ไว้ แล้วเพิ่ม **1 ช่องเลือก Signature** ต่อขั้น (เลือก 1 จาก 2) แทน skill point เต็มรูปแบบ → ไม่ต้องรื้อ save, UI เป็นแค่การ์ด 2 ใบ
- ป้องกัน power creep: กำหนด DPS budget ต่อ tier (ขั้น 2 ≈ ขั้น 1 ×1.25, ขั้น 3 ≈ ×1.5) และเขียน test ตรวจ `mult × hits / cd`

## 9. Monster / Boss

- ใช้ตระกูลที่ยังว่าง: orc (Ashen), aquatic (Azure), desert (Sandsea), ice (Frostland), elemental/spirit (Arcane), void/demon (Void), dragon (endgame)
- เพิ่มธาตุ fire, wind, void ในมอนจริง
- Elite: `role:'elite'` + flag `rare` spawn (1 ตัว/แผนที่, respawn 10–20 นาที), กรอบชื่อสีทอง, 1–2 สกิลจาก pool
- Boss: แยก skill pattern ต่อบอส (ไม่ใช้ quake/charge ชุดเดียวกัน), เพิ่ม telegraph รูปแบบ line/cone, เพิ่ม rare drop tier
- World Boss (ทีหลัง): contribution = ดาเมจ + heal + tank, รางวัลเฉพาะคนที่ contribution ≥ เกณฑ์

## 10. Equipment

- Tier 1 (Lv1–20) ✔ · Tier 2 (Lv20–40) บางส่วน (ถึง Lv30) · Tier 3–8 ไม่มี
- ต่อ tier: อาวุธ 9 แบบ + เกราะ 4 แบบ + หมวก + เครื่องประดับ ≈ 20–25 ชิ้น
- Modifier: เพิ่ม `crit`, `aspd`, `res:{fire..}`, `skillBonus`, `healBonus`, `moveSpd` โดยจำกัดงบ stat ต่อ tier
- Legendary: ไม่มีใน shop (เพิ่ม test ตรวจ), มาจาก boss/craft/event
- ช่องโล่ (shield) ยังล็อก ต้องตัดสินใจว่าจะเปิดหรือไม่

## 11. Quest

- Main Story ต่อ Region (5–8 เควส) ใช้ stage type ที่มีอยู่แล้ว (talk/visit/kill/collect/deliver/choice/wave/sneak)
- เพิ่ม stage type: `escort`, `dungeon` (เคลียร์ dungeon), `boss`
- Weekly: กระดานประกาศเดิม + `repeat:'weekly'`
- Story dialogue: ให้ผู้เล่นกดเอง (Auto Quest หยุดที่ talk ที่มี `story:true`)

## 12. Economy

| เงินเข้า | เงินออก (มีแล้ว) | เงินออก (ควรเพิ่ม) |
|---|---|---|
| zeny ต่อการฆ่า (Lv×40) | ยา | ค่า teleport (ตอนนี้ฟรี) |
| ขายของ | อุปกรณ์ shop | อัปเกรด/ตีบวก |
| รางวัลเควส | โรงเตี๊ยม | Market tax 3–5% |
| | สร้างกิลด์ | ค่าเข้า dungeon/arena (บางแห่ง) |

ความเสี่ยง: เงินจากการฆ่าแบบ AUTO เข้าตลอดโดยแทบไม่มีที่ใช้หลัง Lv30 → ต้องมี sink ก่อนเปิด Region 2

## 13. PvP / Guild War

ไม่มีเลย (NPC ลานประลองเป็น placeholder) → Arena instance แบบ opt-in, กันเกิดแล้วโดนฆ่า (spawn shield 3 วิ), score, จบแมตช์, PvP damage multiplier แยก · Guild War: ยึด Rune Core, จำกัดเวลา, ไม่มี pay-to-win

## 14. Player Market

ไม่มี (NPC ตลาดประมูลเป็น placeholder) → ฝากขาย fixed price, ค้นหาด้วยชื่อ/หมวด/Lv/rarity/ราคา, server ถือของไว้ใน escrow, หัก tax 4%, เงินขายส่งผ่าน Mail

## 15. Endgame

ไม่มี → Endgame dungeon, World Boss, Legendary craft, Arena season, Guild War, Achievement/Collection, Cosmetic หายาก

---

## 16. Technical Debt

1. **`db.json` ไฟล์เดียว**: `JSON.stringify(db)` ทั้งก้อนทุก 15 วิ — ตอนนี้ 2 บัญชีไม่มีปัญหา แต่โตตามผู้เล่น + market + mail + guild (ควรย้ายไป SQLite ก่อน Player Market)
2. **`server.js` ~1,100 บรรทัดยาว** รวม combat, AI, NPC dialog, shop, craft — ควรแยก `engine/` (combat, mobai, npc, economy) ทีละส่วนพร้อม test โดยไม่เปลี่ยนพฤติกรรม
3. NPC role ที่ไม่มี handler ตกไป `default:` แบบเงียบ — ควรมี test ตรวจว่า role ทุกตัวมี handler หรือติดป้าย "เร็วๆ นี้"
4. Dungeon ทั้ง 4 ใช้ BGM และเสียงบอสร่วมกัน
5. `content/world.js` มี field ไม่ครบเกณฑ์ใน Region 3–8
6. Event/drop/exp rate ยังเป็นค่าคงที่ในโค้ด ต้องมี `content/events.js` ก่อนทำ Double EXP
7. Party อยู่ใน session (หายเมื่อรีสตาร์ท) — รับได้ แต่ต้องรู้ไว้
8. รูปต้นฉบับชื่อไทยใน `public/assets/import/` ทำให้ deploy ผ่าน Windows มี error ชื่อไฟล์ — ควรย้ายออกจาก public หรือเปลี่ยนชื่อ

## 17. Performance Risk

- game loop เดียวทุก map; มอนเพิ่มจาก ~60 → 300+ spawn ต้องหยุด AI แผนที่ที่ไม่มีคนอยู่ (มี `busy` set แล้ว — ตรวจให้ครอบทุก path)
- snapshot broadcast ต่อ map: ต้องมี interest radius ก่อนเปิด World Boss/Guild War (ผู้เล่นหนาแน่น)
- `rankings` cache 10 วิ วนทุกบัญชี — โอเคถึงหลักพันบัญชี
- `saveDb` sync write บล็อก event loop เมื่อไฟล์ใหญ่

## 18. Security Risk

- ไม่มี HTTPS (รหัสผ่านวิ่งเป็น plain text บน ws://) — ควรใส่ TLS (reverse proxy) ก่อนเปิดสาธารณะ
- ไม่มีจำกัดการเดารหัส login (มีแค่ rate 40 msg/วิ ต่อ connection) — ควรล็อกตาม IP/บัญชี
- maxPayload 4 KB, chat ตัดที่ 120 ตัวอักษร, client escape HTML ✔
- Trade/market ต้องเป็น atomic + log ธุรกรรม (trade ทำแล้ว; market ต้องทำแบบเดียวกัน)
- ไม่มี admin/GM tool หรือ ban — ควรมีก่อนเปิด market/PvP

---

## 19. Suggested Priority

1. **M1 Audit + Cleanup** (เล็ก, ไม่เปลี่ยน gameplay): content validator test, event registry ว่าง, NPC placeholder ติดป้าย, ย้ายรูปชื่อไทย, login throttle, money sink พื้นฐาน (ค่า teleport เล็กน้อย)
2. **M2 Region 2 Verdant Wilds** — ทำให้เกมเล่นต่อได้ Lv33→45 (ผู้เล่นตันที่ Lv33 ตอนนี้)
3. **M3 Second Class + Skills** — ต้องมาก่อน Lv50 เพราะ reqLv ขั้น 2 = 50
4. M4 Region 3 · M5 Region 4
5. M6 Player Market (+ SQLite + Mail ขั้นพื้นฐาน)
6. M7 Region 5 · M8 PvP Arena
7. M9 Region 6 · M10 Third Class Skills · M11 Region 7
8. M12 Guild War · M13 Region 8 · M14 Endgame

## 20. Next Milestone ที่เสนอ: **M1 → M2**

**M1 (1 รอบสั้น):**
- `tests/content.test.js`: ตรวจ id ซ้ำ, drop อ้างไอเท็มที่มีจริง, NPC role มี handler, ไม่มี Legendary ใน shop, มอนทุกตัวมี spawn
- `content/events.js` (registry ว่าง + rate multiplier = 1)
- NPC arena/auction/event แสดง "เร็วๆ นี้" แทนเงียบ
- login throttle 5 ครั้ง/นาที
- ปรับ JOB_CAP ตามสเปก (ขั้น 1 = 40, ขั้น 2 = 50) — **ต้องถามก่อน** เพราะกระทบตัวละครที่ Job เกิน 40 อยู่แล้ว

**M2 Region 2 Verdant Wilds (Lv20–45):**
- เมือง Verdant Haven (inn, shop, smith, storage, teleport, quest)
- field 5 แผนที่ (deep_forest, mushroom_hollow, spirit_grove, beast_valley + 1 ใหม่), dungeon ancient_tree
- มอน 12–14 ชนิด (plant/beast/spirit/insect โทนต่างจาก Heartland) + elite 3 + field boss 1 + dungeon boss 1
- Main Story บท 2 (Ancient Runes) 6 เควส + side 6 + daily 1
- อุปกรณ์ Tier 2 ครบ (Lv20–40) ~20 ชิ้น + วัตถุดิบ + สูตรคราฟต์ 6
- BGM/ambient ของ Region, portal เชื่อมจาก moonlit_creek/old_mine
- test: world + aq (เส้นทางข้าม Region) + art
