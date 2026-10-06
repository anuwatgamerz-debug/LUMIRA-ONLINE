# LUMIRA ONLINE — Asset Licenses (ภาพ)

เอกสารนี้บันทึกที่มาและสัญญาอนุญาตของภาพทุกชุดในเกม (เสียงอยู่ใน `docs/AUDIO_LICENSES.md`)
กติกา: ห้ามใช้ภาพ/ไอคอน/โลโก้/ตัวละครจาก Ragnarok Online หรือเกมอื่นที่มีลิขสิทธิ์ ห้ามใช้ asset ที่ rip มาจากเกม
ใช้ได้เฉพาะงานที่ทำขึ้นเองสำหรับ LUMIRA, CC0 / Public Domain, หรือสัญญาอนุญาตเปิดที่ระบุผู้สร้างไว้ครบ
`tests/art.test.js` ตรวจว่าทุกโฟลเดอร์ภาพมีรายการในเอกสารนี้

## 1. LUMIRA Art Set (Region 1) — งานต้นฉบับของโปรเจกต์

ภาพทุกชิ้นในชุดนี้ถูก **สร้างด้วยโค้ด** จากสคริปต์ใน `tools/art/` (ไม่ได้ดาวน์โหลด ไม่ได้ trace จากเกมอื่น)
ใช้ master palette, ทิศแสง และสเกลตาม `docs/LUMIRA_ART_BIBLE.md` · สร้างใหม่ได้ทุกเมื่อด้วยคำสั่งด้านล่าง
สัญญาอนุญาต: เป็นของโปรเจกต์ LUMIRA ONLINE (ใช้สัญญาอนุญาตเดียวกับซอร์สโค้ดของโปรเจกต์)

| โฟลเดอร์ | เนื้อหา | สร้างโดย | สัญญาอนุญาต |
|---|---|---|---|
| `public/assets/characters/base/` | ร่างกายพื้นฐานชาย/หญิง (`chr_base_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/characters/hair/` | ทรงผม 6 แบบ (`chr_hair_*`, สีผมเปลี่ยนตอนรัน) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/characters/classes/` | ชุดอาชีพ Adventurer + 6 อาชีพแรก, ของติดหลัง (`chr_class_*`, `chr_back_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/npcs/` | ชุด NPC 15 แบบ ชาย/หญิง (`npc_outfit_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/equipment/armor/` | เกราะ tunic/leather/chain/plate/robe (`eq_armor_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/equipment/weapons/` | อาวุธ 11 แบบ (`eq_weapon_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/equipment/shields/` | โล่ round/kite (`eq_shield_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/equipment/headgear/` | หมวก 21 แบบ 4 ทิศ (`eq_head_*`) | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/characters/chars.json` | ข้อมูลเลเยอร์/เฟรม/ลำดับการวาด | `tools/art/build_characters.py` | LUMIRA original |
| `public/assets/world/buildings/` | อาคารหมู่บ้าน/เมืองหลวง (`bld_*`) ประกอบจากชิ้นส่วน LPC | `tools/art/lpc/build_world.py` | LPC (ดูหัวข้อ 1.5) |
| `public/assets/world/trees/` | ต้นไม้ (`tree_*`) จาก [LPC] Trees / Plant Repack | `tools/art/lpc/build_world.py` | LPC (ดูหัวข้อ 1.5) |
| `public/assets/world/vegetation/` | หญ้า พุ่มไม้ ดอกไม้ ฯลฯ (`veg_*`) จาก LPC | `tools/art/lpc/build_world.py` | LPC (ดูหัวข้อ 1.5) |
| `public/assets/world/rocks/` | หิน แร่ (`rock_*`) จาก [LPC] Rocks; `rock_crystal_01` เป็นงาน LUMIRA | `tools/art/lpc/build_world.py` | LPC (ดูหัวข้อ 1.5) |
| `public/assets/world/props/` | พร็อพ (`prop_*`) จาก LPC | `tools/art/lpc/build_world.py` | LPC (ดูหัวข้อ 1.5) |
| `public/assets/world/world.json` | ขนาด จุดยึด กล่องโปร่งใสของต้นไม้ (`src: "lpc"` = ภาพจาก LPC) | `tools/art/lpc/build_world.py` | ข้อมูลของโปรเจกต์ |
| `public/assets/chr_hd/base/` | HD ร่างกายพื้นฐานชาย/หญิง (ต้นแบบ) | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/face/` | HD หน้า (ตา คิ้ว ปาก แก้ม) | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/hair/` | HD ทรงผม 6 แบบ | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/armor/` | HD เกราะ/เสื้อผ้า | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/classes/` | HD Adventurer / Vanguard / Ranger / Arcanist + ของติดหลัง | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/npcs/` | HD ชุด Guard / Merchant / Blacksmith | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/weapons/` | HD อาวุธ 11 แบบ (แยกเพศ) | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/shields/` | HD โล่ round / kite | `tools/art/build_characters_hd.py` | LUMIRA original |
| `public/assets/chr_hd/headgear/` | HD หมวก 12 แบบ 4 ทิศ | `tools/art/build_characters_hd.py` | LUMIRA original |
| `docs/prototype/` | ภาพตรวจงาน HD prototype | `tools/art/hd_lineup.py` | LUMIRA original |

สร้างใหม่:

```
python3 tools/art/build_characters.py   # ตัวละคร NPC อุปกรณ์ (~2.5 วินาที)
python3 tools/art/world_assets.py       # อาคาร ธรรมชาติ พร็อพ
python3 tools/art/build_characters_hd.py  # ตัวละคร HD (ต้นแบบ)
```

พื้นหญ้า/ดิน/ทราย/ถ้ำ ใช้ลาย LPC จาก `public/assets/ground_lpc.png` (หัวข้อ 1.5); ทางหิน สะพานไม้ น้ำ วาดตอนรันใน `public/game.js` (`genGround`)

## 1.5 LPC Art Pass (ต.ค. 2026) — ภาพจาก OpenGameArt.org (สัญญาอนุญาตเปิด ต้องให้เครดิต)

ภาพที่ผู้เล่นเห็นตอนนี้ (ตัวละคร NPC อาคาร ต้นไม้ หิน พร็อพ พื้น และมอนสเตอร์ส่วนใหญ่) มาจากงาน Liberated Pixel Cup (LPC)
ภาพถูกตัด ประกอบ และเปลี่ยนสีสำหรับ LUMIRA (เป็นงานดัดแปลง จึงใช้สัญญาอนุญาตเดิมของต้นฉบับ — CC-BY-SA ต้องแจกต่อด้วยสัญญาเดียวกัน)
ไฟล์เครดิตต้นฉบับครบอยู่ใน `docs/credits/lpc/` (ห้ามลบ) และสรุปไว้ใน `public/credits.html`
สคริปต์ที่ใช้สร้าง: `tools/art/lpc/` (อ้างอิง path ไฟล์ต้นฉบับในเครื่องที่สร้าง)

| โฟลเดอร์ / ไฟล์ | ที่มา (OpenGameArt) | ผู้สร้าง | สัญญาอนุญาต |
|---|---|---|---|
| `public/assets/chr_lpc/` | Universal LPC Spritesheet Character Generator (github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) | ดูรายไฟล์ใน `docs/credits/lpc/LPC_CHARACTERS_CREDITS.csv` | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 (ตามไฟล์) |
| `public/assets/world/` (อาคาร หลังคา ผนัง หน้าต่าง ประตู) | [LPC] City outside, [LPC] Forest tiles — Reemax; LPC Tile Atlas / Atlas2 — adrix89 (รวบรวม); [LPC] Walls, [LPC] Thatched-roof Cottage, [LPC] Medieval Village Decorations — bluecarrot16 และคณะ; [LPC] Adobe Building Set — Sharm / William.Thompsonj; LPC submission — Daniel Eddeland (daneeklu) | ดูไฟล์ใน `docs/credits/lpc/` | CC-BY-SA 3.0 / GPL 3.0 (Medieval Decorations: CC-BY-SA 3.0/4.0; Adobe: CC-BY/OGA-BY) |
| `public/assets/world/trees/`, `vegetation/`, `rocks/` | [LPC] Trees, [LPC] Rocks — bluecarrot16 และคณะ; [LPC] Plant Repack — William.Thompsonj (รวบรวม) | `CREDITS-trees.txt`, `CREDITS-rocks.txt` | CC-BY-SA 3.0 (Rocks: CC-BY-SA 3.0/4.0) |
| `public/assets/ground_lpc.png` (พื้นหญ้า ดิน ทราย ถ้ำ) | [LPC] Terrain Repack — William.Thompsonj (รวบรวม) | `terrain-repack-Attribution.txt` | CC-BY-SA 3.0 / GPL 3.0 |
| `public/assets/m_lpc_slime/flower/snake/bat/ghost/bee.png` | [LPC] Monsters | Charles Sanchez (CharlesGabriel), bagzie, bluecarrot16 | CC-BY-SA 3.0 / GPL 3.0 |
| `public/assets/m_lpc_goblin.png`, `m_lpc_golem.png` | [LPC] Goblin, [LPC] Golem | Stephen "Redshrike" Challener (ศิลปิน), William.Thompsonj (contributor) | CC-BY 3.0 / OGA-BY 3.0 / GPL |
| `public/assets/m_lpc_imp.png`, `m_lpc_wolf.png` | [LPC] Imp, [LPC] Wolf Animation | William.Thompsonj (ฐานจากงาน LPC ของ Redshrike) | CC-BY 3.0 / OGA-BY 3.0 / GPL |
| `public/assets/m_lpc_beetle.png` | LPC beetle (เปลี่ยนสีจากเทาเป็นน้ำตาล) | Stephen Challener (Redshrike), hosted by OpenGameArt.org | CC-BY 3.0 / CC-BY-SA 3.0 / OGA-BY 3.0 |

ลิงก์: https://opengameart.org/content/lpc-monsters · /lpc-goblin · /lpc-golem · /lpc-imp · /lpc-wolf-animation · /lpc-beetle · /lpc-terrain-repack · /lpc-tile-atlas · /lpc-tile-atlas2 · /lpc-forest-tiles · /lpc-city-outside · /lpc-thatched-roof-cottage · /lpc-adobe-building-set · /lpc-medieval-village-decorations · /lpc-walls · /lpc-rocks · /lpc-trees · /lpc-plant-repack

### 1.6 เพิ่มเติม (ต.ค. 2026): มอนสเตอร์ดันเจี้ยน ไอคอนไอเท็ม หน้าล็อกอิน

| ไฟล์ | ที่มา (OpenGameArt) | ผู้สร้าง | สัญญาอนุญาต |
|---|---|---|---|
| `public/assets/m_lpc_skeleton.png` | [LPC] Skeleton | rhimlock | CC-BY-SA 3.0 / GPL 3.0 |
| `public/assets/m_lpc_zombie.png` | [LPC] Zombie | Benjamin K. Smith (BenCreating) สั่งทำโดย castelonia; ฐานจาก Stephen Challener (Redshrike), Johannes Sjölund (wulax) | CC-BY-SA 3.0 / GPL 3.0 |
| `public/assets/m_lpc_spider.png` | [LPC] Spider | William.Thompsonj (ฐานจาก Redshrike) | CC-BY 3.0 / OGA-BY 3.0 / GPL |
| `public/assets/m_lpc_centipede.png` | [LPC] Centipede | FiveBrosStopMosYT (ขอบคุณ bluecarrot16, bzt, Ragnar Random) | CC-BY-SA 3.0/4.0 / OGA-BY 3.0 |
| `public/assets/m_lpc_rat.png`, `m_lpc_mushroom.png`, `m_lpc_bear.png` | [LPC] Bears, Deer, Lions and more | tapatilorenzo; giant rat / walking mushroom ดัดแปลงจากงานของ Sevarihk | CC-BY 4.0 |
| `public/assets/m_lpc_frogman.png` | [LPC] Frogman | Stephen Challener (Redshrike) และ Evert | CC-BY 3.0 / OGA-BY 3.0 |
| `public/assets/m_lpc_minotaur.png` | Minotaur | Jordan Irwin (AntumDeluge) | CC-BY 3.0/4.0 / OGA-BY 3.0 |
| `public/assets/m_lpc_werewolf.png` | Werewolf (LPC) | Stephen Challener (Redshrike), William Thompson (William.Thompsonj), Jordan Irwin (AntumDeluge) | CC-BY-SA 3.0 |
| `public/assets/m_lpc_pumpkin.png` | Pumpkin monster | Tuomo Untinen (Reemax) | CC-BY 3.0/4.0 / CC-BY-SA |
| `public/assets/ui/items_lpc.png` | 496 pixel art icons for medieval/fantasy RPG | Henrique Lazarini (7Soul1) | CC0 |
| `public/assets/ui/login_land.webp`, `login_port.webp` | ภาพหน้าล็อกอิน | เจ้าของเกม LUMIRA ONLINE (ผู้ใช้ส่งมาเอง) | ของโปรเจกต์ |

## 2. ภาพเดิมที่ยังใช้อยู่ (บุคคลที่สาม)

| โฟลเดอร์ / ไฟล์ | ใช้ทำอะไร | ผู้สร้าง | สัญญาอนุญาต | หมายเหตุ |
|---|---|---|---|---|
| `public/assets/h_*.png`, `n_*.png`, บาง `m_*.png` | ตัวละครสำรอง (ใช้เมื่อชุด LUMIRA ยังโหลดไม่เสร็จ), มอนสเตอร์บางตัว | Liberated Pixel Cup (LPC) contributors ผ่าน Universal LPC Spritesheet Generator | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 | รายชื่อผู้สร้างครบใน `public/credits.html` |
| `public/assets/b_*.png`, `p_*.png`, `m_*.png` | อาคาร/พร็อพสำรอง, มอนสเตอร์ | KayKit โดย Kay Lousberg (kaylousberg.com) | CC0 | เรนเดอร์เป็น pixel art |
| `public/assets/ui/`, `public/assets/import/` | HUD, ไอคอนสกิล/ไอเทม/เมนู | LUMIRA UI sheets ของโปรเจกต์ | LUMIRA original | ตัดด้วย `tools/build_ui_assets.py` |
| `public/assets/audio/` | เสียง | ดู `docs/AUDIO_LICENSES.md` | — | — |

## 3. สิ่งที่ยังต้องทำ

- มอนสเตอร์ส่วนใหญ่ใช้ชุด LPC แล้ว (หัวข้อ 1.5); วิสป์/วิญญาณตะเกียง/เป้าซ้อม ยังวาดด้วยโค้ด, โครงกระดูกยังใช้ชีตเดิม
- เมื่อเพิ่มภาพจากแหล่งภายนอก ต้องเพิ่มแถวในตารางที่ 2 พร้อมลิงก์ที่มา ผู้สร้าง และสัญญาอนุญาตก่อน commit
