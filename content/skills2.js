'use strict';
// Second-class skills (M3). Same registry shape as content/skills.js, plus:
//   tier 2, job: required job level, maxLv: 5 (learned with skill points), up: what grows per level
//     (mult = damage +10%/lv, heal = healing/barrier +12%/lv, dur = durations +15%/lv, buff = buff values +15%/lv)
//   type: target | self | area (around self, or around the target with at:'target' + r) | party (self + party in r)
//         | ground (trap / mine / turret at your feet) | revive (nearest fallen player in range) | passive
//   effects: mult hits magic element crit | rage (more damage at low HP) | execute {below, mult} | backstab (x when
//     the monster isn't fighting you) | pierce | chain {n, r, fall} | drain | stun slow (ms) | dot {k, ms, pct}
//     | debuff {atk, def, ms} | mark {taken, crit, ms} | dash | taunt | heal {pct, int} | barrier {pct, int, ms}
//     | buff {...} (atk matk def flee aspd crit spd range dr evade regen spCut potion) | trap {...} | turret {...}
//     | revive (HP fraction) | passive {per level: defPct hpPct atkPct matkPct crit hit flee aspdPct healPct potionPct
//     durPct drainPct devicePct lowAtk}
//   needs: weapon types that must be equipped. auto: AUTO Skill kind (attack area heal buff defense debuff execute trap)
// Icons: public/assets/skills/<id>.webp (cut from the ELYNDRA skill sheets, tools/art/build_skill_icons.py).
const S = {};
const sk = (cls, id, job, n, th, o) => { S[id] = Object.assign({ cls, tier: 2, job, maxLv: 5, lv: 50, n, th, range: 0, sp: 0, cd: 0 }, o); };
const ONEHAND = ['sword', 'mace', 'dagger', 'spear'];

// ---------------- KNIGHT: tank, guards the party, holds the line
sk('knight', 'kn_fort', 1, 'Fortified Armor', 'เกราะป้อมปราการ', { type: 'passive', passive: { defPct: 6, hpPct: 3 }, d: 'ติดตัว: DEF +6% และ MaxHP +3% ต่อเลเวล' });
sk('knight', 'kn_bash', 1, 'Shield Bash', 'โล่กระแทก', { type: 'target', range: 1.6, sp: 16, cd: 5000, mult: 1.8, stun: 1500, needs: ONEHAND, up: 'mult', auto: 'attack', d: 'กระแทกด้วยโล่ ×1.8 และทำให้มึน 1.5 วิ (ต้องถืออาวุธมือเดียว+โล่)' });
sk('knight', 'kn_stance', 5, 'Guardian Stance', 'ท่าผู้พิทักษ์', { type: 'self', sp: 20, cd: 30000, buff: { id: 'guard', ms: 20000, def: 0.4, spd: -0.15, th: 'ท่าผู้พิทักษ์' }, up: 'buff', auto: 'buff', d: 'DEF +40% แต่เดินช้าลง 15% เป็นเวลา 20 วิ' });
sk('knight', 'kn_taunt', 10, 'Taunt', 'ยั่วยุ', { type: 'area', range: 4.5, sp: 12, cd: 8000, mult: 0, taunt: 1, debuff: { atk: -0.1, ms: 5000 }, up: 'dur', auto: 'area', d: 'ดึงมอนสเตอร์รอบตัว 4.5 ช่องให้มาสู้กับเรา และลด ATK ของพวกมัน 10%' });
sk('knight', 'kn_iron', 20, 'Iron Guard', 'ปราการเหล็ก', { type: 'self', sp: 24, cd: 25000, buff: { id: 'iron', ms: 6000, dr: 0.4, th: 'ปราการเหล็ก' }, up: 'dur', auto: 'defense', d: 'ลดความเสียหายที่ได้รับ 40% เป็นเวลา 6 วิ' });
sk('knight', 'kn_wave', 30, 'Shield Wave', 'คลื่นโล่', { type: 'area', range: 2.8, sp: 30, cd: 9000, mult: 1.6, slow: 2500, sig: 1, up: 'mult', auto: 'area', d: 'สกิลประจำอาชีพ: คลื่นกระแทกรอบตัว 2.8 ช่อง ×1.6 และทำให้ช้าลง' });
// ---------------- BERSERKER: risk / reward, stronger the more hurt
sk('berserker', 'bs_frenzy', 1, 'Battle Frenzy', 'คลั่งศึก', { type: 'passive', passive: { aspdPct: 2, lowAtk: 3 }, d: 'ติดตัว: ตีเร็วขึ้น 2% ต่อเลเวล และเมื่อ HP ต่ำกว่า 50% ATK +3% ต่อเลเวล' });
sk('berserker', 'bs_rage', 1, 'Rage Strike', 'ฟันโทสะ', { type: 'target', range: 1.6, sp: 18, cd: 4000, mult: 2.2, rage: 1.2, up: 'mult', auto: 'attack', d: 'ฟัน ×2.2 ยิ่ง HP เราต่ำยิ่งแรง (สูงสุด +120%)' });
sk('berserker', 'bs_whirl', 5, 'Whirlwind', 'พายุหมุน', { type: 'area', range: 2.2, sp: 28, cd: 7000, mult: 1.3, hits: 2, up: 'mult', auto: 'area', d: 'หมุนฟันรอบตัว 2 ครั้ง ×1.3' });
sk('berserker', 'bs_fury', 10, 'Blood Fury', 'โลหิตเดือด', { type: 'self', sp: 20, cd: 40000, buff: { id: 'fury', ms: 15000, atk: 0.3, aspd: 0.2, def: -0.3, th: 'โลหิตเดือด' }, up: 'buff', auto: 'buff', d: 'ATK +30% ตีเร็ว +20% แต่ DEF -30% เป็นเวลา 15 วิ' });
sk('berserker', 'bs_exec', 20, 'Execution', 'ประหาร', { type: 'target', range: 1.6, sp: 30, cd: 12000, mult: 2.0, execute: { below: 0.35, mult: 2.0 }, up: 'mult', auto: 'execute', d: 'ฟันลง ×2.0 แรงขึ้นอีก 2 เท่าเมื่อเป้าหมาย HP ต่ำกว่า 35%' });
sk('berserker', 'bs_warcry', 30, 'War Cry', 'คำรามศึก', { type: 'party', r: 7, sp: 35, cd: 60000, buff: { id: 'warcry', ms: 20000, atk: 0.2, crit: 10, th: 'คำรามศึก' }, sig: 1, up: 'buff', auto: 'buff', d: 'สกิลประจำอาชีพ: ATK +20% CRIT +10 ให้ตัวเองและปาร์ตี้รอบตัว 20 วิ' });
// ---------------- SHARPSHOOTER: range and precision
sk('sharpshooter', 'ss_precision', 1, 'Precision Mastery', 'ความแม่นยำขั้นสูง', { type: 'passive', passive: { crit: 2, hit: 4 }, d: 'ติดตัว: CRIT +2 และ HIT +4 ต่อเลเวล' });
sk('sharpshooter', 'ss_pierce', 1, 'Piercing Shot', 'ศรเจาะทะลวง', { type: 'target', range: 9, sp: 16, cd: 3000, mult: 2.2, pierce: 1, needs: ['bow'], up: 'mult', auto: 'attack', d: 'ยิงศร ×2.2 ทะลุโดนทุกตัวที่อยู่ในแนวเดียวกัน (ต้องใช้ธนู)' });
sk('sharpshooter', 'ss_charged', 5, 'Charged Shot', 'ศรอัดพลัง', { type: 'target', range: 10, sp: 26, cd: 8000, cast: 900, mult: 2.4, crit: 1, needs: ['bow'], up: 'mult', auto: 'attack', d: 'ง้างธนู 0.9 วิ แล้วยิง ×2.4 คริติคอลเสมอ ระยะ 10 ช่อง' });
sk('sharpshooter', 'ss_focus', 10, 'Critical Focus', 'สมาธิคริติคอล', { type: 'self', sp: 18, cd: 30000, buff: { id: 'cfocus', ms: 15000, crit: 25, th: 'สมาธิคริติคอล' }, up: 'buff', auto: 'buff', d: 'CRIT +25 เป็นเวลา 15 วิ' });
sk('sharpshooter', 'ss_eagle', 20, 'Eagle Eye', 'ตาเหยี่ยว', { type: 'self', sp: 24, cd: 45000, buff: { id: 'eagle', ms: 25000, range: 3, hit: 20, th: 'ตาเหยี่ยว' }, up: 'dur', auto: 'buff', d: 'ระยะโจมตีปกติ +3 ช่อง HIT +20 เป็นเวลา 25 วิ' });
sk('sharpshooter', 'ss_rain', 30, 'Rain of Arrows', 'ฝนศร', { type: 'area', at: 'target', range: 9, r: 2.6, sp: 34, cd: 10000, mult: 1.0, hits: 3, needs: ['bow'], sig: 1, up: 'mult', auto: 'area', d: 'สกิลประจำอาชีพ: ห่าศร 3 ระลอก ×1.0 รอบเป้าหมาย 2.6 ช่อง' });
// ---------------- BEAST HUNTER: traps, marks, the hunt (pets come later)
sk('beasthunter', 'bh_tracker', 1, 'Wild Tracker', 'สัญชาตญาณนักล่า', { type: 'passive', passive: { atkPct: 2, flee: 2 }, d: 'ติดตัว: ATK +2% และ FLEE +2 ต่อเลเวล' });
sk('beasthunter', 'bh_snare', 1, 'Snare Trap', 'กับดักบ่วง', { type: 'ground', sp: 14, cd: 8000, trap: { k: 'snare', ms: 25000, r: 1.2, mult: 1.0, stun: 3000 }, up: 'dur', auto: 'trap', d: 'วางกับดักที่เท้า มอนที่เหยียบโดน ×1.0 และติดบ่วง 3 วิ (อยู่ 25 วิ)' });
sk('beasthunter', 'bh_mark', 5, 'Hunter Mark', 'รอยล่า', { type: 'target', range: 9, sp: 12, cd: 12000, mult: 0.8, mark: { taken: 0.2, ms: 12000 }, up: 'dur', auto: 'debuff', d: 'ทำเครื่องหมายเป้าหมาย: ได้รับความเสียหาย +20% นาน 12 วิ' });
sk('beasthunter', 'bh_ptrap', 10, 'Poison Trap', 'กับดักพิษ', { type: 'ground', sp: 20, cd: 10000, trap: { k: 'poison', ms: 25000, r: 1.8, mult: 0.8, dot: { k: 'poison', ms: 8000, pct: 0.35 } }, up: 'mult', auto: 'trap', d: 'กับดักพิษ: มอนทุกตัวรอบกับดัก 1.8 ช่องติดพิษ 8 วิ' });
sk('beasthunter', 'bh_instinct', 20, 'Beast Instinct', 'สัญชาตญาณสัตว์ป่า', { type: 'self', sp: 22, cd: 40000, buff: { id: 'instinct', ms: 20000, atk: 0.2, aspd: 0.15, flee: 0.2, th: 'สัญชาตญาณสัตว์ป่า' }, up: 'buff', auto: 'buff', d: 'ATK +20% ตีเร็ว +15% FLEE +20% เป็นเวลา 20 วิ' });
sk('beasthunter', 'bh_rapid', 30, 'Rapid Hunt', 'ล่าไม่หยุด', { type: 'target', range: 8, sp: 36, cd: 14000, mult: 0.9, hits: 5, sig: 1, up: 'mult', auto: 'attack', d: 'สกิลประจำอาชีพ: ยิง/ฟันรัว 5 ครั้ง ×0.9 (แรงมากกับเป้าที่มีรอยล่า)' });
// ---------------- ELEMENTALIST: fire = damage, ice = control, lightning = chains
sk('elementalist', 'el_mastery', 1, 'Elemental Mastery', 'ปรมาจารย์ธาตุ', { type: 'passive', passive: { matkPct: 3 }, d: 'ติดตัว: MATK +3% ต่อเลเวล' });
sk('elementalist', 'el_chain', 1, 'Chain Lightning', 'สายฟ้าลูกโซ่', { type: 'target', range: 8, sp: 22, cd: 5000, mult: 2.0, magic: 1, element: 'wind', chain: { n: 3, r: 3.5, fall: 0.7 }, up: 'mult', auto: 'attack', d: 'สายฟ้า ×2.0 กระโดดต่อไปอีก 3 ตัว (แรงลดลงทีละ 30%)' });
sk('elementalist', 'el_frost', 5, 'Frost Field', 'ทุ่งน้ำแข็ง', { type: 'area', at: 'target', range: 8, r: 2.4, sp: 26, cd: 9000, mult: 1.1, magic: 1, element: 'water', slow: 4000, up: 'dur', auto: 'area', d: 'ทุ่งน้ำแข็งรอบเป้าหมาย ×1.1 ทำให้ทุกตัวช้าลง 4 วิ' });
sk('elementalist', 'el_shield', 10, 'Elemental Shield', 'โล่ธาตุ', { type: 'self', sp: 30, cd: 30000, barrier: { pct: 0.15, int: 4, ms: 12000 }, up: 'heal', auto: 'defense', d: 'โล่ดูดซับความเสียหาย 15% ของ MaxHP + INT×4 นาน 12 วิ' });
sk('elementalist', 'el_meteor', 20, 'Meteor Spark', 'อุกกาบาตเพลิง', { type: 'area', at: 'target', range: 8, r: 2.2, sp: 40, cd: 12000, cast: 800, mult: 2.6, magic: 1, element: 'fire', dot: { k: 'burn', ms: 4000, pct: 0.2 }, up: 'mult', auto: 'area', d: 'ร่าย 0.8 วิ อุกกาบาตตก ×2.6 รอบเป้าหมาย และติดไฟ 4 วิ' });
sk('elementalist', 'el_surge', 30, 'Elemental Surge', 'พายุธาตุ', { type: 'area', range: 3, sp: 55, cd: 20000, mult: 1.25, hits: 3, magic: 1, elements: ['fire', 'water', 'wind'], slow: 2000, sig: 1, up: 'mult', auto: 'area', d: 'สกิลประจำอาชีพ: ไฟ-น้ำแข็ง-สายฟ้า 3 ระลอก ×1.25 รอบตัว 3 ช่อง' });
// ---------------- WARLOCK: curses, drains, the void
sk('warlock', 'wl_pact', 1, 'Dark Pact', 'พันธสัญญามืด', { type: 'passive', passive: { matkPct: 2, drainPct: 2 }, d: 'ติดตัว: MATK +2% และดูดชีวิตจากเวทมืด +2% ต่อเลเวล' });
sk('warlock', 'wl_bolt', 1, 'Shadow Bolt', 'ลูกศรเงา', { type: 'target', range: 8, sp: 18, cd: 3000, mult: 2.3, magic: 1, element: 'shadow', up: 'mult', auto: 'attack', d: 'เวทเงา ×2.3 ระยะ 8 ช่อง' });
sk('warlock', 'wl_curse', 5, 'Curse of Weakness', 'คำสาปอ่อนแรง', { type: 'target', range: 8, sp: 16, cd: 15000, mult: 0.6, magic: 1, element: 'shadow', debuff: { atk: -0.25, def: -0.25, ms: 12000 }, up: 'dur', auto: 'debuff', d: 'สาปเป้าหมาย ATK และ DEF -25% นาน 12 วิ' });
sk('warlock', 'wl_drain', 10, 'Life Drain', 'ดูดชีวิต', { type: 'target', range: 6, sp: 22, cd: 6000, mult: 1.8, magic: 1, element: 'shadow', drain: 0.5, up: 'mult', auto: 'attack', d: 'ดูดพลังชีวิต ×1.8 ฟื้น HP เท่ากับ 50% ของความเสียหาย' });
sk('warlock', 'wl_mark', 20, 'Soul Mark', 'ตราวิญญาณ', { type: 'target', range: 8, sp: 20, cd: 16000, mult: 0.8, magic: 1, element: 'shadow', mark: { taken: 0.25, ms: 10000 }, dot: { k: 'curse', ms: 10000, pct: 0.25 }, up: 'dur', auto: 'debuff', d: 'ตราวิญญาณ: เป้าหมายได้รับความเสียหาย +25% และเสียพลังชีวิตต่อเนื่อง 10 วิ' });
sk('warlock', 'wl_nova', 30, 'Dark Nova', 'โนวาทมิฬ', { type: 'area', range: 3, sp: 50, cd: 16000, mult: 2.4, magic: 1, element: 'shadow', drain: 0.15, sig: 1, up: 'mult', auto: 'area', d: 'สกิลประจำอาชีพ: ระเบิดความมืดรอบตัว 3 ช่อง ×2.4 และดูดชีวิต 15%' });
// ---------------- PRIEST: healing, barriers, holy light
sk('priest', 'pr_grace', 1, 'Divine Grace', 'พระคุณแห่งแสง', { type: 'passive', passive: { healPct: 6 }, d: 'ติดตัว: พลังรักษาและบาเรีย +6% ต่อเลเวล' });
sk('priest', 'pr_heal', 1, 'Greater Heal', 'ฟื้นฟูขั้นสูง', { type: 'party', r: 7, lowest: 1, sp: 26, cd: 4000, heal: { pct: 0.35, int: 7 }, up: 'heal', auto: 'heal', d: 'รักษาเพื่อนในปาร์ตี้ที่ HP ต่ำที่สุดในระยะ 7 ช่อง (หรือตัวเอง) 35% + INT×7' });
sk('priest', 'pr_barrier', 5, 'Holy Barrier', 'บาเรียศักดิ์สิทธิ์', { type: 'party', r: 6, sp: 30, cd: 20000, barrier: { pct: 0.12, int: 5, ms: 12000 }, up: 'heal', auto: 'defense', d: 'บาเรียดูดซับความเสียหายให้ตัวเองและปาร์ตี้ 12% MaxHP + INT×5' });
sk('priest', 'pr_group', 10, 'Group Heal', 'รักษาหมู่', { type: 'party', r: 7, sp: 40, cd: 9000, heal: { pct: 0.2, int: 4 }, up: 'heal', auto: 'heal', d: 'รักษาตัวเองและปาร์ตี้รอบตัว 7 ช่อง 20% + INT×4' });
sk('priest', 'pr_purify', 20, 'Purify', 'ชำระล้าง', { type: 'area', range: 3, sp: 32, cd: 10000, mult: 1.8, magic: 1, element: 'holy', heal: { pct: 0.08, int: 2 }, cleanse: 1, up: 'mult', auto: 'area', d: 'แสงชำระรอบตัว ×1.8 (×2 ต่ออันเดด/วอยด์) ล้างสถานะลบของตัวเอง และฟื้น HP เล็กน้อย' });
sk('priest', 'pr_resurrect', 30, 'Resurrection', 'คืนชีพ', { type: 'revive', range: 5, sp: 60, cd: 120000, revive: 0.4, sig: 1, up: 'heal', d: 'สกิลประจำอาชีพ: ชุบชีวิตผู้เล่นที่หมดสติในระยะ 5 ช่อง ฟื้น HP 40% (คูลดาวน์ 2 นาที)' });
// ---------------- ORACLE: fate, time, foresight (buffs and avoidance, not healing)
sk('oracle', 'or_clair', 1, 'Clairvoyance', 'ญาณหยั่งรู้', { type: 'passive', passive: { flee: 2, durPct: 6 }, d: 'ติดตัว: FLEE +2 และบัฟอยู่นานขึ้น 6% ต่อเลเวล' });
sk('oracle', 'or_fate', 1, 'Blessing of Fate', 'พรแห่งโชคชะตา', { type: 'party', r: 7, sp: 30, cd: 45000, buff: { id: 'fate', ms: 40000, atk: 0.12, matk: 0.12, def: 0.12, th: 'พรแห่งโชคชะตา' }, up: 'buff', auto: 'buff', d: 'ATK/MATK/DEF +12% ให้ตัวเองและปาร์ตี้ 40 วิ' });
sk('oracle', 'or_haste', 5, 'Haste', 'เร่งเวลา', { type: 'party', r: 7, sp: 28, cd: 40000, buff: { id: 'haste', ms: 25000, aspd: 0.2, spd: 0.25, th: 'เร่งเวลา' }, up: 'buff', auto: 'buff', d: 'ตีเร็ว +20% เดินเร็ว +25% ให้ตัวเองและปาร์ตี้ 25 วิ' });
sk('oracle', 'or_fortune', 10, 'Fortune', 'ดวงดาวนำโชค', { type: 'party', r: 7, sp: 24, cd: 40000, buff: { id: 'fortune', ms: 30000, crit: 15, hit: 15, th: 'ดวงดาวนำโชค' }, up: 'buff', auto: 'buff', d: 'CRIT +15 HIT +15 ให้ตัวเองและปาร์ตี้ 30 วิ' });
sk('oracle', 'or_foresight', 20, 'Foresight', 'หยั่งรู้อนาคต', { type: 'self', sp: 22, cd: 30000, buff: { id: 'foresight', ms: 15000, evade: 3, th: 'หยั่งรู้อนาคต' }, up: 'dur', auto: 'defense', d: 'มองเห็นการโจมตีล่วงหน้า: หลบการโจมตี 3 ครั้งถัดไปแน่นอน (15 วิ)' });
sk('oracle', 'or_ward', 30, 'Celestial Ward', 'ผนึกดวงดาว', { type: 'party', r: 7, sp: 60, cd: 60000, barrier: { pct: 0.18, int: 5, ms: 15000 }, buff: { id: 'ward', ms: 15000, dr: 0.15, th: 'ผนึกดวงดาว' }, sig: 1, up: 'heal', auto: 'defense', d: 'สกิลประจำอาชีพ: ผนึกดวงดาวให้ปาร์ตี้ ดูดซับ 18% MaxHP และลดความเสียหาย 15%' });
// ---------------- ASSASSIN: burst, criticals, poison
sk('assassin', 'as_precision', 1, 'Deadly Precision', 'จุดตายแม่นยำ', { type: 'passive', passive: { crit: 2, atkPct: 1 }, d: 'ติดตัว: CRIT +2 และ ATK +1% ต่อเลเวล' });
sk('assassin', 'as_backstab', 1, 'Backstab', 'แทงข้างหลัง', { type: 'target', range: 1.6, sp: 16, cd: 4000, mult: 2.4, backstab: 1.6, up: 'mult', auto: 'attack', d: 'แทง ×2.4 — แรงขึ้น 60% ถ้ามอนกำลังสนใจคนอื่นอยู่' });
sk('assassin', 'as_venom', 5, 'Venom Strike', 'แทงพิษ', { type: 'target', range: 1.6, sp: 18, cd: 6000, mult: 1.6, dot: { k: 'poison', ms: 8000, pct: 0.3 }, up: 'dur', auto: 'attack', d: 'แทง ×1.6 และติดพิษ 8 วิ' });
sk('assassin', 'as_step', 10, 'Shadow Step', 'ก้าวเงา', { type: 'target', range: 6, sp: 20, cd: 10000, mult: 1.5, dash: 1, buff: { id: 'sstep', ms: 3000, flee: 0.3, th: 'ก้าวเงา' }, up: 'mult', auto: 'attack', d: 'วาร์ปไปด้านหลังเป้าหมายในระยะ 6 ช่อง แทง ×1.5 และ FLEE +30% 3 วิ' });
sk('assassin', 'as_mark', 20, 'Critical Mark', 'ตราจุดตาย', { type: 'target', range: 6, sp: 18, cd: 15000, mult: 0.5, mark: { crit: 1, ms: 8000 }, up: 'dur', auto: 'debuff', d: 'ทำเครื่องหมายจุดตาย: การโจมตีกายภาพใส่เป้าหมายนี้คริติคอลทุกครั้ง 8 วิ' });
sk('assassin', 'as_execute', 30, 'Execute', 'ปลิดชีพ', { type: 'target', range: 1.6, sp: 40, cd: 15000, mult: 2.5, crit: 1, execute: { below: 0.3, mult: 2.5 }, sig: 1, up: 'mult', auto: 'execute', d: 'สกิลประจำอาชีพ: แทง ×2.5 คริเสมอ แรงขึ้น 2.5 เท่าเมื่อเป้าหมาย HP ต่ำกว่า 30%' });
// ---------------- SHADOW DANCER: movement, evasion, disruption
sk('shadowdancer', 'sd_rhythm', 1, 'Shadow Rhythm', 'จังหวะเงา', { type: 'passive', passive: { flee: 3, aspdPct: 1 }, d: 'ติดตัว: FLEE +3 และตีเร็วขึ้น 1% ต่อเลเวล' });
sk('shadowdancer', 'sd_dash', 1, 'Shadow Dash', 'พุ่งเงา', { type: 'target', range: 5, sp: 16, cd: 6000, mult: 1.6, dash: 1, buff: { id: 'sdash', ms: 4000, spd: 0.3, th: 'พุ่งเงา' }, up: 'mult', auto: 'attack', d: 'พุ่งเข้าหาเป้าหมาย ×1.6 แล้วเคลื่อนที่เร็วขึ้น 30% 4 วิ' });
sk('shadowdancer', 'sd_veil', 5, 'Smoke Veil', 'ม่านเงามืด', { type: 'area', range: 3, sp: 22, cd: 15000, mult: 0.5, slow: 4000, debuff: { atk: -0.3, ms: 6000 }, buff: { id: 'sveil', ms: 6000, flee: 0.4, th: 'ม่านเงามืด' }, up: 'dur', auto: 'area', d: 'ปล่อยควันเงารอบตัว: มอนช้าลงและ ATK -30% เรา FLEE +40%' });
sk('shadowdancer', 'sd_phantom', 10, 'Phantom Slash', 'ฟันมายา', { type: 'area', range: 2.4, sp: 28, cd: 8000, mult: 1.1, hits: 3, up: 'mult', auto: 'area', d: 'ร่างเงาฟันรอบตัว 3 ครั้ง ×1.1' });
sk('shadowdancer', 'sd_dance', 20, 'Evasion Dance', 'ระบำหลบหลีก', { type: 'self', sp: 24, cd: 30000, buff: { id: 'dance', ms: 10000, flee: 0.8, spd: 0.2, th: 'ระบำหลบหลีก' }, up: 'dur', auto: 'defense', d: 'FLEE +80% เดินเร็ว +20% เป็นเวลา 10 วิ' });
sk('shadowdancer', 'sd_nightfall', 30, 'Nightfall', 'รัตติกาล', { type: 'area', range: 3.5, sp: 50, cd: 20000, mult: 1.8, hits: 2, slow: 3000, buff: { id: 'nightfall', ms: 3000, stealth: 1, flee: 0.5, th: 'รัตติกาล' }, sig: 1, up: 'mult', auto: 'area', d: 'สกิลประจำอาชีพ: ความมืดกลืนรอบตัว 3.5 ช่อง ×1.8 สองครั้ง แล้วหายตัว 3 วิ' });
// ---------------- ALCHEMIST: flasks, mists, bombs (no reagents needed: the item system stays for crafting)
sk('alchemist', 'al_brewing', 1, 'Efficient Brewing', 'ปรุงยาชำนาญ', { type: 'passive', passive: { potionPct: 6, matkPct: 1 }, d: 'ติดตัว: ยาฟื้น HP/SP ได้มากขึ้น 6% และ MATK +1% ต่อเลเวล' });
sk('alchemist', 'al_acid', 1, 'Acid Flask', 'ขวดกรด', { type: 'target', range: 6, sp: 18, cd: 5000, mult: 1.6, debuff: { def: -0.3, ms: 6000 }, dot: { k: 'acid', ms: 4000, pct: 0.2 }, up: 'mult', auto: 'attack', d: 'ปาขวดกรด ×1.6 กัดกร่อน DEF -30% และเสียพลังชีวิต 4 วิ' });
sk('alchemist', 'al_mist', 5, 'Healing Mist', 'หมอกรักษา', { type: 'party', r: 6, sp: 30, cd: 15000, heal: { pct: 0.1, int: 2 }, buff: { id: 'mist', ms: 10000, regen: 0.03, th: 'หมอกรักษา' }, up: 'heal', auto: 'heal', d: 'หมอกรักษา: ฟื้น HP 10% ทันที และอีก 3% ทุกวินาที 10 วิ (ปาร์ตี้รอบตัว)' });
sk('alchemist', 'al_bomb', 10, 'Explosive Mixture', 'ส่วนผสมระเบิด', { type: 'area', at: 'target', range: 6, r: 2.2, sp: 32, cd: 9000, mult: 1.9, element: 'fire', dot: { k: 'burn', ms: 3000, pct: 0.15 }, up: 'mult', auto: 'area', d: 'ระเบิดรอบเป้าหมาย 2.2 ช่อง ×1.9 และติดไฟ' });
sk('alchemist', 'al_catalyst', 20, 'Catalyst', 'ตัวเร่งปฏิกิริยา', { type: 'self', sp: 10, cd: 40000, buff: { id: 'catalyst', ms: 20000, spCut: 0.3, matk: 0.15, th: 'ตัวเร่งปฏิกิริยา' }, up: 'buff', auto: 'buff', d: 'สกิลใช้ SP น้อยลง 30% และ MATK +15% เป็นเวลา 20 วิ' });
sk('alchemist', 'al_transmute', 30, 'Transmutation Boost', 'เร่งแปรธาตุ', { type: 'self', sp: 40, cd: 60000, heal: { pct: 0.15, int: 3 }, buff: { id: 'transmute', ms: 30000, potion: 0.5, atk: 0.15, matk: 0.15, th: 'เร่งแปรธาตุ' }, sig: 1, up: 'buff', auto: 'buff', d: 'สกิลประจำอาชีพ: ยาฟื้นได้มากขึ้น 50% ATK/MATK +15% 30 วิ และฟื้น HP 15%' });
// ---------------- MACHINIST: devices, guns, turrets
sk('machinist', 'mc_expert', 1, 'Mechanical Expertise', 'ความชำนาญเครื่องกล', { type: 'passive', passive: { devicePct: 6, atkPct: 1.5 }, d: 'ติดตัว: ป้อมปืน/ทุ่นระเบิดแรงขึ้น 6% และ ATK +1.5% ต่อเลเวล' });
sk('machinist', 'mc_burst', 1, 'Burst Shot', 'ยิงรัว', { type: 'target', range: 6, sp: 18, cd: 4000, mult: 0.85, hits: 3, up: 'mult', auto: 'attack', d: 'ยิงรัว 3 นัด ×0.85 ระยะ 6 ช่อง' });
sk('machinist', 'mc_mine', 5, 'Shock Mine', 'ทุ่นช็อต', { type: 'ground', sp: 20, cd: 9000, trap: { k: 'mine', ms: 30000, r: 1.6, mult: 2.0, stun: 1500, device: 1 }, up: 'mult', auto: 'trap', d: 'วางทุ่นระเบิดไฟฟ้า: ระเบิด ×2.0 รอบ 1.6 ช่อง และช็อต 1.5 วิ' });
sk('machinist', 'mc_overcharge', 10, 'Overcharge', 'โอเวอร์ชาร์จ', { type: 'self', sp: 24, cd: 35000, buff: { id: 'overcharge', ms: 12000, atk: 0.25, aspd: 0.25, th: 'โอเวอร์ชาร์จ' }, up: 'buff', auto: 'buff', d: 'ATK +25% ตีเร็ว +25% เป็นเวลา 12 วิ' });
sk('machinist', 'mc_drone', 20, 'Repair Drone', 'โดรนซ่อมแซม', { type: 'self', sp: 30, cd: 30000, buff: { id: 'drone', ms: 12000, regen: 0.04, def: 0.1, th: 'โดรนซ่อมแซม' }, up: 'heal', auto: 'defense', d: 'โดรนซ่อมตัวเรา ฟื้น HP 4% ทุกวินาที และ DEF +10% 12 วิ' });
sk('machinist', 'mc_turret', 30, 'Deploy Turret', 'ตั้งป้อมปืน', { type: 'ground', sp: 45, cd: 30000, turret: { ms: 15000, every: 1000, mult: 0.9, range: 6 }, sig: 1, up: 'mult', auto: 'trap', d: 'สกิลประจำอาชีพ: ตั้งป้อมปืนยิงมอนที่ใกล้ที่สุดทุก 1 วิ ×0.9 นาน 15 วิ' });

for (const id in S) S[id].id = id;
// AUTO Skill kind -> what the client may offer (the server never trusts it; it only labels the skill)
module.exports = { SKILLS2: S, ONEHAND };
