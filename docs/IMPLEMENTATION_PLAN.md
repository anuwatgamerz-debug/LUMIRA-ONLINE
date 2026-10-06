# LUMIRA ONLINE — Mobile MMORPG Implementation Plan

เป้าหมาย: ปรับ LUMIRA ONLINE เดิมให้เป็น Mobile MMORPG 2D Pixel Fantasy (เล่นได้ทั้งแนวตั้ง/แนวนอน)
โดยใช้รูปแบบ UX/UI ของเกม MMORPG มือถือแบบ classic เป็นแนวทางเท่านั้น — ไม่ใช้ชื่อ โลโก้ ตัวละคร ไอคอน หรือ asset ของเกมอื่น
ใช้ asset เดิมของ LUMIRA (LPC / KayKit, ดู `public/credits.html`) และไอคอน pixel ที่วาดขึ้นเองด้วยโค้ด

กติกา: ไม่ลบระบบเดิม · ไม่เปลี่ยนโครงสร้าง `data/db.json` โดยไม่จำเป็น · server ต้องเปิดได้ · client เดิมต้องเข้าเกมได้
ทุก Phase: ทดสอบ → แก้ error → สรุปไฟล์ → commit

---

## 1. แผนผังระบบปัจจุบัน (ก่อนเริ่ม Phase 1)

| # | ระบบ | ตำแหน่ง |
|---|------|---------|
| 1 | Client | `public/index.html` (DOM + CSS ของ HUD/หน้าต่าง/หน้า login), `public/game.js` (render canvas, input, network) |
| 2 | Server | `server.js` ไฟล์เดียว: HTTP static + WebSocket (`ws`) + game loop 10 tick/วินาที + DB (`data/db.json`) |
| 3 | Map | สร้างด้วยโค้ดใน `server.js` (`buildTown` / `buildPlains` / `buildWoods`: tile, portal, npc, spawn, props) · client วาดพื้นใน `genGround()` / `bakeMap()` ของ `game.js` |
| 4 | Player movement | server: `findPath()` (A*), `stepToward()`, game loop · client: แตะพื้น → `move`, คีย์บอร์ด/จอยสติ๊ก → `move` ทุก 200ms, interpolate ใน `frame()` |
| 5 | Combat | server: `playerAttack()`, `mobAttack()`, `mobDie()`, `gainExp()`, case `attack`/`skill` · client: `onFx()` (ตัวเลขดาเมจ, slash) |
| 6 | NPC | server: `m.npcs` ในแต่ละ map + `npcTalk()` (เควส/ร้าน/ฮีล/วาร์ป/รับซื้อ) · client: วาด NPC + `openDlg()` / `openShop()` |
| 7 | Monster | server: ตาราง `MOBS`, `spawnMob()`, AI ใน game loop (chase / aggro / wander / boss respawn) · client: `drawChar()` + `META.px` |
| 8 | UI | `index.html` (`#hud`, `.win`), `game.js` (`updHud`, `renderBag`, `renderStat`, `drawMinimap`, `renderBigMap`) |
| 9 | Mobile control | `#joy`/`#knob` (จอยสติ๊กแบบตายตัว), `#acts` (ปุ่มโจมตี/Bash/ยา/เก็บ/AUTO), แตะ canvas เพื่อเดิน/เลือกเป้า |

### มีอยู่แล้ว
- Login / สมัคร / สร้างตัวละคร (5 คลาส × 2 เพศ)
- 3 แผนที่ (เมือง, ทุ่ง Lv1-10, ป่า Lv5-15) + portal + NPC วาร์ป
- เดินด้วย A* (แตะพื้น / WASD / จอยสติ๊ก), กล้องตามตัวละครแบบนุ่ม
- โจมตีปกติ, สกิล Bash 1 สกิล, crit/miss, EXP แบ่งตามดาเมจ, เลเวลอัพ, ตาย/ฟื้น
- มอน 7 ชนิด + บอส, aggro, respawn, drop + ownership
- เควสสาย Iris 4 ขั้น, ร้านซื้อ/ขาย, ฮีลฟรี
- กระเป๋า 40 ช่อง, ใส่/ถอดอุปกรณ์ 3 ช่อง (อาวุธ/เสื้อ/หมวก), สเตตัส 6 ค่า
- AUTO แบบง่าย (ตีมอนใกล้สุด + เก็บของ + กินยาที่ HP<35%)
- แชทในแผนที่ + bubble, minimap, world map
- ตัวเลขดาเมจลอย, hit flash, slash, เอฟเฟกต์เลเวลอัพ/ฮีล, ghost ตอนมอนตาย, culling นอกจอ

### ยังไม่มี
- HUD แบบเกมมือถือ (แถบเมนูบน, ปุ่ม More, Settings), responsive scaling, safe area ครบ
- จอยสติ๊กแบบ floating, เดิน 8 ทิศแบบเลี่ยงกำแพง
- Combat wheel, 6 skill slot, cooldown animation, ปุ่ม Target/Interact, ข้อมูลเป้าหมาย (ชื่อ/Lv/HP)
- ระบบสกิลหลายตัว, MATK/MDEF, Move speed stat, Job level, Buff/Debuff
- AUTO ขั้นสูง (auto skill, auto SP potion, ตั้งค่า %)
- ไอคอนเหนือหัว NPC ตามประเภท (! ? $ ⚒ ♥ P), portrait NPC, quest tracker แบบนำทาง/auto navigate
- แชทหลายช่อง (World/Party/Guild/Whisper), ระบบ Party/Guild
- กระเป๋าแบบแท็บตามประเภท, Drop/Split stack UI, ช่องอุปกรณ์ Shield/Accessory×2/Shoes
- แผนที่ Ruins / Dungeon, landmark, beginner protection
- Monster: attack range / aggro range แยกค่า, กันมอนยืนซ้อน
- Object pooling, FPS counter, คุณภาพกราฟิกตามเครื่อง

---

## 2. Phases

### Phase 1 — Mobile HUD + Joystick + Responsive UI
- [x] Responsive scaling (`--ui` scale จากขนาดจอ + ตัวเลือกขนาด UI), รองรับ 360×800 / 390×844 / 430×932 / tablet / desktop, แนวตั้งและแนวนอน
- [x] Safe area (notch / Dynamic Island / Android nav bar) ทุกมุม
- [x] Status panel ซ้ายบน: portrait (แตะเปิดหน้าต่างตัวละคร), ชื่อ, Lv, Job, HP/SP/EXP, แถว buff icon
- [x] แถบเมนูบน: Skills, Equipment, Bag, Gold, Quest, Map, Party, Guild, Auto, Settings, More (จอแคบย้ายปุ่มรองเข้า More)
- [x] ไอคอน pixel วาดเอง (ไม่ใช้ asset เกมอื่น)
- [x] Minimap ขวาบน แตะเพื่อเปิด World Map + ชื่อ map + พิกัด
- [x] Floating joystick 8 ทิศ (touch + mouse), กลับตำแหน่งเมื่อปล่อย, เลี่ยงกำแพง/ไถลตามกำแพง, WASD/ลูกศรยังใช้ได้
- [x] ระยะมองเห็นกว้างขึ้น (zoom ตามขนาดจอ + ตัวเลือก ใกล้/ปกติ/ไกล)
- [x] Chat แบบย่อ 4 บรรทัด + แตะเปิดหน้าต่างแชทใหญ่, ช่อง System/Local/World/Whisper (Party/Guild เปิดใน phase ที่มีระบบ)
- [x] หน้าต่างใหม่: Skills, Equipment, Quest, Party, Guild, Settings, More (placeholder ที่บอกชัดว่ายังไม่เปิด)
- [x] Settings: ขนาด UI, ระยะกล้อง, แบบจอยสติ๊ก, แสดงชื่อ, แสดง FPS, เต็มจอ (บันทึกใน localStorage)

### Phase 2 — Combat + Target + Skill UI ✅
- [x] Combat wheel ขวาล่าง: Attack (1.44× ขนาดสกิล), Skill 1-6 สองวงโค้ง, Potion, Interact/Pick up, Target, AUTO — ปุ่มทำงานตอนแตะลง (รองรับ 2 นิ้วพร้อม joystick)
- [x] ระบบสกิลฝั่ง server (`SKILLS` ใน server.js): Bash, First Aid, Spark Bolt, Focus, Cleave, Twin Strike — melee / ranged / self / area, ปลดล็อกตาม Lv
- [x] Server ตรวจทุกอย่าง: มีชีวิต, เป็นเจ้าของสกิล, cooldown ต่อสกิล + global cooldown, SP, เป้าหมาย/แผนที่, ระยะ, line of sight, attack speed
- [x] Cooldown overlay (conic) + ตัวเลขนับถอยหลัง จากค่าที่ server ส่งมา, สถานะ SP ไม่พอ / นอกระยะ / ยังไม่ปลดล็อก / ช่องว่าง
- [x] Target system: แตะ/คลิกเลือก, ปุ่ม Target และ Tab/Shift+Tab วน (ลำดับ: ตีเราอยู่ > ตีล่าสุด > ใกล้สุด), Esc/✕ ล้าง, ล้างเมื่อมอนตาย/หาย/ไกล/เปลี่ยนแผนที่/ผู้เล่นตาย
- [x] Target panel (รูป / ชื่อ / Lv / HP + % / สถานะ), marker ที่เท้า + ลูกศรเหนือหัว, HP bar มอนแสดงเฉพาะตอนต่อสู้หรือเป็นเป้า
- [x] Hotbar 6 ช่อง บันทึกในตัวละคร (`char.hot`), ตั้งค่าในหน้าต่างสกิล: แตะ → "ตั้งเป็นช่อง 1-6" หรือลากวาง (desktop)
- [x] Floating text: ดาเมจ / CRIT / MISS / +HP / +SP แบบ pool จำกัด 40 ตัวเลข ซ้อนขึ้นไม่ทับกัน, ชื่อสกิลเหนือหัวผู้ใช้
- [x] Keyboard: WASD/ลูกศร, Tab, Space, 1-6, R ยา, F เก็บ/คุย, K สกิล, Esc — ไม่ทำงานขณะพิมพ์แชท
- [x] Automated tests: `npm test` (server 66 + browser 83)

หมายเหตุพฤติกรรม: แตะมอนครั้งแรก = เลือกเป้า, แตะเป้าเดิมซ้ำ = เดินเข้าไปตี (พฤติกรรมเดิม), ปุ่มโจมตีไม่เดินเข้าหาเอง (แจ้ง Out of range)

### Visual Asset Upgrade ✅ (ระหว่าง Phase 2 → 3)
ภาพจาก `public/assets/import/` (11 แผ่น) ถูกตัดเป็น asset รายชิ้นด้วย `tools/build_ui_assets.py` → `public/assets/ui/`
(`ui_icons.webp` atlas 41 ชิ้น, `ui_items.webp` atlas 23 ชิ้น, เฟรม HUD/target/minimap, ปุ่มโจมตี, วงจอยสติ๊ก + `ui.json`)
- ลบตัวอักษร/ตัวเลขตัวอย่างที่ติดมากับภาพ, เจาะช่อง portrait/แผนที่ให้เกมวาดข้อมูลจริงด้านหลัง
- ไม่ใช้ส่วนที่มาจากเกมอื่น ("Poring", "Prontera") และส่วนที่เกมยังไม่มีระบบ (Cash Shop, Premium)
- ชั้น skin อยู่ใน `HUD.applyIcons()` (hud.js): ถ้าโหลด art ไม่ได้ เกมใช้ไอคอน pixel เดิมอัตโนมัติ
- สร้างใหม่หลังเพิ่ม/แก้ภาพ: `pip install pillow numpy scipy && python3 tools/build_ui_assets.py`

## Tests

`npm test` รัน server.js กับฐานข้อมูลชั่วคราว (`LUMIRA_DATA`) — ไม่แตะ `data/db.json`
- `tests/server.test.js` — 23 เทสต์ความเสถียรเดิม + 43 เทสต์ combat authority ของ Phase 2
- `tests/ui.test.js` — Responsive 7 ขนาดจอ, Phase 1 HUD/joystick/chat, Phase 2 touch/desktop (ต้องมี Playwright; ถ้าไม่มีจะข้าม)
- `npm run test:server` / `npm run test:ui`, `UI_ONLY=phase2Mobile npm run test:ui` เพื่อรันส่วนเดียว

### Phase 3 — Monster + AUTO combat
- เพิ่มค่า attack range / aggro range / move speed ต่อมอน, spawn radius, respawn timer ต่อจุด, กันยืนซ้อน
- Beginner protection Lv1-5 (มอนไม่ตีก่อน + buff icon)
- AUTO: หาเป้า → เดิน → ตี → ใช้สกิลตาม cooldown → เก็บของ → หาตัวถัดไป
- Auto potion HP/SP ตาม % ที่ตั้ง, Auto skill configuration

### Phase 4 — NPC + Quest + Auto Navigation
- ไอคอนเหนือหัว NPC ตามประเภท (! ? $ ⚒ ♥ P), portrait ในกล่องสนทนา, interaction range
- Quest tracker: แตะเพื่อแสดงลูกศรนำทาง + highlight เป้าหมาย, Auto Navigate ข้าม map
- โครงเควสแบบ data-driven (Main/Side) ต่อจากเควส Iris เดิม

### Phase 5 — Inventory + Equipment
- กระเป๋า grid แท็บ Equipment / Consumable / Material / Quest / Misc
- Use / Equip / Unequip / Drop / Split stack, แสดงจำนวน
- ช่องอุปกรณ์ Weapon / Head / Armor / Shield / Accessory×2 / Shoes (ช่องเดิม wpn/arm/head ใช้ต่อได้) + ไอเทมใหม่
- หน้าต่างตัวละครเต็ม: ATK / DEF / MATK / MDEF / Crit / Move speed

### Phase 6 — Map + Minimap + World
- เส้นทาง Town → Beginner Field → Forest → Ruins → Dungeon (เพิ่ม Ruins/Dungeon)
- ถนน บ้าน landmark quest area ในแต่ละ map, เมืองเริ่มต้นปลอดภัย
- Minimap: party member, quest target, monster สำคัญ, NPC แยกสี

### Phase 7 — Effects + Animation + Optimization
- Heal number, skill effect, death effect ปรับให้ไม่บังจอ
- Object pooling (fx), จำกัดจำนวน effect, ปรับคุณภาพอัตโนมัติตาม FPS
- Lazy load sprite ตาม map, texture optimization (webp), FPS 30-60 บนมือถือ
