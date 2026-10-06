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
npc('lumira', 'warp', 'นักเดินทางพิป', 'teleport', 30, 15, 'warper', { label: '[วาร์ป] พิป', dest: [['beginner_meadow', 3, 24, 'ทุ่งหญ้าผู้เริ่มต้น (Lv 1-8)'], ['solkara', 21, 20, 'นครเอลินดรา'], ['plains', 3, 22, 'ทุ่งทรายสีทอง (Lv 1-10)'], ['woods', 25, 2, 'ป่าโอเอซิส (Lv 5-15)'], ['greenwood', 3, 50, 'ป่ากรีนวูด (Lv 8-18)', 8]], say: ['จะไปไหนดี? ส่งฟรีสำหรับนักผจญภัยหน้าใหม่!'] });
npc('lumira', 'craft', 'ยายเรน ช่างฝีมือ', 'craft', 44, 23, H(1, 1, 3, 4), { label: '[งานฝีมือ] ยายเรน', station: 'craft', say: ['สมุนไพรกับขนนุ่มๆ ทำอะไรได้เยอะนะหลานเอ๋ย'] });
npc('lumira', 'guide', 'แอสเตอร์ ผู้แนะแนวอาชีพ', 'lore', 23, 11, H(1, 0, 7, 2, 'wizard'), { label: '[แนะแนวอาชีพ] แอสเตอร์', say: [
  'เมื่อถึง Lv 10 เจ้าเลือกอาชีพแรกได้ 6 สาย:\n• แวนการ์ด / เรนเจอร์ — ครูอยู่ที่หมู่บ้านนี้\n• อาร์คานิสต์ / เคลริก / โร้ก / อาร์ติซาน — ครูอยู่ที่นครเอลินดรา\nแต่ละสายมีบททดสอบของตัวเอง'] });
npc('lumira', 'farmer', 'ลุงทอม', 'quest', 40, 16, H(4, 0, 0, 0, 'straw'), { label: '[ชาวไร่] ลุงทอม', say: ['ปีนี้ผักงามจริงๆ'] });
npc('lumira', 'kid', 'ทิลลี่', 'lore', 22, 27, H(3, 1, 2, 5), { label: 'ทิลลี่', say: ['พี่ๆ เห็นดาวตกเมื่อคืนไหม? หนูขอพรว่าอยากเป็นนักผจญภัย!', 'ถ้ากดค้างที่จอยสติ๊กจะเดินไปเรื่อยๆ นะ'] });

// ---------------- Elyndra Capital (Solkara). Old Town keeps the original five NPCs and ids.
npc('solkara', 'iris', 'ไอริส', 'quest', 21, 12, 'iris', { label: '[เควส] ไอริส', legacy: 1 });
npc('solkara', 'shop', 'พ่อค้าซาฮีร์', 'shop', 16, 19, 'merchant', { label: '[ร้านค้า] ซาฮีร์', shop: 'legacy' });
npc('solkara', 'heal', 'นางพยาบาลมีน่า', 'heal', 26, 19, 'nurse', { label: '[ฮีลฟรี] มีน่า' });
npc('solkara', 'warp', 'นักเดินทางคาเรน', 'teleport', 26, 13, 'warper', { label: '[วาร์ป] คาเรน', dest: [['plains', 3, 22, 'ทุ่งทรายสีทอง (Lv 1-10)'], ['woods', 25, 2, 'ป่าโอเอซิส (Lv 5-15)'], ['lumira', 25, 20, 'หมู่บ้านลูมิร่า'], ['beginner_meadow', 3, 24, 'ทุ่งหญ้าผู้เริ่มต้น (Lv 1-8)'], ['greenwood', 3, 50, 'ป่ากรีนวูด (Lv 8-18)', 8], ['moonlit_creek', 3, 26, 'ลำธารแสงจันทร์ (Lv 14-24)', 14]] });
npc('solkara', 'sell', 'นักสะสมโบราณ', 'sell', 16, 13, 'sage', { label: '[รับซื้อของ] ปราชญ์' });
npc('solkara', 'smith', 'ช่างตีเหล็กการ์แรน', 'smith', 37, 10, H(4, 0, 0, 0, 'leather'), { label: '[ช่างตีเหล็ก] การ์แรน', station: 'smith', say: ['เตาของข้าร้อนพอจะหลอมเหล็กกล้า'] });
npc('solkara', 'weapon', 'คลังอาวุธหลวง', 'shop', 8, 10, H(0, 0, 2, 0, 'iron'), { label: '[อาวุธ] คลังหลวง', shop: 'c_weapon' });
npc('solkara', 'armor', 'ช่างเกราะเวสเปอร์', 'shop', 31, 10, H(0, 1, 6, 3), { label: '[ชุดเกราะ] เวสเปอร์', shop: 'c_armor' });
npc('solkara', 'potion', 'นักปรุงยาฟีน', 'shop', 9, 20, H(1, 1, 5, 4), { label: '[ร้านยา] ฟีน', shop: 'c_potion' });
npc('solkara', 'board', 'กระดานประกาศหลวง', 'board', 24, 23, 'board', { label: '[กระดานประกาศ]' });
npc('solkara', 'archivist', 'บรรณารักษ์เซลีน', 'quest', 14, 30, H(1, 1, 3, 2), { label: '[หอจดหมายเหตุ] เซลีน', say: ['ความรู้คือแสงสว่างในยามมืด'] });
npc('solkara', 'captain', 'กัปตันโรวัน', 'quest', 34, 29, H(0, 0, 1, 0, 'iron'), { label: '[ทหารหลวง] โรวัน', say: ['กองทหารหลวงพร้อมปกป้องนคร'] });
npc('solkara', 'bard', 'นักกวีลิโอ', 'quest', 33, 20, H(2, 0, 6, 2, 'feather'), { label: '[นักกวี] ลิโอ', say: ['♪ โอ้เอลินดรา ดินแดนแห่งรูน ♪'] });
npc('solkara', 'guild', 'ผู้ดูแลหอกิลด์', 'guild', 50, 9, H(0, 1, 0, 2, 'iron'), { label: '[หอกิลด์] เอเดรีย', say: ['หอกิลด์กำลังจัดระเบียบใหม่ ระบบกิลด์จะเปิดเร็วๆ นี้'] });
npc('solkara', 'm_cleric', 'มารดาออเรเลีย', 'master', 60, 9, 'nurse', { label: '[ครูเคลริก] ออเรเลีย', cls: 'cleric', say: ['แสงรุ่งอรุณไม่เคยทอดทิ้งใคร'] });
npc('solkara', 'bank', 'นายธนาคารคอยน์', 'bank', 69, 9, H(3, 0, 0, 0, 'traveler'), { label: '[ธนาคาร] คอยน์' });
npc('solkara', 'arena', 'ผู้ดูแลลานประลอง', 'arena', 53, 21, H(4, 0, 1, 0, 'iron'), { label: '[ลานประลอง] บรูโน', say: ['ลานประลองเปิดให้ซ้อมเท่านั้นในตอนนี้ การแข่งขันจริงจะตามมา'] });
npc('solkara', 'm_arcanist', 'เมจิสเตอร์เซล', 'master', 67, 29, H(1, 0, 4, 0, 'wizard'), { label: '[ครูอาร์คานิสต์] เซล', cls: 'arcanist', say: ['อักษรรูนคือภาษาของโลก'] });
npc('solkara', 'scholar', 'นักวิชาการไอวี่', 'lore', 71, 20, H(1, 1, 7, 4), { label: 'ไอวี่', say: ['ว่ากันว่าก่อนอาณาจักรเอลินดรา มีอาณาจักรที่ใช้รูนสร้างเมืองลอยฟ้า... แล้ววันหนึ่งมันก็แตกสลาย'] });
npc('solkara', 'm_rogue', '"วิสเปอร์"', 'master', 6, 41, H(3, 0, 0, 0, 'mask_shadow'), { label: '[ครูโร้ก] วิสเปอร์', cls: 'rogue', say: ['...เจ้าไม่ได้เห็นข้า'] });
npc('solkara', 'auction', 'ผู้ดูแลตลาดประมูล', 'auction', 14, 42, 'merchant', { label: '[ตลาดประมูล] มาร์โก', say: ['ตลาดประมูลระหว่างผู้เล่นกำลังเตรียมเปิด ตอนนี้ฝากขายไม่ได้นะ'] });
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

// interactive spots that are people (Cleric trial): injured guards beside the arena
const INJURED = [['solkara', 'inj1', 48, 33], ['solkara', 'inj2', 57, 33], ['solkara', 'inj3', 61, 22]];
module.exports = { NPCS: N, INJURED };
