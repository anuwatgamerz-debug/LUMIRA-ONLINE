# LUMIRA ONLINE — CONTENT MATRIX

สร้างจาก data จริงใน `content/` (สคริปต์นับอัตโนมัติ) · อัปเดต 2026-10-07 · หลัง Milestone 1 + 2

**Status:** PLANNED = มีชื่อ/Lv ใน `content/world.js` แต่ยังไม่มีไฟล์แผนที่ · IMPLEMENTING = กำลังสร้าง · PLAYABLE = เข้าเล่นได้ · TESTED = เล่นได้ + มี automated test · COMPLETE = ครบตามเกณฑ์ Region (เมือง, field 4–7, dungeon 1–2, elite, field boss + dungeon boss, story, side quest, resource, equipment tier, BGM เฉพาะ)

## สรุปต่อ Region

| Region | Lv | Maps (data) | เปิดแล้ว | เมือง | Field | Dungeon | Status |
|---|---|---|---|---|---|---|---|
| 1 Heartland | 1–33 | 14 | 12 | 2 | 5 (+2 planned) | 5 | TESTED (dungeon ใช้ BGM ร่วมกัน) |
| 2 Verdant Wilds | 20–45 | 7 | 7 | 1 | 5 | 1 | TESTED (M2 เสร็จ) |
| 3 Ashen Frontier | 40–65 | 5 | 0 | 1 | 2 | 2 | PLANNED (field น้อยกว่าเกณฑ์ 4) |
| 4 Azure Coast | 55–80 | 5 | 0 | 1 | 3 | 1 | PLANNED (field น้อยกว่าเกณฑ์) |
| 5 Sandsea | 70–95 | 6 | 0 | 1 | 3 | 2 | PLANNED |
| 6 Frostland | 90–115 | 6 | 0 | 1 | 3 | 2 | PLANNED |
| 7 Arcane Highlands | 105–130 | 5 | 0 | 1 | 2 | 2 | PLANNED |
| 8 Void Frontier | 125–150 | 5 | 0 | 1 | 2 | 2 | PLANNED |
| **รวม** | | **53** | **19** | 9 | 25 | 17 | |

> หมายเหตุ: Region 3–8 ใน data ปัจจุบันมี field 2–3 แผนที่ ต่ำกว่าเกณฑ์ "4–7 Field Maps" ต้องเพิ่มแผนที่ใน `content/world.js` ตอนทำแต่ละ Milestone

## รายแผนที่

คอลัมน์ Monster = จำนวนชนิดมอนธรรมดาที่ spawn · Elite = ชนิด elite · NPC/Quest/Shop = จำนวนที่อยู่บนแผนที่ (Quest = เควสที่ NPC บนแผนที่นี้เป็นผู้ให้) · Equipment = tier ของที่หาได้

| Region | Map | Kind | Level | Monster | Elite | Boss | NPC | Quest | Shop | Dungeon | Equipment | BGM | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Heartland | lumira | village | 1–10 | 1 | 0 | - | 17 | 8 | 4 | - | T1 (Lv1-30) | bgm_lumira_village | TESTED |
| 1 Heartland | solkara | capital | 1–30 | 0 | 0 | - | 29 | 10 | 6 | - | T1 (Lv1-30) | bgm_elyndra_capital | TESTED |
| 1 Heartland | beginner_meadow | field | 1–8 | 5 | 0 | - | 1 | 1 | 0 | - | T1 (Lv1-30) | bgm_beginner_meadow | TESTED |
| 1 Heartland | greenwood | field | 8–18 | 9 | 1 | เอลเดอร์ ธอร์นวูด | 4 | 4 | 1 | - | T1 (Lv1-30) | bgm_greenwood | TESTED |
| 1 Heartland | moonlit_creek | field | 14–24 | 7 | 0 | - | 1 | 2 | 0 | - | T1 (Lv1-30) | bgm_moonlit_creek | TESTED |
| 1 Heartland | old_mine | dungeon | 20–30 | 8 | 0 | ไอรอนจอว์ ทรราชเหมือง | 2 | 3 | 1 | ✔ | T1 (Lv1-30) | bgm_old_mine | TESTED |
| 1 Heartland | plains | field | 1–10 | 4 | 0 | ราชาเจลลอป | 0 | 0 | 0 | - | T1 (Lv1-30) | bgm_golden_fields | TESTED |
| 1 Heartland | woods | field | 5–15 | 4 | 0 | - | 0 | 0 | 0 | - | T1 (Lv1-30) | bgm_oasis_woods | TESTED |
| 1 Heartland | slime_burrow | dungeon | 4–10 | 4 | 0 | ราชินีเจลลี่ | 0 | 0 | 0 | ✔ | T1 (Lv1-30) | bgm_old_mine | TESTED |
| 1 Heartland | spider_nest | dungeon | 13–20 | 4 | 0 | แม่แมงมุมกรีนวูด | 0 | 0 | 0 | ✔ | T1 (Lv1-30) | bgm_old_mine | TESTED |
| 1 Heartland | moon_crypt | dungeon | 19–26 | 4 | 0 | มูนแฟง หมาป่าจันทร์ | 0 | 0 | 0 | ✔ | T1 (Lv1-30) | bgm_old_mine | TESTED |
| 1 Heartland | iron_labyrinth | dungeon | 27–33 | 4 | 0 | ราชาเขาวงกต | 0 | 0 | 0 | ✔ | T1 (Lv1-30) | bgm_old_mine | TESTED |
| 1 Heartland | ancient_farm | field | 10–20 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 1 Heartland | bandit_road | field | 18–25 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 2 Verdant Wilds | verdant_haven | forest_city | 20–45 | 0 | 0 | - | 15 | 12 | 4 | - | T2 (Lv30-45) | bgm_verdant_town | TESTED |
| 2 Verdant Wilds | deep_forest | field | 22–30 | 6 | 1 | - | 2 | 1 | 1 | - | T2 (Lv30-45) | bgm_verdant_field | TESTED |
| 2 Verdant Wilds | mushroom_hollow | field | 26–34 | 5 | 1 | - | 0 | 0 | 0 | - | T2 (Lv30-45) | bgm_mushroom_hollow | TESTED |
| 2 Verdant Wilds | spirit_grove | field | 30–38 | 3 | 0 | ผู้เฝ้าสวนวิญญาณ | 0 | 0 | 0 | - | T2 (Lv30-45) | bgm_spirit_grove | TESTED |
| 2 Verdant Wilds | ancient_tree | dungeon | 38–45 | 4 | 0 | รอทฮาร์ท หัวใจไม้เน่า | 0 | 0 | 0 | ✔ | T2 (Lv30-45) | bgm_verdant_dungeon | TESTED |
| 2 Verdant Wilds | beast_valley | field | 32–42 | 5 | 1 | กริมพอว์ ราชาหมีหุบเขา | 1 | 1 | 0 | - | T2 (Lv30-45) | bgm_verdant_field | TESTED |
| 2 Verdant Wilds | thornmire | field | 38–45 | 5 | 1 | - | 0 | 0 | 0 | - | T2 (Lv30-45) | bgm_thornmire | TESTED |
| 3 Ashen Frontier | emberhold | mining_city | 40–65 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 3 Ashen Frontier | ash_plains | field | 40–48 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 3 Ashen Frontier | volcanic_road | field | 46–54 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 3 Ashen Frontier | fire_cavern | dungeon | 52–60 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 3 Ashen Frontier | ruined_fortress | dungeon | 58–65 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 4 Azure Coast | azure_port | port | 55–80 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 4 Azure Coast | coastal_road | field | 55–62 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 4 Azure Coast | coral_beach | field | 60–68 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 4 Azure Coast | sunken_temple | dungeon | 68–76 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 4 Azure Coast | pirate_cove | field | 72–80 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 5 Sandsea | solara | desert_city | 70–95 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 5 Sandsea | great_desert | field | 70–78 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 5 Sandsea | oasis | field | 76–84 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 5 Sandsea | ancient_pyramid | dungeon | 84–92 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 5 Sandsea | scorpion_canyon | field | 80–88 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 5 Sandsea | lost_ruins | dungeon | 88–95 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 6 Frostland | frostheim | snow_city | 90–115 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 6 Frostland | frozen_forest | field | 90–98 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 6 Frostland | ice_lake | field | 96–104 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 6 Frostland | snowfield | field | 100–108 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 6 Frostland | crystal_cave | dungeon | 104–112 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 6 Frostland | frozen_citadel | dungeon | 108–115 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 7 Arcane Highlands | astralis | magic_city | 105–130 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 7 Arcane Highlands | rune_valley | field | 105–114 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 7 Arcane Highlands | floating_ruins | field | 112–120 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 7 Arcane Highlands | mage_tower | dungeon | 118–126 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 7 Arcane Highlands | mana_rift | dungeon | 122–130 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 8 Void Frontier | last_haven | endgame_city | 125–150 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 8 Void Frontier | void_plains | field | 125–134 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 8 Void Frontier | dark_citadel | dungeon | 132–140 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 8 Void Frontier | broken_realm | field | 138–146 | - | - | - | - | - | - | - | - | (กำหนดชื่อไว้แล้ว) | PLANNED |
| 8 Void Frontier | abyss_gate | dungeon | 144–150 | - | - | - | - | - | - | ✔ | - | (กำหนดชื่อไว้แล้ว) | PLANNED |

## Content รวม (ทั้งเกม)

| หมวด | ปัจจุบัน | เป้าหมาย Lv150 |
|---|---|---|
| มอนสเตอร์ธรรมดา | 75 (Lv1–44) | 100+ |
| Elite | 5 (Heartland 1 · Verdant 4) | 2–4 ต่อ Region |
| Boss | 10 (Lv10–45) — field 4 / dungeon 6 | ≥1 field + ≥1 dungeon ต่อ Region + World Boss |
| อาชีพเล่นได้ | 7 (นักผจญภัย + ขั้น 1 ×6) · Job cap ขั้น 1 = 40 | 31 |
| สกิล | 24 (พื้นฐาน 6 + ขั้น 1 ×18) | + ขั้น 2 (4–6/อาชีพ ×12) + ขั้น 3 (3–5 ×12) |
| อุปกรณ์ | 122 ชิ้น, Tier 1–2 (Lv ≤45) + modifier crit/aspd/flee | Tier 1–8 ถึง Lv150 |
| Rarity ที่มีจริง | ธรรมดา 105 · ไม่ธรรมดา 21 · หายาก 19 · มหากาพย์ 5 · ตำนาน 0 | Legendary จาก Boss/Craft/Event |
| เควส | 42 (main 15 · class 6 · daily 5 · side 16) | main ต่อทุก Region + weekly |
| สูตรคราฟต์ | 27 | ต่อ Region |
| ร้านค้า | 14 | ต่อเมือง |
