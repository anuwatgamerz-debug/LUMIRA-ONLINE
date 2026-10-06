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
| `public/assets/world/buildings/` | อาคารหมู่บ้าน/เมืองหลวง 28 แบบ (`bld_*`) | `tools/art/world_assets.py` | LUMIRA original |
| `public/assets/world/trees/` | ต้นโอ๊ก ต้นสน ต้นสนหิมะ (`tree_*`) | `tools/art/world_assets.py` | LUMIRA original |
| `public/assets/world/vegetation/` | หญ้า ดอกไม้ พุ่มไม้ เฟิร์น เห็ด กก สมุนไพร กระบองเพชร (`veg_*`) | `tools/art/world_assets.py` | LUMIRA original |
| `public/assets/world/rocks/` | หิน แร่ ผลึก (`rock_*`) | `tools/art/world_assets.py` | LUMIRA original |
| `public/assets/world/props/` | พร็อพเมือง/ป่า 29 แบบ (`prop_*`) | `tools/art/world_assets.py` | LUMIRA original |
| `public/assets/world/world.json` | ขนาด จุดยึด กล่องโปร่งใสของต้นไม้ | `tools/art/world_assets.py` | LUMIRA original |
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

พื้น (หญ้า ดิน ทางหิน สะพานไม้ น้ำ/แม่น้ำ) วาดตอนรันใน `public/game.js` (`genGround`) ด้วยสีจาก palette เดียวกัน ไม่มีไฟล์ภาพ

## 2. ภาพเดิมที่ยังใช้อยู่ (บุคคลที่สาม)

| โฟลเดอร์ / ไฟล์ | ใช้ทำอะไร | ผู้สร้าง | สัญญาอนุญาต | หมายเหตุ |
|---|---|---|---|---|
| `public/assets/h_*.png`, `n_*.png`, บาง `m_*.png` | ตัวละครสำรอง (ใช้เมื่อชุด LUMIRA ยังโหลดไม่เสร็จ), มอนสเตอร์บางตัว | Liberated Pixel Cup (LPC) contributors ผ่าน Universal LPC Spritesheet Generator | CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 | รายชื่อผู้สร้างครบใน `public/credits.html` |
| `public/assets/b_*.png`, `p_*.png`, `m_*.png` | อาคาร/พร็อพสำรอง, มอนสเตอร์ | KayKit โดย Kay Lousberg (kaylousberg.com) | CC0 | เรนเดอร์เป็น pixel art |
| `public/assets/ui/`, `public/assets/import/` | HUD, ไอคอนสกิล/ไอเทม/เมนู | LUMIRA UI sheets ของโปรเจกต์ | LUMIRA original | ตัดด้วย `tools/build_ui_assets.py` |
| `public/assets/audio/` | เสียง | ดู `docs/AUDIO_LICENSES.md` | — | — |

## 3. สิ่งที่ยังต้องทำ

- มอนสเตอร์ยังใช้สไปรต์เดิม (LPC/KayKit/procedural) ยังไม่ได้ทำใหม่ตาม Art Bible (จะทำในชุด Region ถัดไป)
- เมื่อเพิ่มภาพจากแหล่งภายนอก ต้องเพิ่มแถวในตารางที่ 2 พร้อมลิงก์ที่มา ผู้สร้าง และสัญญาอนุญาตก่อน commit
