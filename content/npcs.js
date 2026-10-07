'use strict';
// NPC registry. key "map:id" (ids only need to be unique inside their map; the protocol addresses NPCs by id
// on the player's current map, so old ids like 'warp' / 'heal' keep working).
// role: quest shop sell heal inn storage bank craft smith teleport board master guild arena auction event gate lore
// look: an NPC sheet name (legacy 'iris' 'merchant' 'nurse' 'warper' 'sage') or a hero look {cc,sex,hc,hair,head}
// shop: shop id (content/shops.js). dest: teleport list [[map,x,y,label,lv]]. station: craft station.
// say: dialogue lines (one picked each talk). Quests link to NPCs from content/quests.js (giver / stage npc).
const N = [];
const npc = (map, id, n, role, x, y, look, o = {}) => N.push(Object.assign({ map, id, n, role, x, y, look }, o));
const H = (cc, sex, hc, hair, head) => ({ cc, sex, hc, hair: hair || 0, head });

// ---------------- Lumira Village
npc('lumira', 'elder', 'ผู้ใหญ่บ้านมาเรน', 'quest', 15, 8, 'sage', { label: '[ผู้ใหญ่บ้าน] มาเรน', say: ['ลูมิร่าเป็นหมู่บ้านเล็กๆ แต่เรามีหัวใจใหญ่นะ', 'ดาวตกเมื่อคืน... ข้ามีลางสังหรณ์ไม่ดี'] });
npc('lumira', 'inn', 'แม่ครัวโรซ่า', 'inn', 7, 9, H(4, 1, 5, 2, 'band_red'), { label: '[โรงเตี๊ยม] โรซ่า', rest: 30, say: ['ยินดีต้อนรับสู่โรงเตี๊ยมนกขี้เซา! พักที่นี่แล้วถ้าหมดสติจะฟื้นที่นี่นะ'] });
npc('lumira', 'heal', 'ซิสเตอร์เอลิน', 'heal', 39, 9, 'nurse', { label: '[รักษา] ซิสเตอร์เอลิน', say: ['แสงรุ่งอรุณคุ้มครองเจ้า'] });
npc('lumira', 'weapon', 'ช่างอาวุธบอริน', 'shop', 32, 8, H(4, 0, 2, 0, 'leather'), { label: '[อาวุธ] บอริน', shop: 'v_weapon', say: ['อาวุธดีๆ ราคาเป็นมิตร!'] });
npc('lumira', 'smith', 'ช่างตีเหล็กฮิลดา', 'smith', 6, 33, H(4, 1, 6, 0, 'band_red'), { label: '[ช่างตีเหล็ก] ฮิลดา', station: 'smith', say: ['ขอวัตถุดิบมา แล้วข้าจะตีให้'] });
npc('lumira', 'shop', 'พ่อค้าเพลล์', 'shop', 15, 35, 'merchant', { label: '[ร้านของชำ] เพลล์', shop: 'v_general', say: ['ยาแดง ขนมปัง คัมภีร์กลับบ้าน มีครบ!'] });
npc('lumira', 'armor', 'ช่างตัดเสื้อแทมซิน', 'shop', 21, 35, H(1, 1, 4, 3), { label: '[ชุดเกราะ] แทมซิน', shop: 'v_armor', say: ['ชุดใหม่ ใจใหม่ ออกผจญภัยได้อย่างมั่นใจ'] });
npc('lumira', 'sell', 'นักรับซื้อกิล', 'sell', 10, 24, H(3, 0, 1), { label: '[รับซื้อของ] กิล', say: ['ของจากมอนสเตอร์? ข้ารับซื้อหมด'] });
npc('lumira', 'storage', 'ผู้ดูแลคลังกัส', 'storage', 43, 34, H(0, 0, 3, 1, 'cap'), { label: '[คลังเก็บของ] กัส' });
npc('lumira', 'm_vanguard', 'กัปตันดาริอุส', 'master', 34, 35, H(0, 0, 0, 0, 'iron'), { label: '[ครูแวนการ์ด] ดาริอุส', cls: 'vanguard', say: ['แวนการ์ดไม่ถอย'] });
npc('lumira', 'm_ranger', 'นักธนูเฟลาน', 'master', 8, 19, H(2, 0, 6, 1, 'hood_green'), { label: '[ครูเรนเจอร์] เฟลาน', cls: 'ranger', say: ['ลมบอกทิศ ใจบอกเป้า'] });
npc('lumira', 'board', 'กระดานประกาศ', 'board', 21, 13, 'board', { label: '[กระดานประกาศ]' });
npc('lumira', 'warp', 'นักเดินทางพิป', 'teleport', 30, 15, 'warper', { label: '[วาร์ป] พิป', dest: [['beginner_meadow', 3, 24, 'ทุ่งหญ้าผู้เริ่มต้น (Lv 1-8)'], ['solkara', 21, 20, 'นครเอลินดรา'], ['plains', 3, 22, 'ทุ่งทรายสีทอง (Lv 1-10)'], ['woods', 25, 2, 'ป่าโอเอซิส (Lv 5-15)'], ['greenwood', 3, 50, 'ป่ากรีนวูด (Lv 8-18)', 8]], say: ['จะไปไหนดี? นักผจญภัย Lv 15 ลงมาไปส่งฟรี!'] });
npc('lumira', 'craft', 'ยายเรน ช่างฝีมือ', 'craft', 44, 23, H(1, 1, 3, 4), { label: '[งานฝีมือ] ยายเรน', station: 'craft', say: ['สมุนไพรกับขนนุ่มๆ ทำอะไรได้เยอะนะหลานเอ๋ย'] });
npc('lumira', 'guide', 'แอสเตอร์ ผู้แนะแนวอาชีพ', 'lore', 23, 11, H(1, 0, 7, 2, 'wizard'), { label: '[แนะแนวอาชีพ] แอสเตอร์', say: [
  'เมื่อถึง Lv 10 เจ้าเลือกอาชีพแรกได้ 6 สาย:\n• แวนการ์ด / เรนเจอร์ — ครูอยู่ที่หมู่บ้านนี้\n• อาร์คานิสต์ / เคลริก / โร้ก / อาร์ติซาน — ครูอยู่ที่นครเอลินดรา\nแต่ละสายมีบททดสอบของตัวเอง'] });
npc('lumira', 'farmer', 'ลุงทอม', 'quest', 40, 16, H(4, 0, 0, 0, 'straw'), { label: '[ชาวไร่] ลุงทอม', say: ['ปีนี้ผักงามจริงๆ'] });
npc('lumira', 'kid', 'ทิลลี่', 'lore', 22, 27, H(3, 1, 2, 5), { label: 'ทิลลี่', say: ['พี่ๆ เห็นดาวตกเมื่อคืนไหม? หนูขอพรว่าอยากเป็นนักผจญภัย!', 'ถ้ากดค้างที่จอยสติ๊กจะเดินไปเรื่อยๆ นะ'] });

// ---------------- Elyndra Capital (Solkara). Old Town keeps the original five NPCs and ids.
npc('solkara', 'iris', 'ไอริส', 'quest', 21, 12, 'iris', { label: '[เควส] ไอริส', legacy: 1 });
npc('solkara', 'shop', 'พ่อค้าซาฮีร์', 'shop', 16, 19, 'merchant', { label: '[ร้านค้า] ซาฮีร์', shop: 'legacy' });
npc('solkara', 'heal', 'นางพยาบาลมีน่า', 'heal', 26, 19, 'nurse', { label: '[ฮีลฟรี] มีน่า' });
npc('solkara', 'warp', 'นักเดินทางคาเรน', 'teleport', 26, 13, 'warper', { label: '[วาร์ป] คาเรน', dest: [['plains', 3, 22, 'ทุ่งทรายสีทอง (Lv 1-10)'], ['woods', 25, 2, 'ป่าโอเอซิส (Lv 5-15)'], ['lumira', 25, 20, 'หมู่บ้านลูมิร่า'], ['beginner_meadow', 3, 24, 'ทุ่งหญ้าผู้เริ่มต้น (Lv 1-8)'], ['greenwood', 3, 50, 'ป่ากรีนวูด (Lv 8-18)', 8], ['moonlit_creek', 3, 26, 'ลำธารแสงจันทร์ (Lv 14-24)', 14], ['verdant_haven', 30, 26, 'เวอร์แดนต์ เฮเวน · ป่าเขียวขจี (Lv 22+)', 22], ['emberhold', 30, 26, 'เอมเบอร์โฮลด์ · ชายแดนเถ้าถ่าน (Lv 40+)', 40]] });
npc('solkara', 'sell', 'นักสะสมโบราณ', 'sell', 16, 13, 'sage', { label: '[รับซื้อของ] ปราชญ์' });
npc('solkara', 'smith', 'ช่างตีเหล็กการ์แรน', 'smith', 37, 10, H(4, 0, 0, 0, 'leather'), { label: '[ช่างตีเหล็ก] การ์แรน', station: 'smith', say: ['เตาของข้าร้อนพอจะหลอมเหล็กกล้า'] });
npc('solkara', 'weapon', 'คลังอาวุธหลวง', 'shop', 8, 10, H(0, 0, 2, 0, 'iron'), { label: '[อาวุธ] คลังหลวง', shop: 'c_weapon' });
npc('solkara', 'armor', 'ช่างเกราะเวสเปอร์', 'shop', 31, 10, H(0, 1, 6, 3), { label: '[ชุดเกราะ] เวสเปอร์', shop: 'c_armor' });
npc('solkara', 'potion', 'นักปรุงยาฟีน', 'shop', 9, 20, H(1, 1, 5, 4), { label: '[ร้านยา] ฟีน', shop: 'c_potion' });
npc('solkara', 'board', 'กระดานประกาศหลวง', 'board', 24, 23, 'board', { label: '[กระดานประกาศ]' });
npc('solkara', 'archivist', 'บรรณารักษ์เซลีน', 'quest', 14, 30, H(1, 1, 3, 2), { label: '[หอจดหมายเหตุ] เซลีน', say: ['ความรู้คือแสงสว่างในยามมืด'] });
npc('solkara', 'captain', 'กัปตันโรวัน', 'quest', 34, 29, H(0, 0, 1, 0, 'iron'), { label: '[ทหารหลวง] โรวัน', say: ['กองทหารหลวงพร้อมปกป้องนคร'] });
npc('solkara', 'bard', 'นักกวีลิโอ', 'quest', 33, 20, H(2, 0, 6, 2, 'feather'), { label: '[นักกวี] ลิโอ', say: ['♪ โอ้เอลินดรา ดินแดนแห่งรูน ♪'] });
npc('solkara', 'guild', 'ผู้ดูแลหอกิลด์', 'guild', 50, 9, H(0, 1, 0, 2, 'iron'), { label: '[หอกิลด์] เอเดรีย', say: ['ตั้งกิลด์ได้แล้ว! เปิด เมนู → กิลด์ แล้วกด "สร้างกิลด์" (ต้อง Lv 10 และ 5,000 Zeny สมาชิกสูงสุด 30 คน)', 'ชวนเพื่อนเข้ากิลด์ได้โดยแตะที่ตัวละครของเขาแล้วเลือก "ชวนเข้ากิลด์"'] });
npc('solkara', 'm_cleric', 'มารดาออเรเลีย', 'master', 60, 9, 'nurse', { label: '[ครูเคลริก] ออเรเลีย', cls: 'cleric', say: ['แสงรุ่งอรุณไม่เคยทอดทิ้งใคร'] });
npc('solkara', 'bank', 'นายธนาคารคอยน์', 'bank', 69, 9, H(3, 0, 0, 0, 'traveler'), { label: '[ธนาคาร] คอยน์' });
npc('solkara', 'arena', 'ผู้ดูแลลานประลอง', 'arena', 53, 21, H(4, 0, 1, 0, 'iron'), { label: '[ลานประลอง] บรูโน', say: ['[เร็วๆ นี้] ลานประลอง PvP แบบสมัครใจกำลังก่อสร้าง ตอนนี้ยังสู้กันไม่ได้'] });
npc('solkara', 'm_arcanist', 'เมจิสเตอร์เซล', 'master', 67, 29, H(1, 0, 4, 0, 'wizard'), { label: '[ครูอาร์คานิสต์] เซล', cls: 'arcanist', say: ['อักษรรูนคือภาษาของโลก'] });
npc('solkara', 'scholar', 'นักวิชาการไอวี่', 'lore', 71, 20, H(1, 1, 7, 4), { label: 'ไอวี่', say: ['ว่ากันว่าก่อนอาณาจักรเอลินดรา มีอาณาจักรที่ใช้รูนสร้างเมืองลอยฟ้า... แล้ววันหนึ่งมันก็แตกสลาย'] });
npc('solkara', 'm_rogue', '"วิสเปอร์"', 'master', 6, 41, H(3, 0, 0, 0, 'mask_shadow'), { label: '[ครูโร้ก] วิสเปอร์', cls: 'rogue', say: ['...เจ้าไม่ได้เห็นข้า'] });
npc('solkara', 'auction', 'ผู้ดูแลตลาดประมูล', 'auction', 14, 42, 'merchant', { label: '[ตลาดประมูล] มาร์โก', say: ['[เร็วๆ นี้] ตลาดฝากขายระหว่างผู้เล่นกำลังเตรียมเปิด ระหว่างนี้แตะตัวละครผู้เล่นแล้วเลือก "แลกเปลี่ยน" เพื่อซื้อขายกันได้'] });
npc('solkara', 'm_artisan', 'นายช่างโอโด', 'master', 28, 41, H(4, 0, 2, 0, 'leather'), { label: '[ครูอาร์ติซาน] โอโด', cls: 'artisan', say: ['มือที่สร้างได้ ย่อมเปลี่ยนโลกได้'] });
npc('solkara', 'craft', 'โต๊ะช่างโรงงาน', 'craft', 25, 46, H(4, 1, 1, 0, 'band_red'), { label: '[งานฝีมือ] พิม', station: 'craft' });
npc('solkara', 'inn', 'เจ้าของโรงเตี๊ยมโคมเงิน', 'inn', 37, 41, H(0, 0, 5, 0), { label: '[โรงเตี๊ยม] โคมเงิน', rest: 60 });
npc('solkara', 'storage', 'คลังเก็บของหลวง', 'storage', 47, 41, H(3, 1, 0, 2, 'cap'), { label: '[คลังเก็บของ] นอรา' });
npc('solkara', 'special', 'ร้านพิเศษลิลิธ', 'shop', 56, 41, H(1, 1, 5, 5, 'witch'), { label: '[ร้านพิเศษ] ลิลิธ', shop: 'c_special', say: ['ของสวยไม่มีค่าสถานะ แต่มีสไตล์!'] });
npc('solkara', 'gate', 'ผู้เฝ้าประตูดันเจี้ยน', 'gate', 66, 41, H(0, 0, 1, 0, 'iron'), { label: '[ประตูดันเจี้ยน] เกรก', dest: [['old_mine', 3, 2, 'เหมืองเก่า (Lv 20+)', 20]], say: ['ประตูนี้พาไปปากเหมืองเก่า เฉพาะผู้ที่แข็งแกร่งพอ'] });
npc('solkara', 'event', 'พิธีกรเทศกาล', 'event', 38, 47, H(2, 1, 4, 5, 'party'), { label: '[อีเวนต์] เทศกาลดาวตก', say: ['เทศกาลดาวตกกำลังจะมา! ระหว่างนี้รับ "หมวกปาร์ตี้" ได้ที่ร้านพิเศษ'] });
npc('solkara', 'noble', 'ท่านลอร์ดเฟอร์ริส', 'lore', 62, 16, H(0, 0, 6, 1, 'traveler'), { label: 'ลอร์ดเฟอร์ริส', say: ['สภาขุนนางไม่เชื่อเรื่องดาวตกหรอก... จนกว่ามันจะตกใส่หัวพวกเขาเอง'] });

// ---------------- Fields
npc('beginner_meadow', 'shepherd', 'คนเลี้ยงแกะเบน', 'quest', 4, 20, H(4, 0, 2, 0, 'straw'), { label: '[เควส] เบน', say: ['แกะของข้าหายไปตัวนึง... อ้อ ไม่ใช่ นั่นมันฟลัฟเฟิล'] });
npc('greenwood', 'scout', 'หน่วยพิทักษ์ป่าไลร่า', 'quest', 34, 28, H(2, 1, 6, 2, 'hood_green'), { label: '[พิทักษ์ป่า] ไลร่า' });
npc('greenwood', 'watch', 'ยามป่าฮาร์ลอว์', 'quest', 30, 33, H(0, 0, 2, 0, 'leather'), { label: '[ยามป่า] ฮาร์ลอว์' });
npc('greenwood', 'trader', 'พ่อค้าค่ายมิลา', 'shop', 38, 33, 'merchant', { label: '[ร้านค้าค่าย] มิลา', shop: 'camp' });
npc('greenwood', 'heal', 'หมอสมุนไพรรู', 'heal', 37, 29, 'nurse', { label: '[รักษา] รู' });
npc('moonlit_creek', 'hermit', 'ฤษีโอเรน', 'quest', 4, 22, 'sage', { label: '[ฤษี] โอเรน', say: ['ลำธารนี้ไม่เคยเห็นพระอาทิตย์มาร้อยปีแล้ว'] });
npc('old_mine', 'bram', 'แบรม ผู้รอดชีวิต', 'quest', 5, 3, H(4, 0, 2, 0, 'miner'), { label: '[ผู้รอดชีวิต] แบรม' });
npc('old_mine', 'supply', 'เสบียงหน้าเหมือง', 'shop', 2, 5, 'merchant', { label: '[เสบียง] ร้านหน้าเหมือง', shop: 'mine' });


// ---------------- Region 2: Verdant Wilds
const VH = 'verdant_haven';
npc(VH, 'elder', 'ผู้เฒ่าซิลวานา', 'quest', 21, 12, 'sage', { label: '[ผู้เฒ่าแห่งป่า] ซิลวานา', say: ['ต้นไม้โบราณร้องไห้มาหลายคืนแล้ว... เจ้าได้ยินไหม?', 'เวอร์แดนต์ เฮเวนสร้างบนรากของป่า เราอยู่ได้เพราะป่ายอมให้อยู่'] });
npc(VH, 'inn', 'เจ้าของโรงเตี๊ยมโอ๊ค', 'inn', 12, 13, H(4, 0, 2, 0), { label: '[โรงเตี๊ยม] โอ๊ค', rest: 120, say: ['เตียงไม้หอมๆ ช่วยให้หลับสบาย'] });
npc(VH, 'storage', 'ผู้ดูแลคลังเฟิร์น', 'storage', 38, 11, H(1, 1, 3, 4, 'cap'), { label: '[คลังเก็บของ] เฟิร์น' });
npc(VH, 'heal', 'นักบวชป่ามิร์รา', 'heal', 47, 13, 'nurse', { label: '[รักษา] มิร์รา', say: ['ใบไม้ร่วงแล้วก็ผลิใหม่ เจ้าก็เช่นกัน'] });
npc(VH, 'smith', 'ช่างตีเหล็กบรูค', 'smith', 11, 39, H(4, 0, 1, 0, 'leather'), { label: '[ช่างตีเหล็ก] บรูค', station: 'smith', say: ['ไม้หัวใจป่ากับยางไม้โบราณ... ของดีทั้งนั้น'] });
npc(VH, 'weapon', 'พ่อค้าอาวุธทอร์น', 'shop', 19, 40, H(0, 0, 2, 0, 'leather'), { label: '[อาวุธ] ทอร์น', shop: 'h_weapon', say: ['อาวุธที่ทนกับป่าลึกได้ต้องที่ร้านข้า'] });
npc(VH, 'armor', 'ช่างเกราะวิลโลว์', 'shop', 40, 40, H(1, 1, 6, 3), { label: '[ชุดเกราะ] วิลโลว์', shop: 'h_armor', say: ['เกราะหนังป่าลึก เบาแต่เหนียว'] });
npc(VH, 'shop', 'พ่อค้าเสบียงพีท', 'shop', 47, 41, 'merchant', { label: '[เสบียง] พีท', shop: 'h_general', say: ['ยาเขียวป่าลึกขายดีที่สุดในร้าน!'] });
npc(VH, 'sell', 'นักรับซื้อลินเดน', 'sell', 26, 33, H(3, 0, 1, 0, 'traveler'), { label: '[รับซื้อของ] ลินเดน', say: ['ขนสัตว์ หนัง สปอร์... ข้ารับซื้อหมด'] });
npc(VH, 'warp', 'นักเดินทางเฟย์', 'teleport', 34, 22, 'warper', { label: '[วาร์ป] เฟย์', dest: [['solkara', 21, 20, 'นครเอลินดรา'], ['lumira', 25, 20, 'หมู่บ้านลูมิร่า'], ['deep_forest', 36, 60, 'ป่าลึก (Lv 22-30)'], ['mushroom_hollow', 56, 28, 'โพรงเห็ด (Lv 26-34)', 26], ['spirit_grove', 30, 52, 'สวนวิญญาณ (Lv 30-38)', 30], ['beast_valley', 3, 25, 'หุบเขาสัตว์ป่า (Lv 32-42)', 32], ['thornmire', 60, 28, 'หนองหนาม (Lv 38-45)', 38], ['emberhold', 30, 26, 'เอมเบอร์โฮลด์ · ชายแดนเถ้าถ่าน (Lv 40+)', 40]] });
npc(VH, 'board', 'กระดานประกาศเฮเวน', 'board', 26, 21, 'board', { label: '[กระดานประกาศ]' });
npc(VH, 'shaman', 'หมอผีโอลู', 'quest', 24, 28, H(2, 0, 7, 2, 'feather'), { label: '[หมอผีเผ่าใบไม้] โอลู', say: ['เผ่าใบไม้ไม่ใช่ศัตรู... พวกเราแค่กลัว', 'สปอร์สีม่วงทำให้คนในเผ่าคลั่ง'] });
npc(VH, 'alchemist', 'นักเล่นแร่แปรธาตุไอวี่', 'craft', 36, 29, H(1, 1, 5, 4, 'wizard'), { label: '[งานฝีมือ/นักเล่นแร่] ไอวี่', station: 'craft', say: ['สปอร์นี่... มีบางอย่างที่ไม่ใช่ของโลกเราปนอยู่'] });
npc(VH, 'ranger', 'หัวหน้าพรานคาเอล', 'quest', 33, 15, H(2, 0, 6, 1, 'hood_green'), { label: '[พราน] คาเอล', say: ['ออร์คเผ่าเขี้ยวบุกหุบเขาทางตะวันออก ข้าต้องการคนช่วย'] });
npc(VH, 'lorekeeper', 'ผู้เล่าตำนานเซฟ', 'lore', 30, 33, H(0, 0, 4, 0, 'traveler'), { label: 'ผู้เล่าตำนานเซฟ', say: ['ตำนานเล่าว่าอาณาจักรแตกสลายเคยมีรากอยู่ใต้ป่านี้', 'เมล็ดวอยด์งอกได้ในที่ที่มีพลังรูนเข้มข้น... อย่างต้นไม้โบราณ', 'ดาวตกที่ลูมิร่าไม่ใช่ดวงเดียว มีอีกหลายดวงตกทั่วเอลินดรา'] });
npc('deep_forest', 'warden', 'ผู้พิทักษ์ป่าโรวีน่า', 'quest', 36, 56, H(2, 1, 6, 2, 'hood_green'), { label: '[ค่ายพิทักษ์] โรวีน่า', say: ['ทางเหนือคือเวอร์แดนต์ เฮเวน ระวังงูเถาวัลย์ระหว่างทาง'] });
npc('deep_forest', 'trader', 'พ่อค้าค่ายนิม', 'shop', 40, 56, 'merchant', { label: '[ร้านค้าค่าย] นิม', shop: 'camp2' });
npc('beast_valley', 'hunter', 'นักล่าบรันด์', 'quest', 6, 23, H(4, 0, 2, 0, 'leather'), { label: '[นักล่า] บรันด์', say: ['ฝูงหมาป่ากับพวกออร์ค... หุบเขานี้ไม่เหมือนเดิมแล้ว'] });

// visual look of every NPC (art bible: same base as players, clothes show the job; class masters wear their
// class at its best). sex 0/1, hair style 0-5, hc hair colour 0-8, outfit = npc_outfit_* layer, or arm/cls for
// adventurer-style gear, wpn = weapon type, shield, back item, head = headgear visual, scale (children).
const M = (o) => o;
// ---------------- Region 3: Ashen Frontier
const EH = 'emberhold';
npc(EH, 'commander', 'ผู้บัญชาการวาเลรา', 'quest', 38, 8, 'sage', { label: '[ผู้บัญชาการ] วาเลรา', say: ['กำแพงเอมเบอร์โฮลด์ไม่เคยแตก และจะไม่แตกในยุคของข้า', 'ออร์คเผ่าเขี้ยวเถ้าไม่ได้บุกมาเอง... มีบางอย่างต้อนพวกมันมา'] });
npc(EH, 'heal', 'นักบวชเปลวไฟซีเรีย', 'heal', 49, 8, 'nurse', { label: '[รักษา] ซีเรีย', say: ['เปลวไฟที่อบอุ่นรักษา เปลวไฟที่โกรธแค้นเผาผลาญ'] });
npc(EH, 'priestess', 'นักบวชหญิงอิกนิส', 'quest', 53, 8, 'sage', { label: '[วิหารเพลิง] อิกนิส', say: ['ภูเขาไฟคือหัวใจของชายแดน ช่วงนี้มันเต้นผิดจังหวะ', 'ไฟศักดิ์สิทธิ์ใต้ภูเขาไม่เคยมืดมาพันปี... จนถึงตอนนี้'] });
npc(EH, 'inn', 'เจ้าของโรงเตี๊ยมแอชลีย์', 'inn', 7, 18, 'sage', { label: '[โรงเตี๊ยม] แอชลีย์', rest: 160, say: ['ห้องพักอุ่นที่สุดในชายแดน ไม่ต้องจุดเตาผิงเลย'] });
npc(EH, 'storage', 'ผู้ดูแลคลังโบลต์', 'storage', 46, 18, 'sage', { label: '[คลังเก็บของ] โบลต์' });
npc(EH, 'lorekeeper', 'นักประวัติศาสตร์ออลเดน', 'lore', 53, 18, 'sage', { label: 'นักประวัติศาสตร์ออลเดน', say: ['ป้อมชายแดนทางเหนือเคยกันศัตรูได้ร้อยปี จนคืนที่ไฟลุกท่วม', 'ลัทธิเถ้าถ่านบูชา "เปลวไฟที่ไม่มีวันดับ" — ข้าเพิ่งเข้าใจว่ามันคือวอยด์', 'เอมเบอร์โฮลด์สร้างบนลาวาเย็นตัว คนที่นี่ทนร้อนเก่งที่สุดในเอลินดรา'] });
npc(EH, 'board', 'กระดานประกาศเอมเบอร์', 'board', 26, 20, 'board', { label: '[กระดานประกาศ]' });
npc(EH, 'warp', 'นักเดินทางไอริน', 'teleport', 34, 20, 'warper', { label: '[วาร์ป] ไอริน', dest: [['solkara', 21, 20, 'นครเอลินดรา'], ['verdant_haven', 30, 26, 'เวอร์แดนต์ เฮเวน'], ['ash_plains', 3, 28, 'ที่ราบเถ้า (Lv 40-48)'], ['volcanic_road', 35, 45, 'ถนนภูเขาไฟ (Lv 46-54)', 46], ['scorched_quarry', 2, 26, 'เหมืองหินไหม้ (Lv 48-56)', 48], ['molten_lake', 2, 27, 'ทะเลสาบลาวา (Lv 54-62)', 54]] });
npc(EH, 'sell', 'นักรับซื้อแร่ทอร์', 'sell', 24, 28, 'sage', { label: '[รับซื้อของ] ทอร์', say: ['เขี้ยวออร์ค แร่ร้อน เกล็ดซาลาแมนเดอร์... ข้ารับซื้อหมด'] });
npc(EH, 'foreman', 'หัวหน้าคนงานบรอค', 'quest', 36, 28, 'sage', { label: '[หัวหน้าคนงาน] บรอค', say: ['เหมืองหินทางตะวันออกเป็นของเรา! ก็อบลินพวกนั้นมาจากไหนก็ไม่รู้'] });
npc(EH, 'smith', 'ช่างตีเหล็กดูริน', 'smith', 7, 38, 'sage', { label: '[ช่างตีเหล็ก] ดูริน', station: 'smith', say: ['เหล็กเพลิงต้องตีตอนยังร้อน ช้าไปนิดเดียวก็เสียของ'] });
npc(EH, 'weapon', 'พ่อค้าอาวุธเกรเวน', 'shop', 15, 39, 'sage', { label: '[อาวุธ] เกรเวน', shop: 'e_weapon', say: ['อาวุธที่ตีจากเหล็กเอมเบอร์ ไม่บิ่นแม้ฟันลาวา'] });
npc(EH, 'alchemist', 'นักเล่นแร่มาร์ลา', 'craft', 23, 39, 'sage', { label: '[งานฝีมือ/นักเล่นแร่] มาร์ลา', station: 'craft', say: ['น้ำแร่เย็นจากใต้เมืองผสมผลึกไฟ... ได้ยาที่ดีที่สุดในชายแดน'] });
npc(EH, 'armor', 'ช่างเกราะฮิลดิส', 'shop', 39, 39, 'sage', { label: '[ชุดเกราะ] ฮิลดิส', shop: 'e_armor', say: ['เกราะโซ่ชายแดน กันทั้งขวานและเปลวไฟ'] });
npc(EH, 'shop', 'พ่อค้าเสบียงพิพพา', 'shop', 47, 39, 'merchant', { label: '[เสบียง] พิพพา', shop: 'e_general', say: ['ยาแดงภูเขาไฟ ขายดีจนผลิตไม่ทัน!'] });
npc('ash_plains', 'scout', 'หน่วยสอดแนมเคด', 'quest', 10, 26, 'sage', { label: '[ค่ายสอดแนม] เคด', say: ['ทางตะวันออกเฉียงเหนือคือเอมเบอร์โฮลด์ ระวังพวกออร์คในค่ายทางใต้'] });
npc('ash_plains', 'trader', 'พ่อค้าค่ายเรน', 'shop', 13, 29, 'merchant', { label: '[ร้านค้าค่าย] เรน', shop: 'camp3' });
npc('volcanic_road', 'captain', 'กัปตันลาดตระเวนไรซ์', 'quest', 38, 41, 'sage', { label: '[ป้อมยาม] ไรซ์', say: ['ข้ามสะพานลาวาไปทางตะวันออกคือค่ายสงครามของคอร์แร็ก อย่าไปคนเดียว'] });

const VIS = {
  'lumira:elder': M({ sex: 0, hair: 0, hc: 4, outfit: 'elder', head: '' }), 'lumira:inn': M({ sex: 1, hair: 5, hc: 2, outfit: 'innkeeper' }),
  'lumira:heal': M({ sex: 1, hair: 3, hc: 3, outfit: 'healer', head: 'circlet' }), 'lumira:weapon': M({ sex: 0, hair: 1, hc: 1, outfit: 'merchant', wpn: 'sword' }),
  'lumira:smith': M({ sex: 1, hair: 2, hc: 5, outfit: 'blacksmith', wpn: 'mace' }), 'lumira:shop': M({ sex: 0, hair: 0, hc: 2, outfit: 'merchant' }),
  'lumira:armor': M({ sex: 1, hair: 3, hc: 1, outfit: 'merchant', shield: 'round' }), 'lumira:sell': M({ sex: 0, hair: 0, hc: 0, outfit: 'merchant', head: 'traveler' }),
  'lumira:storage': M({ sex: 0, hair: 0, hc: 3, outfit: 'storage', head: 'cap' }), 'lumira:board': 'board',
  'lumira:m_vanguard': M({ sex: 0, hair: 0, hc: 1, arm: 'plate', cls: 'vanguard', back: 'cape_blue', wpn: 'sword', shield: 'kite', head: 'knight' }),
  'lumira:m_ranger': M({ sex: 0, hair: 2, hc: 6, arm: 'leather', cls: 'ranger', wpn: 'bow', head: 'hood_green', back: 'ranger' }),
  'lumira:warp': M({ sex: 1, hair: 3, hc: 7, outfit: 'mage', head: 'witch', wpn: 'wand' }), 'lumira:craft': M({ sex: 1, hair: 5, hc: 4, outfit: 'citizen', cls: 'artisan' }),
  'lumira:guide': M({ sex: 0, hair: 0, hc: 4, outfit: 'scholar', head: 'wizard', wpn: 'staff' }), 'lumira:farmer': M({ sex: 0, hair: 0, hc: 2, outfit: 'farmer', head: 'straw', wpn: 'axe' }),
  'lumira:kid': M({ sex: 1, hair: 4, hc: 3, outfit: 'citizen', scale: 0.8 }),
  'solkara:iris': M({ sex: 1, hair: 2, hc: 5, outfit: 'traveler' }), 'solkara:shop': M({ sex: 0, hair: 0, hc: 1, outfit: 'merchant' }),
  'solkara:heal': M({ sex: 1, hair: 5, hc: 2, outfit: 'healer' }), 'solkara:warp': M({ sex: 1, hair: 3, hc: 6, outfit: 'mage', head: 'witch', wpn: 'wand' }),
  'solkara:sell': M({ sex: 0, hair: 0, hc: 4, outfit: 'elder', head: 'traveler' }), 'solkara:smith': M({ sex: 0, hair: 1, hc: 1, outfit: 'blacksmith', wpn: 'mace' }),
  'solkara:weapon': M({ sex: 0, hair: 0, hc: 2, outfit: 'guard', head: 'iron', wpn: 'spear' }), 'solkara:armor': M({ sex: 1, hair: 3, hc: 6, outfit: 'merchant', shield: 'kite' }),
  'solkara:potion': M({ sex: 0, hair: 0, hc: 5, outfit: 'healer' }), 'solkara:board': 'board', 'solkara:archivist': M({ sex: 1, hair: 5, hc: 3, outfit: 'scholar' }),
  'solkara:captain': M({ sex: 0, hair: 0, hc: 1, outfit: 'guard', head: 'knight', wpn: 'sword', shield: 'kite', back: 'cape_blue' }),
  'solkara:bard': M({ sex: 0, hair: 2, hc: 6, outfit: 'bard', head: 'feather' }), 'solkara:guild': M({ sex: 1, hair: 2, hc: 1, outfit: 'guard', head: 'iron', wpn: 'spear' }),
  'solkara:m_cleric': M({ sex: 1, hair: 3, hc: 4, arm: 'robe_ivory', cls: 'cleric', back: 'cape_gold', wpn: 'mace', head: 'circlet' }),
  'solkara:bank': M({ sex: 0, hair: 0, hc: 0, outfit: 'noble', head: 'traveler' }), 'solkara:arena': M({ sex: 0, hair: 1, hc: 1, outfit: 'guard', head: 'iron', wpn: 'greatsword' }),
  'solkara:m_arcanist': M({ sex: 0, hair: 3, hc: 4, arm: 'robe_violet', cls: 'arcanist', back: 'cape_violet', wpn: 'staff', head: 'wizard' }),
  'solkara:scholar': M({ sex: 1, hair: 3, hc: 7, outfit: 'scholar' }), 'solkara:m_rogue': M({ sex: 0, hair: 0, hc: 1, arm: 'leather', cls: 'rogue', back: 'cape_violet', wpn: 'dagger', head: 'mask_shadow' }),
  'solkara:auction': M({ sex: 0, hair: 0, hc: 2, outfit: 'merchant', head: 'cap' }), 'solkara:m_artisan': M({ sex: 0, hair: 1, hc: 5, arm: 'tunic_brown', cls: 'artisan', back: 'cape_red', wpn: 'device', head: 'miner' }),
  'solkara:craft': M({ sex: 1, hair: 2, hc: 5, outfit: 'citizen', cls: 'artisan' }), 'solkara:inn': M({ sex: 0, hair: 0, hc: 2, outfit: 'innkeeper' }),
  'solkara:storage': M({ sex: 1, hair: 5, hc: 1, outfit: 'storage', head: 'cap' }), 'solkara:special': M({ sex: 1, hair: 4, hc: 7, outfit: 'merchant', head: 'witch' }),
  'solkara:gate': M({ sex: 0, hair: 0, hc: 1, outfit: 'guard', head: 'knight', wpn: 'spear' }), 'solkara:event': M({ sex: 1, hair: 4, hc: 3, outfit: 'bard', head: 'party' }),
  'solkara:noble': M({ sex: 0, hair: 0, hc: 6, outfit: 'noble', head: 'traveler' }),
  'beginner_meadow:shepherd': M({ sex: 0, hair: 0, hc: 2, outfit: 'farmer', head: 'straw', wpn: 'staff' }),
  'greenwood:scout': M({ sex: 1, hair: 2, hc: 6, outfit: 'traveler', head: 'hood_green', wpn: 'bow' }), 'greenwood:watch': M({ sex: 0, hair: 0, hc: 2, outfit: 'guard', head: 'leather', wpn: 'spear' }),
  'greenwood:trader': M({ sex: 1, hair: 5, hc: 1, outfit: 'merchant' }), 'greenwood:heal': M({ sex: 0, hair: 0, hc: 4, outfit: 'healer' }),
  'moonlit_creek:hermit': M({ sex: 0, hair: 3, hc: 4, outfit: 'elder', wpn: 'staff' }),
  'old_mine:bram': M({ sex: 0, hair: 0, hc: 1, outfit: 'miner', head: 'miner', wpn: 'pickaxe' }), 'old_mine:supply': M({ sex: 0, hair: 0, hc: 2, outfit: 'merchant', head: 'miner' }),
  'verdant_haven:elder': M({ sex: 1, hair: 3, hc: 4, outfit: 'elder', wpn: 'staff', head: 'circlet' }), 'verdant_haven:inn': M({ sex: 0, hair: 0, hc: 2, outfit: 'innkeeper' }),
  'verdant_haven:storage': M({ sex: 1, hair: 5, hc: 3, outfit: 'storage', head: 'cap' }), 'verdant_haven:heal': M({ sex: 1, hair: 2, hc: 6, outfit: 'healer', head: 'circlet' }),
  'verdant_haven:smith': M({ sex: 0, hair: 1, hc: 1, outfit: 'blacksmith', wpn: 'mace' }), 'verdant_haven:weapon': M({ sex: 0, hair: 0, hc: 2, outfit: 'merchant', wpn: 'spear' }),
  'verdant_haven:armor': M({ sex: 1, hair: 3, hc: 6, outfit: 'merchant', shield: 'round' }), 'verdant_haven:shop': M({ sex: 0, hair: 0, hc: 5, outfit: 'merchant' }),
  'verdant_haven:sell': M({ sex: 0, hair: 0, hc: 0, outfit: 'merchant', head: 'traveler' }), 'verdant_haven:warp': M({ sex: 1, hair: 4, hc: 6, outfit: 'mage', head: 'witch', wpn: 'wand' }),
  'verdant_haven:board': 'board', 'verdant_haven:shaman': M({ sex: 0, hair: 2, hc: 7, outfit: 'bard', head: 'feather', wpn: 'staff' }),
  'verdant_haven:alchemist': M({ sex: 1, hair: 5, hc: 5, outfit: 'scholar', head: 'wizard', cls: 'artisan' }), 'verdant_haven:ranger': M({ sex: 0, hair: 2, hc: 6, outfit: 'traveler', head: 'hood_green', wpn: 'bow' }),
  'verdant_haven:lorekeeper': M({ sex: 0, hair: 0, hc: 4, outfit: 'scholar', head: 'traveler' }),
  'deep_forest:warden': M({ sex: 1, hair: 2, hc: 6, outfit: 'traveler', head: 'hood_green', wpn: 'bow' }), 'deep_forest:trader': M({ sex: 0, hair: 0, hc: 1, outfit: 'merchant' }),
  'beast_valley:hunter': M({ sex: 0, hair: 0, hc: 2, outfit: 'guard', head: 'leather', wpn: 'spear' }),
  'emberhold:commander': M({ sex: 1, hair: 2, hc: 1, arm: 'plate', cls: 'vanguard', back: 'cape_red', wpn: 'sword', shield: 'kite', head: 'knight' }),
  'emberhold:heal': M({ sex: 1, hair: 3, hc: 1, outfit: 'healer', head: 'circlet' }), 'emberhold:priestess': M({ sex: 1, hair: 5, hc: 1, arm: 'robe_ivory', cls: 'cleric', wpn: 'staff', head: 'circlet' }),
  'emberhold:inn': M({ sex: 1, hair: 4, hc: 2, outfit: 'innkeeper' }), 'emberhold:storage': M({ sex: 0, hair: 0, hc: 0, outfit: 'storage', head: 'miner' }),
  'emberhold:lorekeeper': M({ sex: 0, hair: 3, hc: 4, outfit: 'scholar', head: 'traveler' }), 'emberhold:board': 'board',
  'emberhold:warp': M({ sex: 1, hair: 3, hc: 1, outfit: 'mage', head: 'witch', wpn: 'wand' }), 'emberhold:sell': M({ sex: 0, hair: 1, hc: 0, outfit: 'merchant', head: 'miner' }),
  'emberhold:foreman': M({ sex: 0, hair: 0, hc: 1, outfit: 'miner', head: 'miner', wpn: 'pickaxe' }), 'emberhold:smith': M({ sex: 0, hair: 1, hc: 1, outfit: 'blacksmith', wpn: 'mace' }),
  'emberhold:weapon': M({ sex: 0, hair: 0, hc: 1, outfit: 'merchant', wpn: 'greatsword' }), 'emberhold:alchemist': M({ sex: 1, hair: 2, hc: 1, outfit: 'scholar', head: 'wizard', cls: 'artisan' }),
  'emberhold:armor': M({ sex: 1, hair: 1, hc: 6, outfit: 'merchant', shield: 'round' }), 'emberhold:shop': M({ sex: 1, hair: 5, hc: 2, outfit: 'merchant' }),
  'ash_plains:scout': M({ sex: 0, hair: 2, hc: 1, outfit: 'traveler', head: 'traveler', wpn: 'bow' }), 'ash_plains:trader': M({ sex: 0, hair: 0, hc: 2, outfit: 'merchant' }),
  'volcanic_road:captain': M({ sex: 0, hair: 1, hc: 0, outfit: 'guard', head: 'iron', wpn: 'spear' }),
};
for (const n of N) { const v = VIS[n.map + ':' + n.id]; if (v) n.look = v === 'board' ? 'board' : Object.assign({ sex: 0, hair: 0, hc: 0, cc: 0 }, v); }
// interactive spots that are people (Cleric trial): injured guards beside the arena
const INJURED = [['solkara', 'inj1', 48, 33], ['solkara', 'inj2', 57, 33], ['solkara', 'inj3', 61, 22]];
module.exports = { NPCS: N, INJURED };
