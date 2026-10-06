'use strict';
// World registry: 8 regions and every map of the world (open = playable now, planned = on the world map,
// locked until a later batch). Open maps are built from content/maps/<id>.js; this file holds the meta data
// every map has (region, level range, size, environment, music, world-map position, connections).
const REGIONS = [
  { id: 'heartland', th: 'ใจกลางเอลินดรา', en: 'Elyndra Heartland', lv: [1, 30], col: '#7cc46a', pos: [18, 62], d: 'บ้านเกิดของนักผจญภัย ทุ่งหญ้า ป่า และเหมืองเก่า' },
  { id: 'verdant', th: 'ป่าเขียวขจี', en: 'Verdant Wilds', lv: [20, 45], col: '#3e9a5a', pos: [20, 30], d: 'ป่าลึกของภูตและสัตว์ป่า' },
  { id: 'ashen', th: 'ชายแดนเถ้าถ่าน', en: 'Ashen Frontier', lv: [40, 65], col: '#d0603a', pos: [46, 18], d: 'ดินแดนภูเขาไฟและป้อมร้าง' },
  { id: 'azure', th: 'ชายฝั่งอาซูร์', en: 'Azure Coast', lv: [55, 80], col: '#3fa3d8', pos: [46, 78], d: 'เมืองท่า แนวปะการัง และวิหารใต้น้ำ' },
  { id: 'sandsea', th: 'ทะเลทราย', en: 'Sandsea', lv: [70, 95], col: '#e0b45a', pos: [72, 66], d: 'ทะเลทรายกว้างใหญ่และพีระมิดโบราณ' },
  { id: 'frostland', th: 'ดินแดนน้ำแข็ง', en: 'Frostland', lv: [90, 115], col: '#a8d8f0', pos: [74, 18], d: 'ป่าน้ำแข็งและป้อมปราการเยือกแข็ง' },
  { id: 'arcane', th: 'ที่ราบสูงอาร์เคน', en: 'Arcane Highlands', lv: [105, 130], col: '#9b7bff', pos: [88, 42], d: 'หุบเขารูนและหอคอยจอมเวท' },
  { id: 'void', th: 'แนวหน้าวอยด์', en: 'Void Frontier', lv: [125, 150], col: '#6b4a8f', pos: [92, 84], d: 'ดินแดนแตกสลายที่วอยด์รุกราน' },
];
// [id, name th, region, kind, lv min, lv max, w, h, env, music, world pos (x,y in %), status]
const M = [
  ['lumira', 'หมู่บ้านลูมิร่า', 'heartland', 'village', 1, 10, 50, 40, 'village', 'calm_village', [14, 70], 'open'],
  ['solkara', 'นครเอลินดรา (โซลคารา)', 'heartland', 'capital', 1, 30, 76, 52, 'town_sand', 'royal_capital', [20, 55], 'open'],
  ['beginner_meadow', 'ทุ่งหญ้าผู้เริ่มต้น', 'heartland', 'field', 1, 8, 64, 48, 'meadow', 'meadow_breeze', [24, 74], 'open'],
  ['greenwood', 'ป่ากรีนวูด', 'heartland', 'field', 8, 18, 70, 60, 'forest_deep', 'green_canopy', [31, 66], 'open'],
  ['moonlit_creek', 'ลำธารแสงจันทร์', 'heartland', 'field', 14, 24, 64, 52, 'night_creek', 'moon_waters', [36, 74], 'open'],
  ['old_mine', 'เหมืองเก่า', 'heartland', 'dungeon', 20, 30, 56, 56, 'cave', 'deep_mine', [33, 83], 'open'],
  ['plains', 'ทุ่งทรายสีทอง (Lv 1-10)', 'heartland', 'field', 1, 10, 64, 46, 'desert', 'golden_fields', [28, 52], 'open'],
  ['woods', 'ป่าโอเอซิส (Lv 5-15)', 'heartland', 'field', 5, 15, 52, 52, 'forest', 'oasis_woods', [13, 46], 'open'],
  ['ancient_farm', 'ไร่โบราณ', 'heartland', 'field', 10, 20, 60, 48, 'meadow', 'meadow_breeze', [8, 80], 'planned'],
  ['bandit_road', 'ถนนโจร', 'heartland', 'field', 18, 25, 72, 40, 'forest', 'tense_road', [9, 58], 'planned'],
  ['verdant_haven', 'เวอร์แดนต์ เฮเวน', 'verdant', 'forest_city', 20, 45, 60, 50, 'forest', 'haven', [22, 30], 'planned'],
  ['deep_forest', 'ป่าลึก', 'verdant', 'field', 22, 30, 72, 64, 'forest_deep', 'green_canopy', [30, 38], 'planned'],
  ['mushroom_hollow', 'โพรงเห็ด', 'verdant', 'field', 26, 34, 60, 56, 'forest_deep', 'spores', [12, 24], 'planned'],
  ['spirit_grove', 'สวนวิญญาณ', 'verdant', 'field', 30, 38, 60, 56, 'night_creek', 'spirit', [26, 18], 'planned'],
  ['ancient_tree', 'ต้นไม้โบราณ', 'verdant', 'dungeon', 36, 45, 48, 64, 'forest_deep', 'ancient', [18, 12], 'planned'],
  ['beast_valley', 'หุบเขาสัตว์ป่า', 'verdant', 'field', 32, 42, 70, 50, 'forest', 'drums', [34, 26], 'planned'],
  ['emberhold', 'เอมเบอร์โฮลด์', 'ashen', 'mining_city', 40, 65, 60, 50, 'town_sand', 'forge', [46, 18], 'planned'],
  ['ash_plains', 'ที่ราบเถ้า', 'ashen', 'field', 40, 48, 72, 56, 'desert', 'ash_wind', [40, 26], 'planned'],
  ['volcanic_road', 'ถนนภูเขาไฟ', 'ashen', 'field', 46, 54, 70, 48, 'desert', 'ash_wind', [52, 10], 'planned'],
  ['fire_cavern', 'ถ้ำเพลิง', 'ashen', 'dungeon', 52, 60, 56, 56, 'cave', 'magma', [58, 22], 'planned'],
  ['ruined_fortress', 'ป้อมปรักหักพัง', 'ashen', 'dungeon', 58, 65, 60, 60, 'cave', 'war', [40, 8], 'planned'],
  ['azure_port', 'ท่าเรืออาซูร์', 'azure', 'port', 55, 80, 64, 50, 'town_sand', 'harbor', [46, 78], 'planned'],
  ['coastal_road', 'ถนนเลียบชายฝั่ง', 'azure', 'field', 55, 62, 72, 44, 'meadow', 'waves', [42, 70], 'planned'],
  ['coral_beach', 'หาดปะการัง', 'azure', 'field', 60, 68, 64, 52, 'desert', 'waves', [54, 86], 'planned'],
  ['sunken_temple', 'วิหารใต้น้ำ', 'azure', 'dungeon', 68, 76, 56, 56, 'cave', 'sunken', [46, 92], 'planned'],
  ['pirate_cove', 'อ่าวโจรสลัด', 'azure', 'field', 72, 80, 60, 50, 'desert', 'shanty', [38, 88], 'planned'],
  ['solara', 'โซลาร่า', 'sandsea', 'desert_city', 70, 95, 64, 52, 'town_sand', 'desert_city', [72, 66], 'planned'],
  ['great_desert', 'ทะเลทรายใหญ่', 'sandsea', 'field', 70, 78, 80, 60, 'desert', 'dunes', [64, 58], 'planned'],
  ['oasis', 'โอเอซิส', 'sandsea', 'field', 76, 84, 56, 48, 'forest', 'dunes', [80, 58], 'planned'],
  ['ancient_pyramid', 'พีระมิดโบราณ', 'sandsea', 'dungeon', 84, 92, 56, 64, 'cave', 'tomb', [82, 74], 'planned'],
  ['scorpion_canyon', 'หุบผาแมงป่อง', 'sandsea', 'field', 80, 88, 70, 50, 'desert', 'dunes', [66, 76], 'planned'],
  ['lost_ruins', 'ซากเมืองที่สาบสูญ', 'sandsea', 'dungeon', 88, 95, 60, 60, 'cave', 'lost_kingdom', [74, 82], 'planned'],
  ['frostheim', 'ฟรอสต์ไฮม์', 'frostland', 'snow_city', 90, 115, 60, 50, 'snow', 'snow_city', [74, 18], 'planned'],
  ['frozen_forest', 'ป่าเยือกแข็ง', 'frostland', 'field', 90, 98, 70, 60, 'snow', 'frost', [66, 26], 'planned'],
  ['ice_lake', 'ทะเลสาบน้ำแข็ง', 'frostland', 'field', 96, 104, 64, 52, 'snow', 'frost', [82, 26], 'planned'],
  ['snowfield', 'ทุ่งหิมะ', 'frostland', 'field', 100, 108, 72, 56, 'snow', 'frost', [70, 8], 'planned'],
  ['crystal_cave', 'ถ้ำคริสตัล', 'frostland', 'dungeon', 104, 112, 56, 56, 'cave', 'crystal', [84, 10], 'planned'],
  ['frozen_citadel', 'ป้อมปราการเยือกแข็ง', 'frostland', 'dungeon', 108, 115, 60, 64, 'snow', 'citadel', [62, 12], 'planned'],
  ['astralis', 'แอสตราลิส', 'arcane', 'magic_city', 105, 130, 64, 52, 'town_sand', 'astral', [88, 42], 'planned'],
  ['rune_valley', 'หุบเขารูน', 'arcane', 'field', 105, 114, 72, 56, 'meadow', 'runes', [80, 36], 'planned'],
  ['floating_ruins', 'ซากลอยฟ้า', 'arcane', 'field', 112, 120, 64, 64, 'night_creek', 'sky', [94, 30], 'planned'],
  ['mage_tower', 'หอคอยจอมเวท', 'arcane', 'dungeon', 118, 126, 40, 70, 'cave', 'tower', [96, 50], 'planned'],
  ['mana_rift', 'รอยแยกมานา', 'arcane', 'dungeon', 122, 130, 60, 60, 'night_creek', 'rift', [84, 52], 'planned'],
  ['last_haven', 'ลาสต์เฮเวน', 'void', 'endgame_city', 125, 150, 60, 50, 'town_sand', 'last_light', [92, 84], 'planned'],
  ['void_plains', 'ที่ราบวอยด์', 'void', 'field', 125, 134, 80, 60, 'night_creek', 'void', [84, 76], 'planned'],
  ['dark_citadel', 'ป้อมปราการมืด', 'void', 'dungeon', 132, 140, 64, 64, 'cave', 'void', [96, 72], 'planned'],
  ['broken_realm', 'อาณาจักรแตกสลาย', 'void', 'field', 138, 146, 80, 70, 'night_creek', 'broken', [86, 94], 'planned'],
  ['abyss_gate', 'ประตูอเวจี', 'void', 'dungeon', 144, 150, 56, 56, 'cave', 'abyss', [98, 92], 'planned'],
];
const MAPS_META = {};
// audio profile: every map names its music (bgm) and ambient bed; ids live in public/audio-registry.js.
// Maps without their own theme use their region's town / field / dungeon theme.
const BGM = { lumira: 'bgm_lumira_village', solkara: 'bgm_elyndra_capital', beginner_meadow: 'bgm_beginner_meadow', greenwood: 'bgm_greenwood', moonlit_creek: 'bgm_moonlit_creek', old_mine: 'bgm_old_mine', plains: 'bgm_golden_fields', woods: 'bgm_oasis_woods' };
const AMBIENT_BY_ENV = { village: 'amb_village', town_sand: 'amb_town', meadow: 'amb_meadow', forest: 'amb_forest', forest_deep: 'amb_forest', night_creek: 'amb_night_creek', cave: 'amb_cave', desert: 'amb_desert', snow: 'amb_snow' };
const AMBIENT = { azure_port: 'amb_ocean', coastal_road: 'amb_ocean', coral_beach: 'amb_ocean', pirate_cove: 'amb_ocean', fire_cavern: 'amb_volcano', volcanic_road: 'amb_volcano', astralis: 'amb_magic', rune_valley: 'amb_magic', floating_ruins: 'amb_magic', mana_rift: 'amb_magic', void_plains: 'amb_void', dark_citadel: 'amb_void', broken_realm: 'amb_void', abyss_gate: 'amb_void', last_haven: 'amb_void', ruined_fortress: 'amb_dungeon', sunken_temple: 'amb_dungeon', ancient_pyramid: 'amb_dungeon', lost_ruins: 'amb_dungeon', frozen_citadel: 'amb_snow', crystal_cave: 'amb_cave', mage_tower: 'amb_magic', ancient_tree: 'amb_forest' };
for (const [id, name, region, kind, l0, l1, w, h, env, music, pos, status] of M) {
  const town = /village|capital|city|port/.test(kind), type = town ? 'town' : kind === 'dungeon' ? 'dungeon' : 'field';
  const bgm = BGM[id] || (region === 'heartland' ? (type === 'field' ? 'bgm_heartland_field' : type === 'dungeon' ? 'bgm_old_mine' : 'bgm_elyndra_capital') : `bgm_${region}_${type}`);
  MAPS_META[id] = { id, name, region, kind, lv: [l0, l1], w, h, env, music, bgm, ambient: AMBIENT[id] || AMBIENT_BY_ENV[env] || 'amb_meadow', pos, status, town };
}
// road links between maps (both ways). Open maps place the portal tiles in their builders; links to planned
// maps show up as locked portals and on the world map.
const LINKS = [
  ['lumira', 'beginner_meadow'], ['lumira', 'solkara'], ['beginner_meadow', 'greenwood'], ['beginner_meadow', 'ancient_farm'],
  ['greenwood', 'moonlit_creek'], ['moonlit_creek', 'old_mine'], ['solkara', 'plains'], ['solkara', 'woods'], ['solkara', 'bandit_road'],
  ['greenwood', 'deep_forest'], ['deep_forest', 'verdant_haven'], ['verdant_haven', 'mushroom_hollow'], ['verdant_haven', 'spirit_grove'], ['spirit_grove', 'ancient_tree'], ['deep_forest', 'beast_valley'],
  ['beast_valley', 'ash_plains'], ['ash_plains', 'emberhold'], ['emberhold', 'volcanic_road'], ['emberhold', 'fire_cavern'], ['volcanic_road', 'ruined_fortress'],
  ['bandit_road', 'coastal_road'], ['coastal_road', 'azure_port'], ['azure_port', 'coral_beach'], ['coral_beach', 'sunken_temple'], ['azure_port', 'pirate_cove'],
  ['azure_port', 'great_desert'], ['great_desert', 'solara'], ['solara', 'oasis'], ['solara', 'scorpion_canyon'], ['scorpion_canyon', 'ancient_pyramid'], ['ancient_pyramid', 'lost_ruins'],
  ['fire_cavern', 'frozen_forest'], ['frozen_forest', 'frostheim'], ['frostheim', 'ice_lake'], ['frostheim', 'snowfield'], ['ice_lake', 'crystal_cave'], ['snowfield', 'frozen_citadel'],
  ['ice_lake', 'rune_valley'], ['rune_valley', 'astralis'], ['astralis', 'floating_ruins'], ['astralis', 'mage_tower'], ['astralis', 'mana_rift'],
  ['mana_rift', 'void_plains'], ['oasis', 'void_plains'], ['void_plains', 'last_haven'], ['last_haven', 'dark_citadel'], ['dark_citadel', 'broken_realm'], ['broken_realm', 'abyss_gate'],
];
module.exports = { REGIONS, MAPS_META, LINKS };
