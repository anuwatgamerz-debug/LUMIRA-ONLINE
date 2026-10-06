# LUMIRA ONLINE — Audio Asset List

สร้างอัตโนมัติจาก `public/audio-registry.js` (`node tools/gen_audio_docs.js`) — อย่าแก้ไฟล์นี้ด้วยมือ

สถานะ: **placeholder** = เสียงสังเคราะห์ด้วย Web Audio (สร้างจากโค้ดในโปรเจกต์ ไม่มีลิขสิทธิ์ของผู้อื่น) · **final** = มีไฟล์จริงแล้ว · **missing** = ยังไม่มีทั้งไฟล์และ placeholder (ตอนนี้ไม่มีรายการไหนอยู่ในสถานะนี้)

## วิธีใส่ไฟล์เสียงจริง

1. วางไฟล์ใน `public/assets/audio/<โฟลเดอร์ตามตาราง>/` (BGM/ambient: MP3 หรือ AAC/M4A เป็นหลัก + OGG เป็นทางเลือก; SFX: MP3/OGG สั้นๆ ไม่ใช้ WAV ขนาดใหญ่)
2. ใน `public/audio-registry.js` เพิ่ม `file: '<path ใต้ assets/audio>'` (และ `alt: '...ogg'` ถ้ามี) ให้รายการนั้น แล้วเปลี่ยน `status: 'final'`
3. ไม่ต้องแก้ gameplay — ถ้าไฟล์หายหรือเล่นไม่ได้ ระบบจะกลับไปใช้ placeholder เอง
4. บันทึกแหล่งที่มา/ไลเซนส์ใน `docs/AUDIO_LICENSES.md` แล้วรัน `node tools/gen_audio_docs.js`

## Music (BGM) (35)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `bgm_lumira_village` | music/town | หมู่บ้านลูมิร่า | 2-3 นาที loop | loop | สงบ สดใส เมืองเริ่มต้น | Highest | placeholder | `assets/audio/music/town/bgm_lumira_village.mp3` |
| `bgm_elyndra_capital` | music/town | นครเอลินดรา | 2-3 นาที loop | loop | ยิ่งใหญ่แต่เป็นมิตร | Highest | placeholder | `assets/audio/music/town/bgm_elyndra_capital.mp3` |
| `bgm_beginner_meadow` | music/field | ทุ่งหญ้าผู้เริ่มต้น | 2 นาที loop | loop | เบา สดชื่น สำรวจโลก | Highest | placeholder | `assets/audio/music/field/bgm_beginner_meadow.mp3` |
| `bgm_greenwood` | music/field | ป่ากรีนวูด | 2-3 นาที loop | loop | ธรรมชาติ + ลึกลับเล็กน้อย | Highest | placeholder | `assets/audio/music/field/bgm_greenwood.mp3` |
| `bgm_moonlit_creek` | music/field | ลำธารแสงจันทร์ | 2-3 นาที loop | loop | สงบ เวทมนตร์ กลางคืน | Highest | placeholder | `assets/audio/music/field/bgm_moonlit_creek.mp3` |
| `bgm_old_mine` | music/dungeon | เหมืองเก่า | 2 นาที loop | loop | มืด ก้อง ตึงเครียดเล็กน้อย | Highest | placeholder | `assets/audio/music/dungeon/bgm_old_mine.mp3` |
| `bgm_golden_fields` | music/field | ทุ่งทรายสีทอง | 2 นาที loop | loop | ผจญภัยกลางแดด | Highest | placeholder | `assets/audio/music/field/bgm_golden_fields.mp3` |
| `bgm_oasis_woods` | music/field | ป่าโอเอซิส | 2 นาที loop | loop | ร่มรื่น | Highest | placeholder | `assets/audio/music/field/bgm_oasis_woods.mp3` |
| `bgm_heartland_field` | music/field | ฟิลด์อื่นใน Heartland | 2 นาที loop | loop | อบอุ่น ผจญภัย | Highest | placeholder | `assets/audio/music/field/bgm_heartland_field.mp3` |
| `bgm_verdant_town` | music/town | town ใน region verdant | 2-3 นาที loop | loop | ป่า เวทมนตร์ ชนเผ่า | Highest | placeholder | `assets/audio/music/town/bgm_verdant_town.mp3` |
| `bgm_verdant_field` | music/field | field ใน region verdant | 2-3 นาที loop | loop | ป่า เวทมนตร์ ชนเผ่า | Highest | placeholder | `assets/audio/music/field/bgm_verdant_field.mp3` |
| `bgm_verdant_dungeon` | music/dungeon | dungeon ใน region verdant | 2-3 นาที loop | loop | ป่า เวทมนตร์ ชนเผ่า | Highest | placeholder | `assets/audio/music/dungeon/bgm_verdant_dungeon.mp3` |
| `bgm_ashen_town` | music/town | town ใน region ashen | 2-3 นาที loop | loop | ไฟ สงคราม ภูเขาไฟ | Highest | placeholder | `assets/audio/music/town/bgm_ashen_town.mp3` |
| `bgm_ashen_field` | music/field | field ใน region ashen | 2-3 นาที loop | loop | ไฟ สงคราม ภูเขาไฟ | Highest | placeholder | `assets/audio/music/field/bgm_ashen_field.mp3` |
| `bgm_ashen_dungeon` | music/dungeon | dungeon ใน region ashen | 2-3 นาที loop | loop | ไฟ สงคราม ภูเขาไฟ | Highest | placeholder | `assets/audio/music/dungeon/bgm_ashen_dungeon.mp3` |
| `bgm_azure_town` | music/town | town ใน region azure | 2-3 นาที loop | loop | ทะเล ผจญภัย โจรสลัด | Highest | placeholder | `assets/audio/music/town/bgm_azure_town.mp3` |
| `bgm_azure_field` | music/field | field ใน region azure | 2-3 นาที loop | loop | ทะเล ผจญภัย โจรสลัด | Highest | placeholder | `assets/audio/music/field/bgm_azure_field.mp3` |
| `bgm_azure_dungeon` | music/dungeon | dungeon ใน region azure | 2-3 นาที loop | loop | ทะเล ผจญภัย โจรสลัด | Highest | placeholder | `assets/audio/music/dungeon/bgm_azure_dungeon.mp3` |
| `bgm_sandsea_town` | music/town | town ใน region sandsea | 2-3 นาที loop | loop | ทะเลทราย อารยธรรมโบราณ | Highest | placeholder | `assets/audio/music/town/bgm_sandsea_town.mp3` |
| `bgm_sandsea_field` | music/field | field ใน region sandsea | 2-3 นาที loop | loop | ทะเลทราย อารยธรรมโบราณ | Highest | placeholder | `assets/audio/music/field/bgm_sandsea_field.mp3` |
| `bgm_sandsea_dungeon` | music/dungeon | dungeon ใน region sandsea | 2-3 นาที loop | loop | ทะเลทราย อารยธรรมโบราณ | Highest | placeholder | `assets/audio/music/dungeon/bgm_sandsea_dungeon.mp3` |
| `bgm_frostland_town` | music/town | town ใน region frostland | 2-3 นาที loop | loop | หนาว ลึกลับ ออร์เคสตรา | Highest | placeholder | `assets/audio/music/town/bgm_frostland_town.mp3` |
| `bgm_frostland_field` | music/field | field ใน region frostland | 2-3 นาที loop | loop | หนาว ลึกลับ ออร์เคสตรา | Highest | placeholder | `assets/audio/music/field/bgm_frostland_field.mp3` |
| `bgm_frostland_dungeon` | music/dungeon | dungeon ใน region frostland | 2-3 นาที loop | loop | หนาว ลึกลับ ออร์เคสตรา | Highest | placeholder | `assets/audio/music/dungeon/bgm_frostland_dungeon.mp3` |
| `bgm_arcane_town` | music/town | town ใน region arcane | 2-3 นาที loop | loop | เวท รูน ดวงดาว | Highest | placeholder | `assets/audio/music/town/bgm_arcane_town.mp3` |
| `bgm_arcane_field` | music/field | field ใน region arcane | 2-3 นาที loop | loop | เวท รูน ดวงดาว | Highest | placeholder | `assets/audio/music/field/bgm_arcane_field.mp3` |
| `bgm_arcane_dungeon` | music/dungeon | dungeon ใน region arcane | 2-3 นาที loop | loop | เวท รูน ดวงดาว | Highest | placeholder | `assets/audio/music/dungeon/bgm_arcane_dungeon.mp3` |
| `bgm_void_town` | music/town | town ใน region void | 2-3 นาที loop | loop | มืด ลางร้าย End Game | Highest | placeholder | `assets/audio/music/town/bgm_void_town.mp3` |
| `bgm_void_field` | music/field | field ใน region void | 2-3 นาที loop | loop | มืด ลางร้าย End Game | Highest | placeholder | `assets/audio/music/field/bgm_void_field.mp3` |
| `bgm_void_dungeon` | music/dungeon | dungeon ใน region void | 2-3 นาที loop | loop | มืด ลางร้าย End Game | Highest | placeholder | `assets/audio/music/dungeon/bgm_void_dungeon.mp3` |
| `bgm_boss_common` | music/boss | บอสทั่วไป | 1.5-2 นาที loop | loop | เข้มข้น เร็ว | Highest | placeholder | `assets/audio/music/boss/bgm_boss_common.mp3` |
| `bgm_boss_thornwood` | music/boss | บอส Elder Thornwood | 1.5-2 นาที loop | loop | ป่าคลั่ง กลองหนัก | Highest | placeholder | `assets/audio/music/boss/bgm_boss_thornwood.mp3` |
| `bgm_boss_ironjaw` | music/boss | บอส Ironjaw | 1.5-2 นาที loop | loop | เครื่องจักร ดุดัน | Highest | placeholder | `assets/audio/music/boss/bgm_boss_ironjaw.mp3` |
| `bgm_event_festival` | music/event | อีเวนต์/เทศกาล (override ชั่วคราว) | 1-2 นาที loop | loop | สนุก | Highest | placeholder | `assets/audio/music/event/bgm_event_festival.mp3` |
| `bgm_event_trial` | music/event | บททดสอบเปลี่ยนอาชีพ (ป้องกันหมู่บ้าน) | 1-2 นาที loop | loop | ฮึกเหิม เร่งเร้า | Highest | placeholder | `assets/audio/music/event/bgm_event_trial.mp3` |

## Ambient (13)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `amb_village` | ambient | หมู่บ้าน |  | loop | นกร้อง ลมอ่อน ผู้คนเบาๆ | Low | placeholder | `assets/audio/ambient/town/amb_village.mp3` |
| `amb_town` | ambient | เมืองหลวง |  | loop | ตลาด ฝูงชน | Low | placeholder | `assets/audio/ambient/town/amb_town.mp3` |
| `amb_meadow` | ambient | ทุ่งหญ้า |  | loop | ลม นก | Low | placeholder | `assets/audio/ambient/forest/amb_meadow.mp3` |
| `amb_forest` | ambient | ป่า |  | loop | ใบไม้ นก ลม | Low | placeholder | `assets/audio/ambient/forest/amb_forest.mp3` |
| `amb_night_creek` | ambient | ลำธารกลางคืน |  | loop | น้ำไหล จิ้งหรีด | Low | placeholder | `assets/audio/ambient/forest/amb_night_creek.mp3` |
| `amb_cave` | ambient | เหมือง/ถ้ำ |  | loop | น้ำหยด หินก้อง ลมเย็น | Low | placeholder | `assets/audio/ambient/cave/amb_cave.mp3` |
| `amb_desert` | ambient | ทะเลทราย |  | loop | ลมร้อน | Low | placeholder | `assets/audio/ambient/desert/amb_desert.mp3` |
| `amb_ocean` | ambient | ชายหาด/ท่าเรือ |  | loop | คลื่น นกนางนวล | Low | placeholder | `assets/audio/ambient/ocean/amb_ocean.mp3` |
| `amb_snow` | ambient | ดินแดนหิมะ |  | loop | ลมหนาว | Low | placeholder | `assets/audio/ambient/snow/amb_snow.mp3` |
| `amb_volcano` | ambient | ภูเขาไฟ |  | loop | ลาวา ไฟปะทุ | Low | placeholder | `assets/audio/ambient/cave/amb_volcano.mp3` |
| `amb_magic` | ambient | ที่ราบสูงอาร์เคน |  | loop | ประกายเวท | Low | placeholder | `assets/audio/ambient/town/amb_magic.mp3` |
| `amb_void` | ambient | แนวหน้าวอยด์ |  | loop | ความว่างเปล่า น่ากลัว | Low | placeholder | `assets/audio/ambient/cave/amb_void.mp3` |
| `amb_dungeon` | ambient | ดันเจี้ยนทั่วไป |  | loop | ก้อง ตึงเครียด | Low | placeholder | `assets/audio/ambient/cave/amb_dungeon.mp3` |

## SFX — ui (13)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `ui_click` | sfx | แตะปุ่ม UI | 0.05s | one-shot | สั้น นุ่ม | Medium | placeholder | `assets/audio/sfx/ui/ui_click.mp3` |
| `ui_open` | sfx | เปิดหน้าต่าง | 0.15s | one-shot | สว่าง | Medium | placeholder | `assets/audio/sfx/ui/ui_open.mp3` |
| `ui_close` | sfx | ปิดหน้าต่าง | 0.12s | one-shot | นุ่ม | Medium | placeholder | `assets/audio/sfx/ui/ui_close.mp3` |
| `ui_confirm` | sfx | ยืนยัน / เลือกตัวเลือก | 0.2s | one-shot | บวก | Medium | placeholder | `assets/audio/sfx/ui/ui_confirm.mp3` |
| `ui_cancel` | sfx | ยกเลิก | 0.18s | one-shot | ลง | Medium | placeholder | `assets/audio/sfx/ui/ui_cancel.mp3` |
| `ui_error` | sfx | ทำไม่ได้ / SP ไม่พอ / นอกระยะ | 0.25s | one-shot | เตือนเบาๆ | Medium | placeholder | `assets/audio/sfx/ui/ui_error.mp3` |
| `ui_tab` | sfx | สลับแท็บ | 0.04s | one-shot | คลิกเบา | Medium | placeholder | `assets/audio/sfx/ui/ui_tab.mp3` |
| `ui_hover` | sfx | ชี้ปุ่ม (desktop) | 0.03s | one-shot | แผ่ว | Low | placeholder | `assets/audio/sfx/ui/ui_hover.mp3` |
| `inventory_open` | sfx | เปิดกระเป๋า | 0.15s | one-shot | ผ้า/หนัง | Medium | placeholder | `assets/audio/sfx/ui/inventory_open.mp3` |
| `equip` | sfx | สวมอุปกรณ์ | 0.18s | one-shot | โลหะกระทบ | Medium | placeholder | `assets/audio/sfx/ui/equip.mp3` |
| `unequip` | sfx | ถอดอุปกรณ์ | 0.12s | one-shot | ถอด | Medium | placeholder | `assets/audio/sfx/ui/unequip.mp3` |
| `buy` | sfx | ซื้อของ | 0.15s | one-shot | เงินออก | Medium | placeholder | `assets/audio/sfx/ui/buy.mp3` |
| `sell` | sfx | ขายของ | 0.15s | one-shot | เงินเข้า | Medium | placeholder | `assets/audio/sfx/ui/sell.mp3` |

## SFX — items (6)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `coin` | sfx | ได้รับ/ใช้ Zeny | 0.2s | one-shot | กรุ๊งกริ๊ง | Medium | placeholder | `assets/audio/sfx/items/coin.mp3` |
| `pickup_normal` | sfx | เก็บไอเทมธรรมดา | 0.1s | one-shot | ป๊อบ | Medium | placeholder | `assets/audio/sfx/items/pickup_normal.mp3` |
| `pickup_coin` | sfx | เก็บเงิน | 0.15s | one-shot | เหรียญ | Medium | placeholder | `assets/audio/sfx/items/pickup_coin.mp3` |
| `pickup_rare` | sfx | เก็บของ Rare | 0.3s | one-shot | ประกาย | High | placeholder | `assets/audio/sfx/items/pickup_rare.mp3` |
| `pickup_epic` | sfx | เก็บของ Epic | 0.6s | one-shot | ตื่นเต้น | Highest | placeholder | `assets/audio/sfx/items/pickup_epic.mp3` |
| `pickup_legendary` | sfx | เก็บของ Legendary | 1.2s | one-shot | อลังการ | Highest | placeholder | `assets/audio/sfx/items/pickup_legendary.mp3` |

## SFX — quests (5)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `quest_available` | sfx | NPC มีเควสใหม่ (เข้าแผนที่) | 0.25s | one-shot | ชวนสงสัย | Medium | placeholder | `assets/audio/sfx/quests/quest_available.mp3` |
| `quest_accept` | sfx | รับเควส | 0.35s | one-shot | เริ่มต้นผจญภัย | High | placeholder | `assets/audio/sfx/quests/quest_accept.mp3` |
| `quest_progress` | sfx | ความคืบหน้าเควส | 0.2s | one-shot | ติ๊กเบาๆ | Medium | placeholder | `assets/audio/sfx/quests/quest_progress.mp3` |
| `quest_complete` | sfx | เควสสำเร็จ | 1.0s | one-shot | ฉลอง เด่นแต่ไม่ตกใจ | Highest | placeholder | `assets/audio/sfx/quests/quest_complete.mp3` |
| `quest_reward` | sfx | รับรางวัลเควส | 0.35s | one-shot | วิ้ง | High | placeholder | `assets/audio/sfx/quests/quest_reward.mp3` |

## SFX — player (14)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `level_up` | sfx | เลเวลอัพ | 1.2s | one-shot | ยินดี ฮึกเหิม | Highest | placeholder | `assets/audio/sfx/player/level_up.mp3` |
| `class_change` | sfx | เปลี่ยนอาชีพ (พิเศษกว่าเลเวลอัพ) | 2.0s | one-shot | พิธีศักดิ์สิทธิ์ ยิ่งใหญ่ | Highest | placeholder | `assets/audio/sfx/player/class_change.mp3` |
| `job_level` | sfx | Job Level up | 0.35s | one-shot | สดใส | High | placeholder | `assets/audio/sfx/player/job_level.mp3` |
| `damage_taken` | sfx | ผู้เล่นโดนตี | 0.1s | one-shot | อุ๊ก | High | placeholder | `assets/audio/sfx/player/damage_taken.mp3` |
| `player_death` | sfx | ผู้เล่นหมดสติ | 1.4s | one-shot | เศร้า | Highest | placeholder | `assets/audio/sfx/player/player_death.mp3` |
| `respawn` | sfx | ฟื้นที่จุดเซฟ | 0.5s | one-shot | ความหวัง | High | placeholder | `assets/audio/sfx/player/respawn.mp3` |
| `footstep_grass` | sfx | เสียงเท้าบนพื้น grass | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_grass.mp3` |
| `footstep_stone` | sfx | เสียงเท้าบนพื้น stone | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_stone.mp3` |
| `footstep_wood` | sfx | เสียงเท้าบนพื้น wood | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_wood.mp3` |
| `footstep_sand` | sfx | เสียงเท้าบนพื้น sand | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_sand.mp3` |
| `footstep_dirt` | sfx | เสียงเท้าบนพื้น dirt | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_dirt.mp3` |
| `footstep_snow` | sfx | เสียงเท้าบนพื้น snow | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_snow.mp3` |
| `footstep_water` | sfx | เสียงเท้าบนพื้น water | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_water.mp3` |
| `footstep_cave` | sfx | เสียงเท้าบนพื้น cave | 0.07s | one-shot | เบากว่าเสียงต่อสู้ | Low | placeholder | `assets/audio/sfx/player/footstep_cave.mp3` |

## SFX — weapons (13)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `sword_swing` | sfx | เหวี่ยงดาบ | 0.13s | one-shot | วูบ | Medium | placeholder | `assets/audio/sfx/weapons/sword_swing.mp3` |
| `sword_hit` | sfx | ดาบโดนเป้า | 0.1s | one-shot | ฉึบ | Medium | placeholder | `assets/audio/sfx/weapons/sword_hit.mp3` |
| `dagger_swing` | sfx | แทงมีด | 0.08s | one-shot | ฉับไว | Medium | placeholder | `assets/audio/sfx/weapons/dagger_swing.mp3` |
| `dagger_hit` | sfx | มีดโดน | 0.07s | one-shot | คม | Medium | placeholder | `assets/audio/sfx/weapons/dagger_hit.mp3` |
| `bow_shoot` | sfx | ยิงธนู | 0.15s | one-shot | ปึ๋ง | Medium | placeholder | `assets/audio/sfx/weapons/bow_shoot.mp3` |
| `arrow_hit` | sfx | ลูกศรโดน | 0.07s | one-shot | ปัก | Medium | placeholder | `assets/audio/sfx/weapons/arrow_hit.mp3` |
| `magic_cast` | sfx | ร่ายเวท (คทา/ไม้เท้า) | 0.2s | one-shot | ระยิบ | Medium | placeholder | `assets/audio/sfx/weapons/magic_cast.mp3` |
| `magic_hit` | sfx | เวทโดน | 0.15s | one-shot | ปุ้ง | Medium | placeholder | `assets/audio/sfx/weapons/magic_hit.mp3` |
| `mace_swing` | sfx | เหวี่ยงกระบอง | 0.16s | one-shot | หนัก | Medium | placeholder | `assets/audio/sfx/weapons/mace_swing.mp3` |
| `heavy_hit` | sfx | กระบอง/ดาบใหญ่โดน | 0.16s | one-shot | ตุ้บ | Medium | placeholder | `assets/audio/sfx/weapons/heavy_hit.mp3` |
| `spear_attack` | sfx | แทงหอก | 0.12s | one-shot | พุ่ง | Medium | placeholder | `assets/audio/sfx/weapons/spear_attack.mp3` |
| `device_shot` | sfx | ปืนกล | 0.12s | one-shot | ปัง (กลไก) | Medium | placeholder | `assets/audio/sfx/weapons/device_shot.mp3` |
| `unarmed_hit` | sfx | หมัด/ไม่มีอาวุธ | 0.08s | one-shot | ตุบ | Medium | placeholder | `assets/audio/sfx/weapons/unarmed_hit.mp3` |

## SFX — combat (5)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `hit_normal` | sfx | ตีโดนทั่วไป | 0.08s | one-shot | กระแทก | Medium | placeholder | `assets/audio/sfx/combat/hit_normal.mp3` |
| `hit_critical` | sfx | คริติคอล (เด่นกว่าตีปกติ) | 0.2s | one-shot | แรง แหลม | High | placeholder | `assets/audio/sfx/combat/hit_critical.mp3` |
| `miss` | sfx | ตีพลาด (ไม่ใช่เสียงโดน) | 0.12s | one-shot | วืด | Medium | placeholder | `assets/audio/sfx/combat/miss.mp3` |
| `block` | sfx | ป้องกัน/กันได้ | 0.12s | one-shot | โลหะ | Medium | placeholder | `assets/audio/sfx/combat/block.mp3` |
| `heal` | sfx | ฟื้น HP (สกิล/ยา/NPC) | 0.35s | one-shot | อบอุ่น | High | placeholder | `assets/audio/sfx/combat/heal.mp3` |

## SFX — skills (19)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `skill_slash_cast` | sfx | สกิลฟัน | 0.2s | one-shot | ดุดัน | High | placeholder | `assets/audio/sfx/skills/skill_slash_cast.mp3` |
| `skill_slash_hit` | sfx | สกิลฟันโดน | 0.15s | one-shot | หนัก | High | placeholder | `assets/audio/sfx/skills/skill_slash_hit.mp3` |
| `skill_fire_cast` | sfx | ร่ายไฟ | 0.3s | one-shot | ลุกโชน | High | placeholder | `assets/audio/sfx/skills/skill_fire_cast.mp3` |
| `skill_fire_hit` | sfx | ไฟระเบิด | 0.35s | one-shot | ตูม | High | placeholder | `assets/audio/sfx/skills/skill_fire_hit.mp3` |
| `skill_ice_cast` | sfx | ร่ายน้ำแข็ง | 0.25s | one-shot | เย็นใส | High | placeholder | `assets/audio/sfx/skills/skill_ice_cast.mp3` |
| `skill_ice_hit` | sfx | น้ำแข็งแตก | 0.15s | one-shot | กร๊อบ | High | placeholder | `assets/audio/sfx/skills/skill_ice_hit.mp3` |
| `skill_lightning_cast` | sfx | สายฟ้า (ลูกไฟประกาย) | 0.2s | one-shot | แปลบ | High | placeholder | `assets/audio/sfx/skills/skill_lightning_cast.mp3` |
| `skill_lightning_hit` | sfx | สายฟ้าโดน | 0.12s | one-shot | ช็อต | High | placeholder | `assets/audio/sfx/skills/skill_lightning_hit.mp3` |
| `skill_wind_cast` | sfx | สกิลลม / ก้าวสายลม | 0.35s | one-shot | พัดวูบ | High | placeholder | `assets/audio/sfx/skills/skill_wind_cast.mp3` |
| `skill_heal_cast` | sfx | สกิลรักษา | 0.45s | one-shot | อ่อนโยน | High | placeholder | `assets/audio/sfx/skills/skill_heal_cast.mp3` |
| `skill_holy_cast` | sfx | สกิลศักดิ์สิทธิ์ / อวยพร | 0.45s | one-shot | สว่าง ประสานเสียง | High | placeholder | `assets/audio/sfx/skills/skill_holy_cast.mp3` |
| `skill_holy_hit` | sfx | แสงศักดิ์สิทธิ์โดน | 0.2s | one-shot | ประกายแสง | High | placeholder | `assets/audio/sfx/skills/skill_holy_hit.mp3` |
| `skill_dark_cast` | sfx | สกิลมืด / วอยด์ | 0.45s | one-shot | ทึบ น่ากลัว | High | placeholder | `assets/audio/sfx/skills/skill_dark_cast.mp3` |
| `skill_dark_hit` | sfx | มืดโดน | 0.3s | one-shot | จมลึก | High | placeholder | `assets/audio/sfx/skills/skill_dark_hit.mp3` |
| `skill_poison_hit` | sfx | พิษ / แทงรัว | 0.2s | one-shot | ฉ่า | High | placeholder | `assets/audio/sfx/skills/skill_poison_hit.mp3` |
| `skill_buff_cast` | sfx | บัฟตัวเอง | 0.3s | one-shot | มั่นใจ | High | placeholder | `assets/audio/sfx/skills/skill_buff_cast.mp3` |
| `skill_teleport` | sfx | พุ่ง / เทเลพอร์ต | 0.25s | one-shot | วิ้ว | High | placeholder | `assets/audio/sfx/skills/skill_teleport.mp3` |
| `skill_stealth` | sfx | ม่านควัน / ซ่อนตัว | 0.5s | one-shot | ฟู่ | High | placeholder | `assets/audio/sfx/skills/skill_stealth.mp3` |
| `skill_bomb_hit` | sfx | ระเบิด / โนวา / ฟันกวาด | 0.5s | one-shot | บึ้ม | High | placeholder | `assets/audio/sfx/skills/skill_bomb_hit.mp3` |

## SFX — monsters (74)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `mon_slime_idle` | sfx | เสียงประจำตัวมอนตระกูล slime | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_slime_idle.mp3` |
| `mon_slime_attack` | sfx | มอนตระกูล slime โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_slime_attack.mp3` |
| `mon_slime_hit` | sfx | มอนตระกูล slime โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_slime_hit.mp3` |
| `mon_slime_death` | sfx | มอนตระกูล slime ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_slime_death.mp3` |
| `mon_plant_idle` | sfx | เสียงประจำตัวมอนตระกูล plant | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_plant_idle.mp3` |
| `mon_plant_attack` | sfx | มอนตระกูล plant โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_plant_attack.mp3` |
| `mon_plant_hit` | sfx | มอนตระกูล plant โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_plant_hit.mp3` |
| `mon_plant_death` | sfx | มอนตระกูล plant ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_plant_death.mp3` |
| `mon_beast_idle` | sfx | เสียงประจำตัวมอนตระกูล beast | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_beast_idle.mp3` |
| `mon_beast_attack` | sfx | มอนตระกูล beast โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_beast_attack.mp3` |
| `mon_beast_hit` | sfx | มอนตระกูล beast โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_beast_hit.mp3` |
| `mon_beast_death` | sfx | มอนตระกูล beast ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_beast_death.mp3` |
| `mon_insect_idle` | sfx | เสียงประจำตัวมอนตระกูล insect | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_insect_idle.mp3` |
| `mon_insect_attack` | sfx | มอนตระกูล insect โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_insect_attack.mp3` |
| `mon_insect_hit` | sfx | มอนตระกูล insect โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_insect_hit.mp3` |
| `mon_insect_death` | sfx | มอนตระกูล insect ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_insect_death.mp3` |
| `mon_goblin_idle` | sfx | เสียงประจำตัวมอนตระกูล goblin | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_goblin_idle.mp3` |
| `mon_goblin_attack` | sfx | มอนตระกูล goblin โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_goblin_attack.mp3` |
| `mon_goblin_hit` | sfx | มอนตระกูล goblin โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_goblin_hit.mp3` |
| `mon_goblin_death` | sfx | มอนตระกูล goblin ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_goblin_death.mp3` |
| `mon_orc_idle` | sfx | เสียงประจำตัวมอนตระกูล orc | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_orc_idle.mp3` |
| `mon_orc_attack` | sfx | มอนตระกูล orc โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_orc_attack.mp3` |
| `mon_orc_hit` | sfx | มอนตระกูล orc โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_orc_hit.mp3` |
| `mon_orc_death` | sfx | มอนตระกูล orc ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_orc_death.mp3` |
| `mon_undead_idle` | sfx | เสียงประจำตัวมอนตระกูล undead | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_undead_idle.mp3` |
| `mon_undead_attack` | sfx | มอนตระกูล undead โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_undead_attack.mp3` |
| `mon_undead_hit` | sfx | มอนตระกูล undead โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_undead_hit.mp3` |
| `mon_undead_death` | sfx | มอนตระกูล undead ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_undead_death.mp3` |
| `mon_spirit_idle` | sfx | เสียงประจำตัวมอนตระกูล spirit | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_spirit_idle.mp3` |
| `mon_spirit_attack` | sfx | มอนตระกูล spirit โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_spirit_attack.mp3` |
| `mon_spirit_hit` | sfx | มอนตระกูล spirit โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_spirit_hit.mp3` |
| `mon_spirit_death` | sfx | มอนตระกูล spirit ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_spirit_death.mp3` |
| `mon_elemental_idle` | sfx | เสียงประจำตัวมอนตระกูล elemental | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_elemental_idle.mp3` |
| `mon_elemental_attack` | sfx | มอนตระกูล elemental โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_elemental_attack.mp3` |
| `mon_elemental_hit` | sfx | มอนตระกูล elemental โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_elemental_hit.mp3` |
| `mon_elemental_death` | sfx | มอนตระกูล elemental ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_elemental_death.mp3` |
| `mon_machine_idle` | sfx | เสียงประจำตัวมอนตระกูล machine | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_machine_idle.mp3` |
| `mon_machine_attack` | sfx | มอนตระกูล machine โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_machine_attack.mp3` |
| `mon_machine_hit` | sfx | มอนตระกูล machine โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_machine_hit.mp3` |
| `mon_machine_death` | sfx | มอนตระกูล machine ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_machine_death.mp3` |
| `mon_dragon_idle` | sfx | เสียงประจำตัวมอนตระกูล dragon | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_dragon_idle.mp3` |
| `mon_dragon_attack` | sfx | มอนตระกูล dragon โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_dragon_attack.mp3` |
| `mon_dragon_hit` | sfx | มอนตระกูล dragon โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_dragon_hit.mp3` |
| `mon_dragon_death` | sfx | มอนตระกูล dragon ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_dragon_death.mp3` |
| `mon_demon_idle` | sfx | เสียงประจำตัวมอนตระกูล demon | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_demon_idle.mp3` |
| `mon_demon_attack` | sfx | มอนตระกูล demon โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_demon_attack.mp3` |
| `mon_demon_hit` | sfx | มอนตระกูล demon โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_demon_hit.mp3` |
| `mon_demon_death` | sfx | มอนตระกูล demon ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_demon_death.mp3` |
| `mon_aquatic_idle` | sfx | เสียงประจำตัวมอนตระกูล aquatic | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_aquatic_idle.mp3` |
| `mon_aquatic_attack` | sfx | มอนตระกูล aquatic โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_aquatic_attack.mp3` |
| `mon_aquatic_hit` | sfx | มอนตระกูล aquatic โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_aquatic_hit.mp3` |
| `mon_aquatic_death` | sfx | มอนตระกูล aquatic ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_aquatic_death.mp3` |
| `mon_desert_idle` | sfx | เสียงประจำตัวมอนตระกูล desert | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_desert_idle.mp3` |
| `mon_desert_attack` | sfx | มอนตระกูล desert โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_desert_attack.mp3` |
| `mon_desert_hit` | sfx | มอนตระกูล desert โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_desert_hit.mp3` |
| `mon_desert_death` | sfx | มอนตระกูล desert ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_desert_death.mp3` |
| `mon_ice_idle` | sfx | เสียงประจำตัวมอนตระกูล ice | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_ice_idle.mp3` |
| `mon_ice_attack` | sfx | มอนตระกูล ice โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_ice_attack.mp3` |
| `mon_ice_hit` | sfx | มอนตระกูล ice โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_ice_hit.mp3` |
| `mon_ice_death` | sfx | มอนตระกูล ice ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_ice_death.mp3` |
| `mon_void_idle` | sfx | เสียงประจำตัวมอนตระกูล void | 0.35s | one-shot | ระยะใกล้เท่านั้น | Low | placeholder | `assets/audio/sfx/monsters/mon_void_idle.mp3` |
| `mon_void_attack` | sfx | มอนตระกูล void โจมตี | 0.15s | one-shot | ก้าวร้าว | Medium | placeholder | `assets/audio/sfx/monsters/mon_void_attack.mp3` |
| `mon_void_hit` | sfx | มอนตระกูล void โดนตี | 0.1s | one-shot | เจ็บ | Medium | placeholder | `assets/audio/sfx/monsters/mon_void_hit.mp3` |
| `mon_void_death` | sfx | มอนตระกูล void ตาย | 0.45s | one-shot | ล้ม | High | placeholder | `assets/audio/sfx/monsters/mon_void_death.mp3` |
| `boss_thornwood_spawn` | sfx | Elder Thornwood ปรากฏ | 1.5s | one-shot | ไม้ลั่นเอี๊ยด ข่มขู่ | Highest | placeholder | `assets/audio/sfx/monsters/boss_thornwood_spawn.mp3` |
| `boss_thornwood_attack` | sfx | Thornwood ฟาดราก | 0.5s | one-shot | สะเทือน | Highest | placeholder | `assets/audio/sfx/monsters/boss_thornwood_attack.mp3` |
| `boss_thornwood_death` | sfx | Thornwood ล้ม | 2s | one-shot | ต้นไม้ใหญ่ล้มครืน | Highest | placeholder | `assets/audio/sfx/monsters/boss_thornwood_death.mp3` |
| `boss_ironjaw_spawn` | sfx | Ironjaw ปรากฏ | 1.2s | one-shot | เครื่องจักรคำราม | Highest | placeholder | `assets/audio/sfx/monsters/boss_ironjaw_spawn.mp3` |
| `boss_ironjaw_attack` | sfx | Ironjaw โจมตี | 0.35s | one-shot | เหล็กกระแทก | Highest | placeholder | `assets/audio/sfx/monsters/boss_ironjaw_attack.mp3` |
| `boss_ironjaw_death` | sfx | Ironjaw พัง | 1.8s | one-shot | ระเบิดเฟือง | Highest | placeholder | `assets/audio/sfx/monsters/boss_ironjaw_death.mp3` |
| `boss_spawn` | sfx | บอสทั่วไปปรากฏ | 1s | one-shot | คุกคาม | Highest | placeholder | `assets/audio/sfx/monsters/boss_spawn.mp3` |
| `boss_death` | sfx | บอสทั่วไปตาย | 1.4s | one-shot | ชัยชนะ | Highest | placeholder | `assets/audio/sfx/monsters/boss_death.mp3` |
| `boss_warning` | sfx | เตือนท่าระเบิดวงกว้างของบอส | 0.6s | one-shot | อันตราย! | Highest | placeholder | `assets/audio/sfx/monsters/boss_warning.mp3` |
| `boss_phase` | sfx | บอสเปลี่ยนเฟส/คลั่ง | 0.8s | one-shot | คำราม | Highest | placeholder | `assets/audio/sfx/monsters/boss_phase.mp3` |

## SFX — world (9)

| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |
|---|---|---|---|---|---|---|---|---|
| `portal_enter` | sfx | เข้าพอร์ทัล / เปลี่ยนแผนที่ | 0.6s | one-shot | เวท วาร์ป | High | placeholder | `assets/audio/sfx/world/portal_enter.mp3` |
| `portal_idle` | sfx | พอร์ทัลฮัมเบาๆ (ตามระยะ) | 1.6s loop | loop | ลึกลับ | Low | placeholder | `assets/audio/sfx/world/portal_idle.mp3` |
| `smith_hammer` | sfx | ค้อนช่างตีเหล็ก (เป็นช่วงๆ ตามระยะ) | 0.2s | one-shot | โลหะก้อง | Low | placeholder | `assets/audio/sfx/world/smith_hammer.mp3` |
| `campfire` | sfx | กองไฟในค่าย | 1.2s loop | loop | อบอุ่น | Low | placeholder | `assets/audio/sfx/world/campfire.mp3` |
| `gather_herb` | sfx | เก็บสมุนไพร/ดอกไม้ | 0.2s | one-shot | ใบไม้กรอบแกรบ | Medium | placeholder | `assets/audio/sfx/world/gather_herb.mp3` |
| `gather_ore` | sfx | ขุดแร่ | 0.25s | one-shot | ก๊ง ก๊ง | Medium | placeholder | `assets/audio/sfx/world/gather_ore.mp3` |
| `gather_generic` | sfx | แตะจุดเควส/จุดเก็บของ | 0.12s | one-shot | สะกิด | Medium | placeholder | `assets/audio/sfx/world/gather_generic.mp3` |
| `node_shrine` | sfx | จุดศาลจันทร์ | 0.9s | one-shot | ศักดิ์สิทธิ์ เงียบสงบ | High | placeholder | `assets/audio/sfx/world/node_shrine.mp3` |
| `wave_start` | sfx | ระลอกศัตรู (บททดสอบแวนการ์ด) | 1.1s | one-shot | แตรศึก | Highest | placeholder | `assets/audio/sfx/world/wave_start.mp3` |

## สรุป

- ทั้งหมด 206 รายการ: Music 35 · Ambient 13 · SFX 158
- final: 0 · placeholder: 206
- ไฟล์จริงที่ควรหาก่อน (ผลต่อความรู้สึกมากที่สุด): เพลง 6 แผนที่ของ Region 1, เพลงบอส 2 เพลง, ambient ป่า/ลำธาร/เหมือง/เมือง, เสียงอาวุธพื้นฐาน, level_up / class_change / quest_complete
