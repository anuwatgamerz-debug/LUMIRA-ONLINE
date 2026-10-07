// ============================================================ LUMIRA ONLINE — audio registry
// Every sound the game can play, by id. Game code only ever uses these ids (never file paths).
//
// To use a real recording: put the file under public/assets/audio/... and set `file` on the entry
// (e.g. file: 'music/town/lumira_village.mp3'). Optional `alt` = a second format ('...ogg') for browsers
// that can't play the first. If the file is missing or can't be decoded, the synth placeholder plays instead,
// so nothing in gameplay changes when files are added or removed.
//
// status: 'placeholder' = procedural Web Audio sound (original, generated in the browser), 'final' = real file.
// prio: 0 low (ambient, footsteps) · 1 medium (monster, weapon) · 2 high (skills) · 3 highest (boss, level up, quest complete)
// cd: minimum ms between two plays of the same id. pos: volume falls off with distance from the player.
(function (root) {
  'use strict';
  const S = {};
  // sfx(id, category folder, synth parts, options). A synth part:
  //   { w: 'sine'|'triangle'|'square'|'sawtooth'|'noise', f: [startHz, endHz], at: start s, d: length s, v: volume,
  //     a: attack s, fl: noise filter 'lp'|'bp'|'hp', q: filter Q, vib: [rateHz, depthHz] }
  const sfx = (id, dir, synth, o = {}) => { S[id] = Object.assign({ id, cat: 'sfx', dir: 'sfx/' + dir, synth, prio: 1, cd: 40, vol: 1, status: 'placeholder' }, o); };
  const T = (w, f0, f1, at, d, v, a) => ({ w, f: [f0, f1], at, d, v, a: a || 0.004 });
  const N = (fl, f0, f1, at, d, v, q, a) => ({ w: 'noise', fl, f: [f0, f1], at, d, v, q: q || 1, a: a || 0.003 });
  const arp = (w, notes, step, d, v, at = 0) => notes.map((f, i) => T(w, f, f, at + i * step, d, v));

  // ---------------- UI
  sfx('ui_click', 'ui', [T('triangle', 1400, 1100, 0, 0.05, 0.35)], { prio: 1, cd: 30, use: 'แตะปุ่ม UI', len: '0.05s', mood: 'สั้น นุ่ม' });
  sfx('ui_open', 'ui', [T('triangle', 520, 880, 0, 0.12, 0.3), T('sine', 1320, 1320, 0.05, 0.1, 0.12)], { cd: 60, use: 'เปิดหน้าต่าง', len: '0.15s', mood: 'สว่าง' });
  sfx('ui_close', 'ui', [T('triangle', 880, 480, 0, 0.12, 0.28)], { cd: 60, use: 'ปิดหน้าต่าง', len: '0.12s', mood: 'นุ่ม' });
  sfx('ui_confirm', 'ui', arp('triangle', [880, 1320], 0.06, 0.12, 0.3), { cd: 60, use: 'ยืนยัน / เลือกตัวเลือก', len: '0.2s', mood: 'บวก' });
  sfx('ui_cancel', 'ui', arp('triangle', [660, 440], 0.06, 0.1, 0.26), { cd: 60, use: 'ยกเลิก', len: '0.18s', mood: 'ลง' });
  sfx('ui_error', 'ui', [T('square', 220, 180, 0, 0.09, 0.16), T('square', 200, 160, 0.11, 0.12, 0.16)], { cd: 250, use: 'ทำไม่ได้ / SP ไม่พอ / นอกระยะ', len: '0.25s', mood: 'เตือนเบาๆ' });
  sfx('ui_tab', 'ui', [T('sine', 990, 990, 0, 0.04, 0.22)], { cd: 40, use: 'สลับแท็บ', len: '0.04s', mood: 'คลิกเบา' });
  sfx('ui_hover', 'ui', [T('sine', 1760, 1760, 0, 0.025, 0.06)], { cd: 80, prio: 0, use: 'ชี้ปุ่ม (desktop)', len: '0.03s', mood: 'แผ่ว' });
  sfx('inventory_open', 'ui', [N('bp', 1800, 900, 0, 0.12, 0.25, 2), T('triangle', 330, 330, 0.03, 0.08, 0.15)], { cd: 80, use: 'เปิดกระเป๋า', len: '0.15s', mood: 'ผ้า/หนัง' });
  sfx('equip', 'ui', [N('bp', 3000, 1500, 0, 0.06, 0.3, 4), T('square', 740, 740, 0.02, 0.06, 0.1), T('triangle', 1110, 1110, 0.06, 0.1, 0.18)], { cd: 80, use: 'สวมอุปกรณ์', len: '0.18s', mood: 'โลหะกระทบ' });
  sfx('unequip', 'ui', [N('bp', 1500, 2500, 0, 0.08, 0.25, 3), T('triangle', 880, 660, 0.03, 0.08, 0.14)], { cd: 80, use: 'ถอดอุปกรณ์', len: '0.12s', mood: 'ถอด' });
  sfx('buy', 'ui', arp('square', [1047, 1568], 0.05, 0.08, 0.12), { cd: 80, use: 'ซื้อของ', len: '0.15s', mood: 'เงินออก' });
  sfx('sell', 'ui', arp('square', [1568, 2093], 0.05, 0.08, 0.12), { cd: 80, use: 'ขายของ', len: '0.15s', mood: 'เงินเข้า' });
  sfx('coin', 'items', [T('sine', 2093, 2093, 0, 0.08, 0.25), T('sine', 2637, 2637, 0.05, 0.14, 0.22)], { cd: 70, use: 'ได้รับ/ใช้ Zeny', len: '0.2s', mood: 'กรุ๊งกริ๊ง' });
  // ---------------- quests / progress
  sfx('quest_available', 'quests', arp('triangle', [784, 988], 0.07, 0.12, 0.2), { cd: 2000, use: 'NPC มีเควสใหม่ (เข้าแผนที่)', len: '0.25s', mood: 'ชวนสงสัย' });
  sfx('quest_accept', 'quests', arp('triangle', [523, 659, 784], 0.07, 0.16, 0.26), { cd: 300, prio: 2, use: 'รับเควส', len: '0.35s', mood: 'เริ่มต้นผจญภัย' });
  sfx('quest_progress', 'quests', [T('sine', 1175, 1175, 0, 0.08, 0.16), T('sine', 1568, 1568, 0.06, 0.12, 0.14)], { cd: 200, use: 'ความคืบหน้าเควส', len: '0.2s', mood: 'ติ๊กเบาๆ' });
  sfx('quest_complete', 'quests', [...arp('triangle', [523, 659, 784, 1047], 0.09, 0.3, 0.3), T('sine', 1568, 1568, 0.36, 0.6, 0.14), T('triangle', 262, 262, 0.36, 0.6, 0.16)], { cd: 500, prio: 3, duck: 0.35, use: 'เควสสำเร็จ', len: '1.0s', mood: 'ฉลอง เด่นแต่ไม่ตกใจ' });
  sfx('quest_reward', 'quests', [T('sine', 2093, 2093, 0, 0.1, 0.18), T('sine', 2637, 2637, 0.07, 0.16, 0.16), T('sine', 3136, 3136, 0.14, 0.22, 0.12)], { cd: 400, prio: 2, use: 'รับรางวัลเควส', len: '0.35s', mood: 'วิ้ง' });
  sfx('level_up', 'player', [...arp('square', [523, 659, 784, 1047, 1319], 0.08, 0.22, 0.14), ...arp('triangle', [523, 659, 784, 1047, 1319], 0.08, 0.3, 0.2), T('sine', 2093, 2093, 0.42, 0.7, 0.1)], { cd: 800, prio: 3, duck: 0.4, use: 'เลเวลอัพ', len: '1.2s', mood: 'ยินดี ฮึกเหิม' });
  sfx('class_change', 'player', [...arp('sawtooth', [392, 523, 659, 784], 0.12, 0.35, 0.08), ...arp('triangle', [392, 523, 659, 784, 1047, 1319, 1568], 0.1, 0.5, 0.2), T('triangle', 196, 196, 0.6, 1.4, 0.2), T('sine', 784, 784, 0.6, 1.4, 0.12), T('sine', 1175, 1175, 0.6, 1.4, 0.08), N('hp', 6000, 9000, 0.6, 1.2, 0.05)], { cd: 2000, prio: 3, duck: 0.45, use: 'เปลี่ยนอาชีพ (พิเศษกว่าเลเวลอัพ)', len: '2.0s', mood: 'พิธีศักดิ์สิทธิ์ ยิ่งใหญ่' });
  sfx('job_level', 'player', arp('triangle', [784, 1047, 1319], 0.06, 0.18, 0.18), { cd: 500, prio: 2, use: 'Job Level up', len: '0.35s', mood: 'สดใส' });
  // ---------------- loot
  sfx('pickup_normal', 'items', [N('bp', 2500, 1800, 0, 0.05, 0.2, 3), T('triangle', 990, 1320, 0, 0.08, 0.2)], { cd: 90, use: 'เก็บไอเทมธรรมดา', len: '0.1s', mood: 'ป๊อบ' });
  sfx('pickup_coin', 'items', [T('sine', 2093, 2093, 0, 0.07, 0.22), T('sine', 2793, 2793, 0.04, 0.12, 0.2)], { cd: 90, use: 'เก็บเงิน', len: '0.15s', mood: 'เหรียญ' });
  sfx('pickup_rare', 'items', arp('sine', [1319, 1760, 2349], 0.05, 0.16, 0.2), { cd: 150, prio: 2, use: 'เก็บของ Rare', len: '0.3s', mood: 'ประกาย' });
  sfx('pickup_epic', 'items', [...arp('sine', [1047, 1319, 1568, 2093, 2637], 0.05, 0.25, 0.2), T('triangle', 523, 523, 0, 0.5, 0.12)], { cd: 300, prio: 3, use: 'เก็บของ Epic', len: '0.6s', mood: 'ตื่นเต้น' });
  sfx('pickup_legendary', 'items', [...arp('sine', [784, 1047, 1319, 1568, 2093, 2637, 3136], 0.06, 0.4, 0.2), T('sawtooth', 196, 196, 0, 1.0, 0.06), T('triangle', 392, 392, 0.3, 1.0, 0.14), N('hp', 7000, 9000, 0.2, 0.8, 0.05)], { cd: 600, prio: 3, duck: 0.4, use: 'เก็บของ Legendary', len: '1.2s', mood: 'อลังการ' });
  // ---------------- weapons (basic attack)
  const swing = (f0, f1, d, v) => N('bp', f0, f1, 0, d, v, 1.4, 0.01);
  sfx('sword_swing', 'weapons', [swing(900, 3200, 0.13, 0.45)], { cd: 60, use: 'เหวี่ยงดาบ', len: '0.13s', mood: 'วูบ' });
  sfx('sword_hit', 'weapons', [N('lp', 3000, 800, 0, 0.09, 0.6), T('square', 180, 90, 0, 0.07, 0.2), T('triangle', 1600, 1300, 0, 0.08, 0.1)], { cd: 50, use: 'ดาบโดนเป้า', len: '0.1s', mood: 'ฉึบ' });
  sfx('dagger_swing', 'weapons', [swing(1600, 4500, 0.08, 0.35)], { cd: 50, use: 'แทงมีด', len: '0.08s', mood: 'ฉับไว' });
  sfx('dagger_hit', 'weapons', [N('hp', 2500, 1800, 0, 0.06, 0.45), T('triangle', 900, 600, 0, 0.05, 0.14)], { cd: 50, use: 'มีดโดน', len: '0.07s', mood: 'คม' });
  sfx('bow_shoot', 'weapons', [T('sawtooth', 160, 120, 0, 0.12, 0.22), N('bp', 2500, 5000, 0.01, 0.1, 0.25, 2)], { cd: 60, use: 'ยิงธนู', len: '0.15s', mood: 'ปึ๋ง' });
  sfx('arrow_hit', 'weapons', [N('lp', 2400, 900, 0, 0.06, 0.45), T('square', 260, 140, 0, 0.05, 0.16)], { cd: 50, use: 'ลูกศรโดน', len: '0.07s', mood: 'ปัก' });
  sfx('magic_cast', 'weapons', [T('sine', 600, 1400, 0, 0.18, 0.2), T('triangle', 1200, 2400, 0.02, 0.16, 0.1), N('hp', 5000, 8000, 0, 0.18, 0.06)], { cd: 70, use: 'ร่ายเวท (คทา/ไม้เท้า)', len: '0.2s', mood: 'ระยิบ' });
  sfx('magic_hit', 'weapons', [T('sine', 900, 300, 0, 0.14, 0.3), N('bp', 3000, 1200, 0, 0.12, 0.25, 2)], { cd: 50, use: 'เวทโดน', len: '0.15s', mood: 'ปุ้ง' });
  sfx('mace_swing', 'weapons', [swing(500, 1600, 0.16, 0.45)], { cd: 70, use: 'เหวี่ยงกระบอง', len: '0.16s', mood: 'หนัก' });
  sfx('heavy_hit', 'weapons', [T('sine', 140, 50, 0, 0.16, 0.6), N('lp', 1200, 300, 0, 0.12, 0.5)], { cd: 60, use: 'กระบอง/ดาบใหญ่โดน', len: '0.16s', mood: 'ตุ้บ' });
  sfx('spear_attack', 'weapons', [swing(1200, 2600, 0.1, 0.4), T('triangle', 700, 900, 0.03, 0.06, 0.1)], { cd: 60, use: 'แทงหอก', len: '0.12s', mood: 'พุ่ง' });
  sfx('device_shot', 'weapons', [T('square', 900, 200, 0, 0.08, 0.2), N('bp', 4000, 1500, 0, 0.1, 0.35, 1.5)], { cd: 60, use: 'ปืนกล', len: '0.12s', mood: 'ปัง (กลไก)' });
  sfx('unarmed_hit', 'weapons', [T('sine', 200, 90, 0, 0.08, 0.4), N('lp', 1500, 500, 0, 0.06, 0.3)], { cd: 50, use: 'หมัด/ไม่มีอาวุธ', len: '0.08s', mood: 'ตุบ' });
  // ---------------- combat results
  sfx('hit_normal', 'combat', [N('lp', 2600, 700, 0, 0.08, 0.5), T('sine', 170, 80, 0, 0.08, 0.3)], { cd: 40, use: 'ตีโดนทั่วไป', len: '0.08s', mood: 'กระแทก' });
  sfx('hit_critical', 'combat', [N('lp', 5000, 1200, 0, 0.12, 0.65), T('sine', 120, 45, 0, 0.18, 0.5), T('triangle', 1800, 2400, 0, 0.12, 0.16)], { cd: 60, prio: 2, use: 'คริติคอล (เด่นกว่าตีปกติ)', len: '0.2s', mood: 'แรง แหลม' });
  sfx('miss', 'combat', [N('bp', 2500, 900, 0, 0.12, 0.3, 1.2, 0.02)], { cd: 60, use: 'ตีพลาด (ไม่ใช่เสียงโดน)', len: '0.12s', mood: 'วืด' });
  sfx('block', 'combat', [T('square', 1200, 1100, 0, 0.06, 0.15), T('triangle', 2400, 2000, 0, 0.12, 0.12), N('hp', 3000, 2500, 0, 0.05, 0.2)], { cd: 80, use: 'ป้องกัน/กันได้', len: '0.12s', mood: 'โลหะ' });
  sfx('heal', 'combat', arp('sine', [784, 988, 1175, 1568], 0.05, 0.18, 0.18), { cd: 150, prio: 2, use: 'ฟื้น HP (สกิล/ยา/NPC)', len: '0.35s', mood: 'อบอุ่น' });
  sfx('damage_taken', 'player', [T('square', 300, 120, 0, 0.1, 0.18), N('lp', 1800, 500, 0, 0.08, 0.35)], { cd: 120, prio: 2, use: 'ผู้เล่นโดนตี', len: '0.1s', mood: 'อุ๊ก' });
  sfx('player_death', 'player', [...arp('triangle', [523, 466, 392, 311, 262], 0.14, 0.3, 0.22), T('sine', 130, 65, 0.6, 1.0, 0.25)], { cd: 1500, prio: 3, duck: 0.5, use: 'ผู้เล่นหมดสติ', len: '1.4s', mood: 'เศร้า' });
  sfx('respawn', 'player', arp('sine', [392, 523, 784], 0.1, 0.3, 0.2), { cd: 1000, prio: 2, use: 'ฟื้นที่จุดเซฟ', len: '0.5s', mood: 'ความหวัง' });
  // ---------------- skills by element / kind (Skill Registry links castSound/hitSound to these)
  sfx('skill_slash_cast', 'skills', [swing(700, 3600, 0.18, 0.55), T('sawtooth', 220, 440, 0, 0.14, 0.08)], { prio: 2, cd: 60, use: 'สกิลฟัน', len: '0.2s', mood: 'ดุดัน' });
  sfx('skill_slash_hit', 'skills', [N('lp', 4000, 900, 0, 0.12, 0.6), T('sine', 150, 60, 0, 0.14, 0.4)], { prio: 2, cd: 50, use: 'สกิลฟันโดน', len: '0.15s', mood: 'หนัก' });
  sfx('skill_fire_cast', 'skills', [N('lp', 600, 3000, 0, 0.3, 0.45, 1, 0.05), T('sawtooth', 110, 220, 0, 0.25, 0.1)], { prio: 2, cd: 80, use: 'ร่ายไฟ', len: '0.3s', mood: 'ลุกโชน' });
  sfx('skill_fire_hit', 'skills', [N('lp', 3000, 300, 0, 0.35, 0.6), T('sine', 120, 40, 0, 0.3, 0.4)], { prio: 2, cd: 60, use: 'ไฟระเบิด', len: '0.35s', mood: 'ตูม' });
  sfx('skill_ice_cast', 'skills', [...arp('sine', [2637, 3136, 3520], 0.04, 0.12, 0.12), N('hp', 6000, 9000, 0, 0.2, 0.1)], { prio: 2, cd: 80, use: 'ร่ายน้ำแข็ง', len: '0.25s', mood: 'เย็นใส' });
  sfx('skill_ice_hit', 'skills', [N('hp', 4000, 2500, 0, 0.15, 0.45), T('triangle', 2093, 1568, 0, 0.12, 0.14)], { prio: 2, cd: 60, use: 'น้ำแข็งแตก', len: '0.15s', mood: 'กร๊อบ' });
  sfx('skill_lightning_cast', 'skills', [T('square', 80, 2400, 0, 0.12, 0.12), N('hp', 3000, 7000, 0, 0.18, 0.35)], { prio: 2, cd: 70, use: 'สายฟ้า (ลูกไฟประกาย)', len: '0.2s', mood: 'แปลบ' });
  sfx('skill_lightning_hit', 'skills', [N('bp', 5000, 2000, 0, 0.12, 0.5, 2), T('square', 1200, 300, 0, 0.1, 0.12)], { prio: 2, cd: 60, use: 'สายฟ้าโดน', len: '0.12s', mood: 'ช็อต' });
  sfx('skill_wind_cast', 'skills', [N('bp', 400, 2600, 0, 0.35, 0.4, 0.8, 0.08)], { prio: 2, cd: 80, use: 'สกิลลม / ก้าวสายลม', len: '0.35s', mood: 'พัดวูบ' });
  sfx('skill_heal_cast', 'skills', [...arp('sine', [659, 880, 1047, 1319], 0.06, 0.25, 0.16), N('hp', 6000, 8000, 0.1, 0.3, 0.05)], { prio: 2, cd: 120, use: 'สกิลรักษา', len: '0.45s', mood: 'อ่อนโยน' });
  sfx('skill_holy_cast', 'skills', [T('triangle', 523, 523, 0, 0.4, 0.16), T('triangle', 784, 784, 0, 0.4, 0.12), T('sine', 1568, 1568, 0.05, 0.35, 0.1)], { prio: 2, cd: 100, use: 'สกิลศักดิ์สิทธิ์ / อวยพร', len: '0.45s', mood: 'สว่าง ประสานเสียง' });
  sfx('skill_holy_hit', 'skills', [T('sine', 2093, 1047, 0, 0.2, 0.25), N('hp', 5000, 3000, 0, 0.15, 0.25)], { prio: 2, cd: 60, use: 'แสงศักดิ์สิทธิ์โดน', len: '0.2s', mood: 'ประกายแสง' });
  sfx('skill_dark_cast', 'skills', [T('sawtooth', 110, 70, 0, 0.4, 0.14), T('sine', 55, 55, 0, 0.4, 0.3), N('lp', 400, 200, 0, 0.4, 0.2)], { prio: 2, cd: 100, use: 'สกิลมืด / วอยด์', len: '0.45s', mood: 'ทึบ น่ากลัว' });
  sfx('skill_dark_hit', 'skills', [T('sine', 90, 40, 0, 0.3, 0.45), N('lp', 900, 200, 0, 0.25, 0.3)], { prio: 2, cd: 60, use: 'มืดโดน', len: '0.3s', mood: 'จมลึก' });
  sfx('skill_poison_hit', 'skills', [N('bp', 1200, 600, 0, 0.2, 0.35, 4), T('sine', 300, 200, 0.02, 0.15, 0.12)], { prio: 2, cd: 60, use: 'พิษ / แทงรัว', len: '0.2s', mood: 'ฉ่า' });
  sfx('skill_buff_cast', 'skills', arp('triangle', [523, 784, 1047], 0.05, 0.2, 0.2), { prio: 2, cd: 120, use: 'บัฟตัวเอง', len: '0.3s', mood: 'มั่นใจ' });
  sfx('skill_teleport', 'skills', [T('sine', 300, 2400, 0, 0.25, 0.2), N('hp', 4000, 9000, 0, 0.25, 0.12)], { prio: 2, cd: 120, use: 'พุ่ง / เทเลพอร์ต', len: '0.25s', mood: 'วิ้ว' });
  sfx('skill_stealth', 'skills', [N('lp', 3000, 300, 0, 0.5, 0.3, 0.7, 0.05)], { prio: 2, cd: 200, use: 'ม่านควัน / ซ่อนตัว', len: '0.5s', mood: 'ฟู่' });
  sfx('skill_bomb_hit', 'skills', [N('lp', 2500, 150, 0, 0.5, 0.7), T('sine', 90, 30, 0, 0.4, 0.5)], { prio: 2, cd: 80, use: 'ระเบิด / โนวา / ฟันกวาด', len: '0.5s', mood: 'บึ้ม' });
  // ---------------- monsters by family (positional). [base pitch, timbre, noise filter]
  const FAM = {
    slime: [180, 'sine', 'lp'], plant: [320, 'triangle', 'bp'], beast: [120, 'sawtooth', 'lp'], insect: [900, 'square', 'hp'], goblin: [420, 'square', 'bp'],
    orc: [100, 'sawtooth', 'lp'], undead: [260, 'square', 'hp'], spirit: [700, 'sine', 'hp'], elemental: [90, 'triangle', 'lp'], machine: [150, 'square', 'bp'],
    dragon: [70, 'sawtooth', 'lp'], demon: [85, 'sawtooth', 'bp'], aquatic: [240, 'sine', 'bp'], desert: [300, 'triangle', 'hp'], ice: [1100, 'triangle', 'hp'], void: [60, 'sine', 'lp'],
  };
  for (const [fam, [p, w, fl]] of Object.entries(FAM)) {
    const o = { cat: 'sfx', pos: 1, prio: 1, family: fam };
    sfx(`mon_${fam}_idle`, 'monsters', [T(w, p, p * 1.25, 0, 0.18, 0.18), T(w, p * 1.25, p * 0.9, 0.18, 0.16, 0.14)], { ...o, prio: 0, cd: 1500, use: `เสียงประจำตัวมอนตระกูล ${fam}`, len: '0.35s', mood: 'ระยะใกล้เท่านั้น' });
    sfx(`mon_${fam}_attack`, 'monsters', [T(w, p * 1.4, p * 0.7, 0, 0.14, 0.3), N(fl, p * 8, p * 3, 0, 0.1, 0.25)], { ...o, cd: 150, use: `มอนตระกูล ${fam} โจมตี`, len: '0.15s', mood: 'ก้าวร้าว' });
    sfx(`mon_${fam}_hit`, 'monsters', [T(w, p * 1.8, p * 1.1, 0, 0.09, 0.22)], { ...o, cd: 90, use: `มอนตระกูล ${fam} โดนตี`, len: '0.1s', mood: 'เจ็บ' });
    sfx(`mon_${fam}_death`, 'monsters', [T(w, p * 1.3, p * 0.35, 0, 0.4, 0.3), N(fl, p * 6, p * 1.5, 0.05, 0.3, 0.2)], { ...o, prio: 2, cd: 120, use: `มอนตระกูล ${fam} ตาย`, len: '0.45s', mood: 'ล้ม' });
  }
  // bosses: their own sets
  sfx('boss_thornwood_spawn', 'monsters', [T('sawtooth', 55, 80, 0, 1.4, 0.3, 0.3), N('lp', 300, 900, 0, 1.4, 0.4, 1, 0.4)], { pos: 0, prio: 3, cd: 3000, use: 'Elder Thornwood ปรากฏ', len: '1.5s', mood: 'ไม้ลั่นเอี๊ยด ข่มขู่' });
  sfx('boss_thornwood_attack', 'monsters', [N('lp', 800, 120, 0, 0.5, 0.6), T('sine', 70, 35, 0, 0.5, 0.5)], { pos: 1, prio: 3, cd: 400, use: 'Thornwood ฟาดราก', len: '0.5s', mood: 'สะเทือน' });
  sfx('boss_thornwood_death', 'monsters', [T('sawtooth', 120, 30, 0, 2.0, 0.3), N('lp', 1200, 100, 0, 2.0, 0.5)], { pos: 0, prio: 3, cd: 3000, duck: 0.4, use: 'Thornwood ล้ม', len: '2s', mood: 'ต้นไม้ใหญ่ล้มครืน' });
  sfx('boss_ironjaw_spawn', 'monsters', [T('square', 70, 140, 0, 0.8, 0.2), N('bp', 600, 2400, 0, 1.0, 0.35, 3), T('sawtooth', 50, 50, 0.4, 0.8, 0.25)], { pos: 0, prio: 3, cd: 3000, use: 'Ironjaw ปรากฏ', len: '1.2s', mood: 'เครื่องจักรคำราม' });
  sfx('boss_ironjaw_attack', 'monsters', [T('square', 160, 60, 0, 0.3, 0.3), N('bp', 2500, 800, 0, 0.3, 0.5, 4)], { pos: 1, prio: 3, cd: 400, use: 'Ironjaw โจมตี', len: '0.35s', mood: 'เหล็กกระแทก' });
  sfx('boss_ironjaw_death', 'monsters', [N('bp', 3000, 200, 0, 1.6, 0.5, 2), T('square', 200, 30, 0, 1.6, 0.2), T('sine', 60, 25, 0.3, 1.4, 0.4)], { pos: 0, prio: 3, cd: 3000, duck: 0.4, use: 'Ironjaw พัง', len: '1.8s', mood: 'ระเบิดเฟือง' });
  sfx('boss_spawn', 'monsters', [T('sawtooth', 60, 90, 0, 1.0, 0.25, 0.2), N('lp', 500, 1500, 0, 1.0, 0.3)], { pos: 0, prio: 3, cd: 3000, use: 'บอสทั่วไปปรากฏ', len: '1s', mood: 'คุกคาม' });
  sfx('boss_death', 'monsters', [T('sawtooth', 140, 35, 0, 1.4, 0.3), N('lp', 1500, 150, 0, 1.4, 0.4)], { pos: 0, prio: 3, cd: 3000, duck: 0.4, use: 'บอสทั่วไปตาย', len: '1.4s', mood: 'ชัยชนะ' });
  sfx('boss_warning', 'monsters', [T('square', 440, 440, 0, 0.12, 0.12), T('square', 440, 440, 0.2, 0.12, 0.12), N('lp', 400, 900, 0, 0.6, 0.25)], { prio: 3, cd: 600, use: 'เตือนท่าระเบิดวงกว้างของบอส', len: '0.6s', mood: 'อันตราย!' });
  sfx('boss_phase', 'monsters', [T('sawtooth', 80, 160, 0, 0.8, 0.3), N('bp', 500, 2000, 0, 0.8, 0.35, 2)], { prio: 3, cd: 2000, duck: 0.35, use: 'บอสเปลี่ยนเฟส/คลั่ง', len: '0.8s', mood: 'คำราม' });
  // ---------------- player / world
  const STEP = { grass: ['lp', 1400, 0.22], stone: ['bp', 2200, 0.28], wood: ['bp', 700, 0.3], sand: ['hp', 2500, 0.18], dirt: ['lp', 900, 0.25], snow: ['lp', 2000, 0.22], water: ['bp', 1200, 0.25], cave: ['bp', 1600, 0.26] };
  for (const [g, [fl, f, v]] of Object.entries(STEP)) sfx('footstep_' + g, 'player', [N(fl, f, f * 0.7, 0, 0.07, v, g === 'stone' ? 3 : 1.2), ...(g === 'wood' ? [T('triangle', 180, 140, 0, 0.05, 0.1)] : g === 'water' ? [T('sine', 600, 900, 0, 0.06, 0.06)] : [])], { prio: 0, cd: 120, vol: 0.55, terrain: g, use: `เสียงเท้าบนพื้น ${g}`, len: '0.07s', mood: 'เบากว่าเสียงต่อสู้' });
  sfx('portal_enter', 'world', [T('sine', 200, 1600, 0, 0.5, 0.22), N('hp', 3000, 9000, 0, 0.5, 0.12), T('triangle', 800, 2400, 0.1, 0.4, 0.1)], { prio: 2, cd: 600, use: 'เข้าพอร์ทัล / เปลี่ยนแผนที่', len: '0.6s', mood: 'เวท วาร์ป' });
  sfx('portal_idle', 'world', [T('sine', 220, 220, 0, 1.6, 0.12, 0.4), T('sine', 330, 335, 0, 1.6, 0.06, 0.4), N('hp', 5000, 6000, 0, 1.6, 0.03, 1, 0.4)], { pos: 1, loop: 1, prio: 0, cd: 0, use: 'พอร์ทัลฮัมเบาๆ (ตามระยะ)', len: '1.6s loop', mood: 'ลึกลับ' });
  sfx('smith_hammer', 'world', [T('square', 1600, 1500, 0, 0.05, 0.12), T('triangle', 3200, 3000, 0, 0.18, 0.1), N('bp', 4000, 3000, 0, 0.06, 0.2, 4)], { pos: 1, prio: 0, cd: 600, use: 'ค้อนช่างตีเหล็ก (เป็นช่วงๆ ตามระยะ)', len: '0.2s', mood: 'โลหะก้อง' });
  sfx('campfire', 'world', [N('bp', 1200, 1500, 0, 1.2, 0.08, 1, 0.3), N('hp', 4000, 4000, 0.3, 0.04, 0.1), N('hp', 4000, 4000, 0.8, 0.03, 0.08)], { pos: 1, loop: 1, prio: 0, cd: 0, use: 'กองไฟในค่าย', len: '1.2s loop', mood: 'อบอุ่น' });
  sfx('gather_herb', 'world', [N('hp', 3000, 5000, 0, 0.15, 0.25), T('triangle', 880, 1175, 0.05, 0.1, 0.12)], { cd: 200, use: 'เก็บสมุนไพร/ดอกไม้', len: '0.2s', mood: 'ใบไม้กรอบแกรบ' });
  sfx('gather_ore', 'world', [T('square', 1300, 1100, 0, 0.06, 0.16), N('bp', 2500, 1500, 0, 0.1, 0.4, 3), T('square', 1250, 1050, 0.15, 0.06, 0.14)], { cd: 200, use: 'ขุดแร่', len: '0.25s', mood: 'ก๊ง ก๊ง' });
  sfx('gather_generic', 'world', [T('triangle', 660, 990, 0, 0.12, 0.2)], { cd: 200, use: 'แตะจุดเควส/จุดเก็บของ', len: '0.12s', mood: 'สะกิด' });
  sfx('node_shrine', 'world', [...arp('sine', [523, 784, 1047, 1568], 0.12, 0.5, 0.14), N('hp', 6000, 9000, 0, 0.8, 0.04)], { prio: 2, cd: 400, use: 'จุดศาลจันทร์', len: '0.9s', mood: 'ศักดิ์สิทธิ์ เงียบสงบ' });
  sfx('wave_start', 'world', [T('sawtooth', 220, 220, 0, 0.25, 0.14), T('sawtooth', 294, 294, 0.3, 0.25, 0.14), T('sawtooth', 330, 330, 0.6, 0.5, 0.16)], { prio: 3, cd: 1500, duck: 0.3, use: 'ระลอกศัตรู (บททดสอบแวนการ์ด)', len: '1.1s', mood: 'แตรศึก' });

  // ================= MUSIC. Each theme is a small generative score played by the synth until a file is set.
  // type: town field dungeon boss event. Region themes give each region its own sound identity.
  const M = {};
  const mus = (id, type, region, theme, o = {}) => { M[id] = Object.assign({ id, cat: 'music', type, region, dir: 'music/' + type, theme, loop: 1, prio: 3, status: 'placeholder' }, o); };
  // theme: bpm, root (MIDI note), mode, prog (scale degrees per bar), lead/bass/pad waveforms, drum density 0-1, delay mix, seed
  mus('bgm_lumira_village', 'town', 'heartland', { bpm: 84, root: 62, mode: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 4, 0], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0.15, density: 0.45, delay: 0.25, seed: 11 }, { use: 'หมู่บ้านลูมิร่า', mood: 'สงบ สดใส เมืองเริ่มต้น', len: '2-3 นาที loop' });
  mus('bgm_elyndra_capital', 'town', 'heartland', { bpm: 96, root: 60, mode: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], lead: 'sawtooth', bass: 'triangle', pad: 'triangle', drums: 0.45, density: 0.55, delay: 0.2, march: 1, seed: 23 }, { use: 'นครเอลินดรา', mood: 'ยิ่งใหญ่แต่เป็นมิตร', len: '2-3 นาที loop' });
  mus('bgm_beginner_meadow', 'field', 'heartland', { bpm: 108, root: 65, mode: 'lydian', prog: [0, 1, 4, 0, 5, 1, 4, 4], lead: 'sine', vib: 1, bass: 'triangle', pad: 'sine', drums: 0.3, density: 0.6, delay: 0.3, seed: 31 }, { use: 'ทุ่งหญ้าผู้เริ่มต้น', mood: 'เบา สดชื่น สำรวจโลก', len: '2 นาที loop' });
  mus('bgm_greenwood', 'field', 'heartland', { bpm: 92, root: 57, mode: 'dorian', prog: [0, 3, 0, 6, 0, 3, 4, 6], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0.35, density: 0.5, delay: 0.35, seed: 47 }, { use: 'ป่ากรีนวูด', mood: 'ธรรมชาติ + ลึกลับเล็กน้อย', len: '2-3 นาที loop' });
  mus('bgm_moonlit_creek', 'field', 'heartland', { bpm: 72, root: 64, mode: 'aeolian', prog: [0, 5, 3, 6, 0, 5, 4, 4], lead: 'bell', bass: 'sine', pad: 'sine', drums: 0.08, density: 0.35, delay: 0.5, seed: 53 }, { use: 'ลำธารแสงจันทร์', mood: 'สงบ เวทมนตร์ กลางคืน', len: '2-3 นาที loop' });
  mus('bgm_old_mine', 'dungeon', 'heartland', { bpm: 70, root: 52, mode: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 4, 1], lead: 'triangle', bass: 'sawtooth', pad: 'drone', drums: 0.25, density: 0.28, delay: 0.55, seed: 67 }, { use: 'เหมืองเก่า', mood: 'มืด ก้อง ตึงเครียดเล็กน้อย', len: '2 นาที loop' });
  mus('bgm_golden_fields', 'field', 'heartland', { bpm: 100, root: 62, mode: 'mixolydian', prog: [0, 6, 3, 0, 4, 6, 3, 0], lead: 'square', bass: 'triangle', pad: 'sine', drums: 0.4, density: 0.55, delay: 0.2, seed: 71 }, { use: 'ทุ่งทรายสีทอง', mood: 'ผจญภัยกลางแดด', len: '2 นาที loop' });
  mus('bgm_oasis_woods', 'field', 'heartland', { bpm: 94, root: 60, mode: 'dorian', prog: [0, 4, 3, 0, 6, 4, 3, 4], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0.3, density: 0.5, delay: 0.3, seed: 79 }, { use: 'ป่าโอเอซิส', mood: 'ร่มรื่น', len: '2 นาที loop' });
  mus('bgm_heartland_field', 'field', 'heartland', { bpm: 104, root: 62, mode: 'major', prog: [0, 3, 4, 5, 0, 3, 4, 4], lead: 'triangle', bass: 'triangle', pad: 'sine', drums: 0.35, density: 0.55, delay: 0.25, seed: 83 }, { use: 'ฟิลด์อื่นใน Heartland', mood: 'อบอุ่น ผจญภัย', len: '2 นาที loop' });
  // regions 2-8: town / field / dungeon each
  const REG = {
    verdant: { root: 59, mode: 'dorian', lead: 'triangle', bass: 'sine', drums: 0.6, tribal: 1, mood: 'ป่า เวทมนตร์ ชนเผ่า' },
    ashen: { root: 50, mode: 'harmonicMinor', lead: 'sawtooth', bass: 'sawtooth', drums: 0.7, march: 1, mood: 'ไฟ สงคราม ภูเขาไฟ' },
    azure: { root: 62, mode: 'mixolydian', lead: 'square', bass: 'triangle', drums: 0.5, shanty: 1, mood: 'ทะเล ผจญภัย โจรสลัด' },
    sandsea: { root: 57, mode: 'phrygianDom', lead: 'sawtooth', bass: 'triangle', drums: 0.45, mood: 'ทะเลทราย อารยธรรมโบราณ' },
    frostland: { root: 64, mode: 'aeolian', lead: 'bell', bass: 'sine', drums: 0.12, mood: 'หนาว ลึกลับ ออร์เคสตรา' },
    arcane: { root: 66, mode: 'wholeTone', lead: 'bell', bass: 'sine', drums: 0.15, mood: 'เวท รูน ดวงดาว' },
    void: { root: 48, mode: 'diminished', lead: 'sawtooth', bass: 'sawtooth', drums: 0.35, mood: 'มืด ลางร้าย End Game' },
  };
  let seed = 100;
  for (const [r, P] of Object.entries(REG)) for (const [type, bpm, dens, pad] of [['town', 88, 0.45, 'sine'], ['field', 104, 0.55, 'sine'], ['dungeon', 76, 0.32, 'drone']]) {
    mus(`bgm_${r}_${type}`, type, r, { bpm: Math.round(bpm * (r === 'void' ? 0.9 : 1)), root: P.root, mode: P.mode, prog: type === 'dungeon' ? [0, 1, 0, 6, 0, 1, 4, 1] : [0, 3, 4, 0, 5, 3, 4, 4], lead: P.lead, bass: P.bass, pad, drums: Math.min(1, P.drums * (type === 'town' ? 0.6 : 1)), density: dens, delay: type === 'dungeon' ? 0.5 : 0.3, march: P.march, seed: seed += 7 }, { use: `${type} ใน region ${r}`, mood: P.mood, len: '2-3 นาที loop' });
  }
  // Verdant Wilds map themes (on top of the region town/field/dungeon set) + its boss theme
  mus('bgm_mushroom_hollow', 'field', 'verdant', { bpm: 84, root: 58, mode: 'dorian', prog: [0, 1, 3, 1, 0, 6, 4, 1], lead: 'bell', bass: 'sine', pad: 'sine', drums: 0.25, density: 0.4, delay: 0.5, seed: 211 }, { use: 'โพรงเห็ด', mood: 'แปลกตา เรืองแสง ฝันๆ' });
  mus('bgm_spirit_grove', 'field', 'verdant', { bpm: 66, root: 63, mode: 'lydian', prog: [0, 4, 1, 4, 0, 5, 1, 4], lead: 'bell', vib: 1, bass: 'sine', pad: 'sine', drums: 0.05, density: 0.3, delay: 0.6, seed: 223 }, { use: 'สวนวิญญาณ', mood: 'ศักดิ์สิทธิ์ เงียบสงบ' });
  mus('bgm_thornmire', 'field', 'verdant', { bpm: 78, root: 53, mode: 'phrygian', prog: [0, 1, 0, 5, 0, 1, 6, 5], lead: 'triangle', bass: 'sawtooth', pad: 'drone', drums: 0.45, density: 0.4, delay: 0.4, tribal: 1, seed: 227 }, { use: 'หนองหนาม', mood: 'หนองมืด อันตราย' });
  mus('bgm_boss_verdant', 'boss', 'verdant', { bpm: 144, root: 59, mode: 'dorian', prog: [0, 0, 6, 4, 0, 0, 3, 6], lead: 'sawtooth', bass: 'sawtooth', pad: 'drone', drums: 1, density: 0.8, delay: 0.2, boss: 1, tribal: 1, seed: 233 }, { use: 'บอสป่าเขียวขจี', mood: 'กลองชนเผ่า ดุดัน' });
  mus('bgm_boss_common', 'boss', 'any', { bpm: 150, root: 57, mode: 'harmonicMinor', prog: [0, 0, 5, 4, 0, 0, 6, 4], lead: 'sawtooth', bass: 'sawtooth', pad: 'sawtooth', drums: 1, density: 0.8, delay: 0.15, boss: 1, seed: 201 }, { use: 'บอสทั่วไป', mood: 'เข้มข้น เร็ว', len: '1.5-2 นาที loop' });
  mus('bgm_boss_thornwood', 'boss', 'heartland', { bpm: 138, root: 55, mode: 'dorian', prog: [0, 0, 6, 3, 0, 0, 4, 6], lead: 'sawtooth', bass: 'sawtooth', pad: 'drone', drums: 1, density: 0.75, delay: 0.2, boss: 1, tribal: 1, seed: 211 }, { use: 'บอส Elder Thornwood', mood: 'ป่าคลั่ง กลองหนัก', len: '1.5-2 นาที loop' });
  mus('bgm_boss_ironjaw', 'boss', 'heartland', { bpm: 156, root: 52, mode: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 4, 1], lead: 'square', bass: 'sawtooth', pad: 'sawtooth', drums: 1, density: 0.85, delay: 0.15, boss: 1, march: 1, seed: 223 }, { use: 'บอส Ironjaw', mood: 'เครื่องจักร ดุดัน', len: '1.5-2 นาที loop' });
  mus('bgm_event_festival', 'event', 'any', { bpm: 120, root: 64, mode: 'major', prog: [0, 3, 4, 0, 0, 3, 4, 4], lead: 'square', bass: 'triangle', pad: 'triangle', drums: 0.7, density: 0.7, delay: 0.15, seed: 301 }, { use: 'อีเวนต์/เทศกาล (override ชั่วคราว)', mood: 'สนุก', len: '1-2 นาที loop' });
  mus('bgm_event_trial', 'event', 'any', { bpm: 128, root: 57, mode: 'aeolian', prog: [0, 6, 5, 6, 0, 6, 4, 4], lead: 'sawtooth', bass: 'sawtooth', pad: 'triangle', drums: 0.85, density: 0.7, delay: 0.15, march: 1, seed: 311 }, { use: 'บททดสอบเปลี่ยนอาชีพ (ป้องกันหมู่บ้าน)', mood: 'ฮึกเหิม เร่งเร้า', len: '1-2 นาที loop' });

  // ================= AMBIENT loops (procedural layers until files are set)
  const A = {};
  const amb = (id, dir, layers, o = {}) => { A[id] = Object.assign({ id, cat: 'ambient', dir: 'ambient/' + dir, layers, loop: 1, prio: 0, status: 'placeholder' }, o); };
  // layers: wind {lvl, f}, water {lvl, f}, birds {rate}, crickets {rate}, crowd {lvl}, clinks {rate}, drips {rate}, rumble {lvl}, crackle {rate}, waves {lvl}, gulls {rate}, shimmer {rate}, hum {lvl, f}
  amb('amb_village', 'town', { wind: { lvl: 0.25, f: 700 }, birds: { rate: 0.25 }, crowd: { lvl: 0.12 } }, { use: 'หมู่บ้าน', mood: 'นกร้อง ลมอ่อน ผู้คนเบาๆ' });
  amb('amb_town', 'town', { crowd: { lvl: 0.3 }, clinks: { rate: 0.4 }, wind: { lvl: 0.12, f: 600 } }, { use: 'เมืองหลวง', mood: 'ตลาด ฝูงชน' });
  amb('amb_meadow', 'forest', { wind: { lvl: 0.35, f: 900 }, birds: { rate: 0.45 } }, { use: 'ทุ่งหญ้า', mood: 'ลม นก' });
  amb('amb_forest', 'forest', { wind: { lvl: 0.3, f: 500 }, birds: { rate: 0.35 }, leaves: { lvl: 0.12 } }, { use: 'ป่า', mood: 'ใบไม้ นก ลม' });
  amb('amb_night_creek', 'forest', { water: { lvl: 0.35, f: 1600 }, crickets: { rate: 1.6 }, wind: { lvl: 0.12, f: 400 } }, { use: 'ลำธารกลางคืน', mood: 'น้ำไหล จิ้งหรีด' });
  amb('amb_cave', 'cave', { drips: { rate: 0.6 }, rumble: { lvl: 0.25 }, wind: { lvl: 0.12, f: 250 } }, { use: 'เหมือง/ถ้ำ', mood: 'น้ำหยด หินก้อง ลมเย็น' });
  amb('amb_desert', 'desert', { wind: { lvl: 0.45, f: 1100 } }, { use: 'ทะเลทราย', mood: 'ลมร้อน' });
  amb('amb_ocean', 'ocean', { waves: { lvl: 0.45 }, gulls: { rate: 0.2 } }, { use: 'ชายหาด/ท่าเรือ', mood: 'คลื่น นกนางนวล' });
  amb('amb_snow', 'snow', { wind: { lvl: 0.45, f: 1800 } }, { use: 'ดินแดนหิมะ', mood: 'ลมหนาว' });
  amb('amb_volcano', 'cave', { rumble: { lvl: 0.45 }, crackle: { rate: 1.2 } }, { use: 'ภูเขาไฟ', mood: 'ลาวา ไฟปะทุ' });
  amb('amb_magic', 'town', { shimmer: { rate: 0.6 }, wind: { lvl: 0.15, f: 1400 }, hum: { lvl: 0.08, f: 110 } }, { use: 'ที่ราบสูงอาร์เคน', mood: 'ประกายเวท' });
  amb('amb_void', 'cave', { hum: { lvl: 0.2, f: 55 }, rumble: { lvl: 0.3 }, wind: { lvl: 0.2, f: 300 } }, { use: 'แนวหน้าวอยด์', mood: 'ความว่างเปล่า น่ากลัว' });
  amb('amb_jungle', 'forest', { birds: { rate: 0.7 }, leaves: { lvl: 0.2 }, crickets: { rate: 0.5 }, wind: { lvl: 0.2, f: 450 } }, { use: 'ป่าลึก', mood: 'นกป่า แมลง ใบไม้หนา' });
  amb('amb_spores', 'forest', { drips: { rate: 0.4 }, shimmer: { rate: 0.4 }, hum: { lvl: 0.05, f: 140 } }, { use: 'โพรงเห็ด', mood: 'สปอร์ลอย น้ำหยด' });
  amb('amb_spirit', 'forest', { shimmer: { rate: 0.5 }, wind: { lvl: 0.15, f: 600 }, crickets: { rate: 0.6 } }, { use: 'สวนวิญญาณ', mood: 'ประกายวิญญาณ ลมเย็น' });
  amb('amb_swamp', 'forest', { water: { lvl: 0.25, f: 700 }, crickets: { rate: 1.2 }, drips: { rate: 0.3 } }, { use: 'หนองหนาม', mood: 'น้ำนิ่ง กบ จิ้งหรีด' });
  amb('amb_dungeon', 'cave', { rumble: { lvl: 0.35 }, drips: { rate: 0.3 }, hum: { lvl: 0.06, f: 70 } }, { use: 'ดันเจี้ยนทั่วไป', mood: 'ก้อง ตึงเครียด' });

  // ================= links used by game events (all ids above)
  const LINKS = {
    weapon: { // weapon type -> [swing, hit]
      sword: ['sword_swing', 'sword_hit'], greatsword: ['mace_swing', 'heavy_hit'], dagger: ['dagger_swing', 'dagger_hit'], bow: ['bow_shoot', 'arrow_hit'],
      staff: ['magic_cast', 'magic_hit'], wand: ['magic_cast', 'magic_hit'], mace: ['mace_swing', 'heavy_hit'], spear: ['spear_attack', 'sword_hit'], device: ['device_shot', 'arrow_hit'], none: ['sword_swing', 'unarmed_hit'],
    },
    skillKind: { // fallback when a skill has no castSound/hitSound of its own: element or effect -> [cast, hit]
      slash: ['skill_slash_cast', 'skill_slash_hit'], fire: ['skill_fire_cast', 'skill_fire_hit'], water: ['skill_ice_cast', 'skill_ice_hit'], ice: ['skill_ice_cast', 'skill_ice_hit'],
      lightning: ['skill_lightning_cast', 'skill_lightning_hit'], wind: ['skill_wind_cast', 'skill_slash_hit'], heal: ['skill_heal_cast', null], holy: ['skill_holy_cast', 'skill_holy_hit'],
      dark: ['skill_dark_cast', 'skill_dark_hit'], poison: ['skill_slash_cast', 'skill_poison_hit'], buff: ['skill_buff_cast', null], teleport: ['skill_teleport', 'skill_slash_hit'], arrow: ['bow_shoot', 'arrow_hit'], area: ['skill_slash_cast', 'skill_bomb_hit'],
    },
    terrain: { 0: 'sand', 1: 'grass', 2: 'water', 4: 'dirt', 8: 'stone', 10: 'stone', 11: 'grass', 12: 'wood' }, // tile -> footstep
    envAmbient: { verdant_town: 'amb_village', jungle: 'amb_jungle', mushroom: 'amb_spores', spirit: 'amb_spirit', valley: 'amb_meadow', swamp: 'amb_swamp', heartwood: 'amb_dungeon', village: 'amb_village', town_sand: 'amb_town', meadow: 'amb_meadow', forest: 'amb_forest', forest_deep: 'amb_forest', night_creek: 'amb_night_creek', cave: 'amb_cave', desert: 'amb_desert', snow: 'amb_snow' },
  };
  const R = { SFX: S, MUSIC: M, AMBIENT: A, LINKS, FAMILIES: Object.keys(FAM), base: 'assets/audio/' };
  R.all = () => Object.assign({}, S, M, A);
  if (typeof module !== 'undefined' && module.exports) module.exports = R; else root.AUDIO_REG = R;
})(typeof window !== 'undefined' ? window : this);
