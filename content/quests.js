'use strict';
// Quest registry. Stage kinds:
//   talk {npc}            talk to an NPC ("map:id"; may be {flag: npc} after a choice)
//   kill {mob, n, bow?}   defeat monsters (bow: only kills made with a bow equipped count)
//   collect {item, n}     have n of an item in the bag (kept until a later deliver/talk with take)
//   gather {node, item, n} interact with map nodes of that kind to get the item
//   interact {node, n}    touch n different nodes of that kind (shrines...)
//   visit {map, x, y, r}  reach a place
//   deliver {npc, item, n} hand items to an NPC (consumed)
//   choice {npc, opts:[[flag,label]]}  pick one answer; stored as a flag for later stages/rewards
//   craft {recipe, n}     craft at a workshop
//   wave {id}             survive a scripted wave event (Vanguard trial)
//   heal {node, n, item}  treat injured people (uses one item each)
//   sneak {node, item}    take an item from a guarded spot without being seen
// say: text shown when the stage is reached (dialogue). take: [[item,n]] consumed when the stage completes.
// reward: { exp, jexp, zeny, items:[[id,q]], byFlag:{flag:[[id,q]]} }  cls: class granted on completion.
const Q = {};
const q = (id, o) => { Q[id] = Object.assign({ id, req: {}, reward: {} }, o); };

// ================= MAIN STORY — Chapter 1: The Fallen Rune Shard
q('mq1', { type: 'main', th: 'ดาวตกเหนือลูมิร่า', giver: 'lumira:elder', auto: 1, stages: [
  { k: 'talk', npc: 'lumira:elder', d: 'คุยกับผู้ใหญ่บ้านมาเรนที่บ้านทางเหนือของลานหมู่บ้าน',
    say: 'เมื่อคืนมีดาวตกลงมาทางทุ่งหญ้าตะวันออก... แสงสีฟ้าแบบนั้นข้าไม่เคยเห็นมาห้าสิบปี\nเจ้านักผจญภัยหน้าใหม่ ช่วยไปดูให้หน่อยได้ไหม? ออกทางตะวันออกของหมู่บ้านไปเลย' },
  { k: 'visit', map: 'beginner_meadow', x: 46, y: 9, r: 4, d: 'ไปที่หลุมดาวตก มุมตะวันออกเฉียงเหนือของทุ่งหญ้าผู้เริ่มต้น' },
  { k: 'gather', node: 'shard', item: 150, n: 1, d: 'เก็บเศษหินเรืองแสงในหลุมดาวตก', say: 'ในหลุมมีเศษหินสลักอักษรประหลาดเรืองแสงอยู่...' },
  { k: 'talk', npc: 'lumira:elder', take: [[150, 1]], d: 'นำเศษรูนกลับไปให้ผู้ใหญ่บ้านมาเรน',
    say: 'อักษรรูน... ตำนานว่ามันคือเศษของ "อาณาจักรแตกสลาย" ที่หายไปเมื่อพันปีก่อน\nเก็บผ้าคาดหัวนี้ไว้นะ มันเคยเป็นของข้าตอนยังเป็นนักผจญภัย' },
], reward: { exp: 120, jexp: 30, zeny: 150, items: [[1, 5], [351, 1]] } });
q('mq2', { type: 'main', th: 'เสียงกระซิบในทุ่ง', giver: 'lumira:elder', req: { quest: 'mq1', lv: 3 }, stages: [
  { k: 'talk', npc: 'lumira:elder', d: 'คุยกับผู้ใหญ่บ้านมาเรน', say: 'ตั้งแต่ดาวตก พืชในทุ่งเริ่มเดินได้และดุร้ายขึ้น ข้าว่ามันเกี่ยวกับเศษรูน\nช่วยปราบพวกมันและเก็บยางของพวกมันมาให้ข้าศึกษาที' },
  { k: 'kill', mob: 'sprout', n: 6, d: 'ปราบ สไปรต์ดอกตูม' },
  { k: 'kill', mob: 'budling', n: 3, d: 'ปราบ บัดลิงทุ่งดอกไม้' },
  { k: 'collect', item: 100, n: 5, d: 'เก็บ ยางดอกตูม' },
  { k: 'talk', npc: 'lumira:elder', take: [[100, 5]], d: 'นำยางดอกตูมไปให้ผู้ใหญ่บ้าน', say: 'ยางพวกนี้มีประกายสีฟ้าเหมือนเศษรูน... พลังของมันกำลังรั่วไหลสู่แผ่นดิน' },
], reward: { exp: 420, jexp: 80, zeny: 300, items: [[400, 1], [1, 5]] } });
q('mq3', { type: 'main', th: 'ถนนสู่เมืองหลวง', giver: 'lumira:elder', req: { quest: 'mq2', lv: 6 }, stages: [
  { k: 'talk', npc: 'lumira:elder', give: [[151, 1]], d: 'คุยกับผู้ใหญ่บ้านมาเรน', say: 'เรื่องนี้ใหญ่เกินหมู่บ้านเล็กๆ จะรับมือ จงนำจดหมายฉบับนี้ไปให้บรรณารักษ์เซลีนที่นครเอลินดรา\nเมืองหลวงอยู่ทางเหนือ เดินตามถนนออกไปได้เลย' },
  { k: 'visit', map: 'solkara', x: 21, y: 20, r: 8, d: 'เดินทางไปนครเอลินดรา (ทางเหนือของหมู่บ้าน)' },
  { k: 'deliver', npc: 'solkara:archivist', item: 151, n: 1, d: 'ส่งจดหมายให้บรรณารักษ์เซลีน (ย่านเมืองเก่า ทิศใต้)', say: 'จดหมายจากมาเรน? ...ดาวตก เศษรูน... นี่มันตรงกับบันทึกโบราณเรื่อง "รอยร้าวแห่งวอยด์"' },
], reward: { exp: 900, jexp: 150, zeny: 500, items: [[2, 3]] } });
q('mq4', { type: 'main', th: 'ทางแยกของผู้พิทักษ์', giver: 'solkara:archivist', req: { quest: 'mq3', lv: 8 }, stages: [
  { k: 'talk', npc: 'solkara:archivist', d: 'ฟังบรรณารักษ์เซลีน', say: 'กองทหารหลวงต้องการยึดเศษรูนไปเก็บ ส่วนวงเวทอาร์คานาอยากศึกษามัน\nข้าอยากให้เจ้าเป็นคนตัดสิน... เจ้าคือผู้ที่พบมัน' },
  { k: 'choice', npc: 'solkara:archivist', opts: [['guard', 'มอบให้กองทหารหลวงเก็บรักษา'], ['circle', 'ส่งให้วงเวทอาร์คานาศึกษา']], d: 'เลือกว่าจะมอบเศษรูนให้ใคร' },
  { k: 'talk', npc: { guard: 'solkara:captain', circle: 'solkara:m_arcanist' }, d: 'ไปพบผู้รับเศษรูนตามที่เลือก',
    say: { guard: 'กัปตันโรวัน: ขอบคุณ ข้าจะคุ้มกันมันด้วยชีวิต ...แต่หน่วยสอดแนมรายงานว่าป่ากรีนวูดกำลังเน่าเปื่อย', circle: 'เมจิสเตอร์เซล: น่าทึ่ง! พลังในนี้เชื่อมกับบางสิ่งในป่ากรีนวูด... ข้าสัมผัสได้' } },
], reward: { exp: 1300, jexp: 220, zeny: 600, byFlag: { guard: [[303, 1]], circle: [[305, 1]] } } });
q('mq5', { type: 'main', th: 'ป่ากำลังป่วย', giver: 'greenwood:scout', req: { quest: 'mq4', lv: 10 }, stages: [
  { k: 'talk', npc: 'greenwood:scout', d: 'พบหน่วยพิทักษ์ป่าไลร่าที่ค่ายกลางป่ากรีนวูด (ทางตะวันออกเฉียงเหนือของทุ่งหญ้า)', say: 'เจ้ามาจากเมืองหลวงสินะ ป่ากำลังป่วย รากไม้เหี่ยวดำ ภูตหนามคลุ้มคลั่ง\nช่วยกำจัดพวกมันและเก็บตัวอย่างรากไม้มาที' },
  { k: 'kill', mob: 'thornsprite', n: 6, d: 'ปราบ สไปรต์หนาม' },
  { k: 'gather', node: 'root', item: 152, n: 3, d: 'เก็บ รากไม้เหี่ยว (จุดเรืองแสงทางเหนือของค่าย)' },
  { k: 'deliver', npc: 'greenwood:scout', item: 152, n: 3, d: 'ส่งรากไม้เหี่ยวให้ไลร่า', say: 'รากพวกนี้ทอดไปทางเหนือ... สู่ป่าศักดิ์สิทธิ์ของเอลเดอร์ธอร์นวูด ต้นไม้ผู้เฝ้าป่า' },
], reward: { exp: 2600, jexp: 400, zeny: 800, items: [[2, 5]] } });
q('mq6', { type: 'main', th: 'หัวใจของธอร์นวูด', giver: 'greenwood:scout', req: { quest: 'mq5', lv: 14 }, stages: [
  { k: 'talk', npc: 'greenwood:scout', d: 'คุยกับไลร่า', say: 'ธอร์นวูดถูกพลังเสื่อมกลืนไปแล้ว ถ้าไม่หยุดมัน ป่าทั้งผืนจะตาย\nมันอยู่ในลานเอลเดอร์ทางเหนือสุดของป่า หาเพื่อนไปด้วยจะดีกว่า' },
  { k: 'kill', mob: 'thornwood', n: 1, d: 'ปราบ บอส เอลเดอร์ ธอร์นวูด (ลานเอลเดอร์ ทิศเหนือ)' },
  { k: 'talk', npc: 'greenwood:scout', d: 'กลับไปรายงานไลร่า', say: 'ในแก่นไม้ของมันมีเศษรูนฝังอยู่... ใครบางคนกำลังหว่านเศษพวกนี้ไปทั่วเอลินดรา\nฤษีแห่งลำธารแสงจันทร์อาจรู้อะไรบางอย่าง ไปทางตะวันออกของป่า' },
], reward: { exp: 5200, jexp: 800, zeny: 2000, items: [[408, 1]] } });
q('mq7', { type: 'main', th: 'เสียงสะท้อนใต้แสงจันทร์', giver: 'moonlit_creek:hermit', req: { quest: 'mq6', lv: 16 }, stages: [
  { k: 'talk', npc: 'moonlit_creek:hermit', d: 'พบฤษีโอเรนที่ปากทางลำธารแสงจันทร์', say: 'ศาลจันทร์ทั้งสามเคยผนึกรอยร้าวไว้ใต้ลำธารนี้ ถ้าเจ้าจุดมันได้ ข้าจะได้ยินเสียงของรูน' },
  { k: 'interact', node: 'shrine', n: 3, d: 'จุดศาลจันทร์ทั้ง 3 แห่ง' },
  { k: 'talk', npc: 'moonlit_creek:hermit', d: 'กลับไปหาฤษีโอเรน', say: 'รูนกระซิบชื่อหนึ่ง... "ไอรอนจอว์" ในเหมืองเก่า มันกำลังขุดหาสิ่งที่ไม่ควรถูกขุด' },
], reward: { exp: 6400, jexp: 900, zeny: 1500, items: [[361, 1]] } });
q('mq8', { type: 'main', th: 'เข้าสู่เหมืองเก่า', giver: 'old_mine:bram', req: { quest: 'mq7', lv: 20 }, stages: [
  { k: 'talk', npc: 'old_mine:bram', d: 'พบแบรม ผู้รอดชีวิตที่ปากเหมืองเก่า (ทางตะวันออกเฉียงใต้ของลำธาร)', say: 'เพื่อนข้าทั้งกะ... กลายเป็นโครงกระดูกเดินได้ หัวหน้าไอรอนจอว์สั่งให้ขุดลึกลงไปเรื่อยๆ\nบันทึกของข้ายังอยู่ในรถขนแร่ชั้นล่าง มันจะบอกว่าเราขุดเจออะไร' },
  { k: 'kill', mob: 'skeletonminer', n: 6, d: 'ปราบ โครงกระดูกคนงาน' },
  { k: 'gather', node: 'journal', item: 153, n: 1, d: 'ค้นหาบันทึกในซากรถขนแร่ (ชั้นล่าง)' },
  { k: 'deliver', npc: 'old_mine:bram', item: 153, n: 1, d: 'นำบันทึกไปให้แบรม', say: '"วันที่ 40: เราพบผลึกสีดำที่ดูดแสง หัวหน้าไม่ยอมให้ใครแตะ..." ผลึกวอยด์!' },
], reward: { exp: 9500, jexp: 1300, zeny: 2500, items: [[357, 1]] } });
q('mq9', { type: 'main', th: 'ทรราชแห่งเหมือง', giver: 'old_mine:bram', req: { quest: 'mq8', lv: 24 }, stages: [
  { k: 'talk', npc: 'old_mine:bram', d: 'คุยกับแบรม', say: 'ไอรอนจอว์อยู่ที่ห้องหลอมแร่ชั้นล่างสุด ทางตะวันออกเฉียงใต้... จบเรื่องนี้ทีเถอะ' },
  { k: 'kill', mob: 'ironjaw', n: 1, give: [[154, 1]], d: 'ปราบ บอส ไอรอนจอว์ (ห้องหลอมแร่ ชั้นล่างสุด)' },
  { k: 'deliver', npc: 'solkara:archivist', item: 154, n: 1, d: 'นำผลึกแตะวอยด์ไปให้บรรณารักษ์เซลีนที่นครเอลินดรา',
    say: 'ผลึกนี้... เย็นเหมือนความว่างเปล่า บันทึกโบราณเรียกมันว่า "เมล็ดแห่งวอยด์"\nเศษรูนคือกุญแจ ผลึกวอยด์คือประตู ถ้าใครรวบรวมได้ครบ อาณาจักรแตกสลายจะกลับมา... พร้อมกับวอยด์\nบทต่อไป: ป่าเขียวขจี (เร็วๆ นี้)' },
], reward: { exp: 21000, jexp: 2500, zeny: 6000, items: [[409, 1], [5, 5]] } });

// ================= SIDE QUESTS
q('s_parcel', { type: 'delivery', th: 'พัสดุของลุงทอม', giver: 'lumira:farmer', req: { lv: 4 }, stages: [
  { k: 'talk', npc: 'lumira:farmer', give: [[163, 1]], d: 'คุยกับลุงทอม', say: 'ข้าส่งผักให้พ่อค้าซาฮีร์ที่เมืองหลวงทุกเดือน แต่ขาข้าไม่ไหวแล้ว ช่วยไปส่งแทนทีนะ' },
  { k: 'deliver', npc: 'solkara:shop', item: 163, n: 1, d: 'ส่งพัสดุให้พ่อค้าซาฮีร์ (ลานกลางนครเอลินดรา)', say: 'ผักของลุงทอม! สดเหมือนเคย ฝากขอบคุณด้วยนะ' },
], reward: { exp: 320, zeny: 250 } });
q('s_herbs', { type: 'collection', th: 'สมุนไพรให้ซิสเตอร์', giver: 'lumira:heal', req: { lv: 2 }, stages: [
  { k: 'talk', npc: 'lumira:heal', d: 'คุยกับซิสเตอร์เอลิน', say: 'ยาของโบสถ์ใกล้หมดแล้ว สมุนไพรทุ่งขึ้นอยู่ทั่วทุ่งหญ้าตะวันออก ช่วยเก็บมาให้หน่อยนะ' },
  { k: 'collect', item: 104, n: 5, d: 'เก็บ สมุนไพรทุ่ง (จุดสมุนไพรในทุ่งหญ้าผู้เริ่มต้น)' },
  { k: 'deliver', npc: 'lumira:heal', item: 104, n: 5, d: 'ส่งสมุนไพรให้ซิสเตอร์เอลิน' },
], reward: { exp: 260, zeny: 120, items: [[8, 3]] } });
q('s_dew', { type: 'hunting', th: 'สไลม์ในบ่อน้ำ', giver: 'beginner_meadow:shepherd', req: { lv: 1 }, stages: [
  { k: 'talk', npc: 'beginner_meadow:shepherd', d: 'คุยกับคนเลี้ยงแกะเบน', say: 'สไลม์น้ำค้างลงไปเล่นในบ่อจนแกะไม่กล้ากินน้ำ ช่วยไล่พวกมันที' },
  { k: 'kill', mob: 'dewslime', n: 8, d: 'ปราบ สไลม์น้ำค้าง' },
  { k: 'talk', npc: 'beginner_meadow:shepherd', d: 'กลับไปบอกเบน' },
], reward: { exp: 220, zeny: 120, items: [[1, 5]] } });
q('s_explore', { type: 'exploration', th: 'นักสำรวจหน้าใหม่', giver: 'solkara:bard', req: { lv: 8 }, stages: [
  { k: 'talk', npc: 'solkara:bard', d: 'คุยกับนักกวีลิโอ', say: 'ข้ากำลังแต่งเพลงเรื่องดินแดนรอบเมืองหลวง แต่ข้าไม่เคยออกไปไหนเลย! ช่วยไปดูแทนข้าที' },
  { k: 'visit', map: 'greenwood', x: 34, y: 31, r: 6, d: 'ไปค่ายพิทักษ์ป่ากลางป่ากรีนวูด' },
  { k: 'visit', map: 'moonlit_creek', x: 29, y: 24, r: 5, d: 'ไปสะพานไม้กลางลำธารแสงจันทร์' },
  { k: 'talk', npc: 'solkara:bard', d: 'กลับไปเล่าให้ลิโอฟัง' },
], reward: { exp: 1800, zeny: 600, items: [[356, 1]] } });
q('s_goblins', { type: 'hunting', th: 'ก็อบลินขโมยเสบียง', giver: 'greenwood:watch', req: { lv: 11 }, stages: [
  { k: 'talk', npc: 'greenwood:watch', d: 'คุยกับยามป่าฮาร์ลอว์', say: 'ก็อบลินมอสขโมยเสบียงค่ายไปอีกแล้ว! ไปสั่งสอนพวกมันที อยู่ทางตะวันออกเฉียงใต้ของค่าย' },
  { k: 'kill', mob: 'mossgoblin', n: 6, d: 'ปราบ ก็อบลินมอส' },
  { k: 'kill', mob: 'goblinsling', n: 4, d: 'ปราบ ก็อบลินนักสลิง' },
  { k: 'talk', npc: 'greenwood:watch', d: 'กลับไปรายงานฮาร์ลอว์' },
], reward: { exp: 2700, zeny: 900, items: [[352, 1]] } });
q('s_wolves', { type: 'hunting', th: 'เสียงหอนกลางป่า', giver: 'greenwood:watch', req: { quest: 's_goblins', lv: 14 }, stages: [
  { k: 'talk', npc: 'greenwood:watch', d: 'คุยกับฮาร์ลอว์', say: 'ฝูงหมาป่าหนามล้อมค่ายทุกคืน ข้าต้องการคนล่าที่กล้าพอ' },
  { k: 'kill', mob: 'thornwolf', n: 6, d: 'ปราบ หมาป่าหนาม' },
  { k: 'talk', npc: 'greenwood:watch', d: 'กลับไปหาฮาร์ลอว์' },
], reward: { exp: 3600, zeny: 1000, items: [[405, 1]] } });
q('s_moonflower', { type: 'collection', th: 'ดอกไม้แห่งราตรี', giver: 'moonlit_creek:hermit', req: { lv: 16 }, stages: [
  { k: 'talk', npc: 'moonlit_creek:hermit', d: 'คุยกับฤษีโอเรน', say: 'ดอกจันทร์ราตรีใช้ทำยาสงบวิญญาณ ช่วยเก็บมาให้ข้าสักสี่ดอก' },
  { k: 'gather', node: 'flower', item: 162, n: 4, d: 'เก็บ ดอกจันทร์ราตรี' },
  { k: 'deliver', npc: 'moonlit_creek:hermit', item: 162, n: 4, d: 'ส่งดอกไม้ให้ฤษีโอเรน' },
], reward: { exp: 4400, zeny: 1200, items: [[6, 3]] } });
q('s_ore', { type: 'collection', th: 'แร่สำหรับช่างตีเหล็ก', giver: 'solkara:smith', req: { lv: 20 }, stages: [
  { k: 'talk', npc: 'solkara:smith', d: 'คุยกับช่างการ์แรน', say: 'เหล็กในเมืองหมดตั้งแต่เหมืองเก่าปิด ถ้าเจ้าลงเหมืองได้ เอาแร่เหล็กมาให้ข้าหน่อย' },
  { k: 'collect', item: 120, n: 6, d: 'เก็บ แร่เหล็ก (สายแร่ในเหมืองเก่า)' },
  { k: 'deliver', npc: 'solkara:smith', item: 120, n: 6, d: 'ส่งแร่เหล็กให้การ์แรน' },
], reward: { exp: 6000, zeny: 1800, items: [[217, 1]] } });
q('s_bats', { type: 'hunting', th: 'ค้างคาวในความมืด', giver: 'old_mine:bram', req: { lv: 21 }, stages: [
  { k: 'talk', npc: 'old_mine:bram', d: 'คุยกับแบรม', say: 'ค้างคาวถ้ำมาเป็นฝูง ทำให้คนงานที่เหลือไม่กล้าเข้ามาเก็บของ' },
  { k: 'kill', mob: 'cavebat', n: 10, d: 'ปราบ ค้างคาวถ้ำ' },
  { k: 'talk', npc: 'old_mine:bram', d: 'กลับไปหาแบรม' },
], reward: { exp: 6800, zeny: 1500, items: [[2, 10]] } });

// ================= DAILY (Quest Board) — once per day
q('d_meadow', { type: 'daily', repeat: 'daily', th: 'ประกาศ: ทุ่งหญ้าปลอดภัย', giver: 'lumira:board', req: { lv: 3, max: 14 }, stages: [
  { k: 'kill', mob: 'budling', n: 5, d: 'ปราบ บัดลิงทุ่งดอกไม้' }, { k: 'kill', mob: 'hopper', n: 5, d: 'ปราบ ด้วงกระโดดทุ่ง' },
  { k: 'talk', npc: 'lumira:board', d: 'รายงานที่กระดานประกาศลูมิร่า' },
], reward: { exp: 380, zeny: 220 } });
q('d_forest', { type: 'daily', repeat: 'daily', th: 'ประกาศ: ลาดตระเวนกรีนวูด', giver: 'solkara:board', req: { lv: 10, max: 24 }, stages: [
  { k: 'kill', mob: 'barkbeetle', n: 8, d: 'ปราบ ด้วงเปลือกไม้' }, { k: 'talk', npc: 'solkara:board', d: 'รายงานที่กระดานประกาศเมืองหลวง' },
], reward: { exp: 2400, zeny: 650 } });
q('d_mine', { type: 'daily', repeat: 'daily', th: 'ประกาศ: กวาดล้างเหมืองเก่า', giver: 'solkara:board', req: { lv: 20 }, stages: [
  { k: 'kill', mob: 'rustbot', n: 6, d: 'ปราบ หุ่นสนิมเหมือง' }, { k: 'talk', npc: 'solkara:board', d: 'รายงานที่กระดานประกาศเมืองหลวง' },
], reward: { exp: 6200, zeny: 1300 } });

// ================= CLASS CHANGE (Lv10+, Adventurer): intro -> trial -> combat test -> collect -> ceremony
const CLS_REQ = { lv: 10, cls: 'adventurer', oneOf: 'class' };
q('cls_vanguard', { type: 'class', th: 'บททดสอบแวนการ์ด: ปกป้องลูมิร่า', giver: 'lumira:m_vanguard', req: CLS_REQ, cls: 'vanguard', stages: [
  { k: 'talk', npc: 'lumira:m_vanguard', d: 'คุยกับกัปตันดาริอุสที่ลานฝึกทหาร', say: 'แวนการ์ดคือกำแพงของทุกคน ถ้าเจ้าอยากเป็น จงพิสูจน์ว่ายืนหยัดได้\nเมื่อพร้อม บอกข้า แล้วข้าจะปล่อยหุ่นรุกรานจากประตูตะวันออก' },
  { k: 'wave', id: 'lumira_gate', npc: 'lumira:m_vanguard', d: 'ป้องกันประตูตะวันออกของหมู่บ้าน: ผู้รุกราน 3 ระลอก (คุยกับดาริอุสเพื่อเริ่ม)' },
  { k: 'kill', mob: 'thornsprite', n: 5, d: 'บททดสอบการต่อสู้: ปราบ สไปรต์หนาม ในป่ากรีนวูด' },
  { k: 'collect', item: 106, n: 3, d: 'เก็บ กระดองด้วงเปลือก (สำหรับโล่ของเจ้า)' },
  { k: 'talk', npc: 'lumira:m_vanguard', take: [[106, 3]], d: 'กลับไปรับพิธีเลื่อนขั้นกับกัปตันดาริอุส', say: 'เจ้ายืนหยัดได้ทั้งต่อหน้าผู้รุกรานและป่าหนาม... ตั้งแต่วันนี้ เจ้าคือ แวนการ์ด!' },
], reward: { exp: 1500, jexp: 0, zeny: 500, items: [[205, 1], [303, 1]] } });
q('cls_ranger', { type: 'class', th: 'บททดสอบเรนเจอร์: ศรไม่พลาดเป้า', giver: 'lumira:m_ranger', req: CLS_REQ, cls: 'ranger', stages: [
  { k: 'talk', npc: 'lumira:m_ranger', give: [[202, 1]], d: 'คุยกับเฟลานที่สนามยิงธนู', say: 'เรนเจอร์ต้องยิงแม่นและล่าเป็น เอาธนูไม้สนนี่ไป สวมใส่แล้วยิงเป้าซ้อมให้ล้มห้าอัน' },
  { k: 'kill', mob: 'target', n: 5, bow: 1, d: 'ยิงเป้าซ้อมที่สนามยิงธนูให้ล้ม (ต้องสวมธนู)' },
  { k: 'kill', mob: 'barkbeetle', n: 4, d: 'บททดสอบการล่า: ปราบ ด้วงเปลือกไม้ ในป่ากรีนวูด' },
  { k: 'collect', item: 102, n: 4, d: 'เก็บ ปีกแมลงทุ่ง (ใช้ทำหางลูกศร)' },
  { k: 'talk', npc: 'lumira:m_ranger', take: [[102, 4]], d: 'กลับไปรับพิธีเลื่อนขั้นกับเฟลาน', say: 'ศรของเจ้าไม่พลาดเป้า และเจ้ารู้จักป่า... ยินดีต้อนรับ เรนเจอร์!' },
], reward: { exp: 1500, zeny: 500, items: [[208, 1]] } });
q('cls_arcanist', { type: 'class', th: 'บททดสอบอาร์คานิสต์: ผลึกแห่งรูน', giver: 'solkara:m_arcanist', req: CLS_REQ, cls: 'arcanist', stages: [
  { k: 'talk', npc: 'solkara:m_arcanist', d: 'คุยกับเมจิสเตอร์เซลที่วงเวทอาร์คานา (ย่านตะวันออก)', say: 'เวทของอาร์คานิสต์มาจากอักษรรูน เจ้าต้องสัมผัสผลึกรูนด้วยมือตัวเอง\nผลึกงอกอยู่ริมลำธารแสงจันทร์ เก็บมาสี่ชิ้น' },
  { k: 'gather', node: 'crystal', item: 157, n: 4, d: 'เก็บ ผลึกรูน ที่ลำธารแสงจันทร์' },
  { k: 'kill', mob: 'wisp', n: 3, d: 'บททดสอบเวท: ปราบ วิสป์กรีนวูด' },
  { k: 'collect', item: 109, n: 2, d: 'เก็บ ฝุ่นวิสป์' },
  { k: 'talk', npc: 'solkara:m_arcanist', take: [[157, 4], [109, 2]], d: 'กลับไปรับพิธีเลื่อนขั้นกับเมจิสเตอร์เซล', say: 'ผลึกตอบสนองต่อเจ้า... อักษรรูนยอมรับเจ้าแล้ว ตั้งแต่บัดนี้ เจ้าคือ อาร์คานิสต์!' },
], reward: { exp: 1500, zeny: 500, items: [[209, 1], [354, 1]] } });
q('cls_cleric', { type: 'class', th: 'บททดสอบเคลริก: มือที่เยียวยา', giver: 'solkara:m_cleric', req: CLS_REQ, cls: 'cleric', stages: [
  { k: 'talk', npc: 'solkara:m_cleric', give: [[158, 3]], d: 'คุยกับมารดาออเรเลียที่วิหารรุ่งอรุณ (ย่านตะวันออก)', say: 'ทหารที่บาดเจ็บจากการฝึกนอนอยู่ข้างลานประลอง เอาผ้าพันแผลนี่ไปรักษาพวกเขาสามคน' },
  { k: 'heal', node: 'injured', item: 158, n: 3, d: 'รักษาทหารบาดเจ็บข้างลานประลอง 3 คน' },
  { k: 'kill', mob: 'mossslime', n: 5, d: 'บททดสอบการต่อสู้: ชำระ สไลม์มอส ในป่ากรีนวูด' },
  { k: 'collect', item: 104, n: 4, d: 'เก็บ สมุนไพรทุ่ง สำหรับพิธี' },
  { k: 'talk', npc: 'solkara:m_cleric', take: [[104, 4]], d: 'กลับไปรับพิธีเลื่อนขั้นกับมารดาออเรเลีย', say: 'แสงรุ่งอรุณส่องผ่านมือของเจ้า... ตั้งแต่วันนี้ เจ้าคือ เคลริก!' },
], reward: { exp: 1500, zeny: 500, items: [[210, 1], [305, 1]] } });
q('cls_rogue', { type: 'class', th: 'บททดสอบโร้ก: เงาในค่ายโจร', giver: 'solkara:m_rogue', req: CLS_REQ, cls: 'rogue', stages: [
  { k: 'talk', npc: 'solkara:m_rogue', d: 'คุยกับ "วิสเปอร์" ในตรอกหลังย่านใต้', say: 'โจรในป่ากรีนวูดขโมยหีบเอกสารของกิลด์พ่อค้าไป เอามันคืนมาโดยไม่ให้ใครเห็นเจ้า\nถ้ามีใครกำลังไล่ตามเจ้าอยู่ตอนหยิบ ถือว่าล้มเหลว' },
  { k: 'sneak', node: 'stash', item: 159, d: 'แอบเอาหีบเอกสารคืนจากค่ายโจร (ทิศตะวันตกเฉียงเหนือของป่ากรีนวูด) อย่าให้ใครไล่ตาม' },
  { k: 'kill', mob: 'banditlook', n: 3, d: 'บททดสอบการต่อสู้: จัดการโจรเฝ้าค่าย' },
  { k: 'collect', item: 107, n: 3, d: 'เก็บ เขี้ยวก็อบลิน เป็นหลักฐาน' },
  { k: 'talk', npc: 'solkara:m_rogue', take: [[159, 1], [107, 3]], d: 'กลับไปหาวิสเปอร์เพื่อรับพิธี', say: 'ไม่มีใครเห็นเจ้าเลย... ฮึ เยี่ยม ตั้งแต่คืนนี้ เจ้าคือ โร้ก' },
], reward: { exp: 1500, zeny: 500, items: [[207, 1], [306, 1]] } });
q('cls_artisan', { type: 'class', th: 'บททดสอบอาร์ติซาน: งานชิ้นแรก', giver: 'solkara:m_artisan', req: CLS_REQ, cls: 'artisan', stages: [
  { k: 'talk', npc: 'solkara:m_artisan', d: 'คุยกับนายช่างโอโดที่โรงช่างย่านใต้', say: 'ช่างที่ดีต้องสร้างเป็นและค้าขายเป็น เริ่มจากค้อนชิ้นแรกของเจ้า\nไม้เนื้อแข็งหาได้ในป่ากรีนวูด กระดองด้วงจากด้วงเปลือกไม้ แล้วมาสร้างที่โต๊ะช่างข้างข้า' },
  { k: 'craft', recipe: 'hammer', n: 1, d: 'สร้าง ค้อนฝึกหัดชิ้นแรก ที่โต๊ะช่าง (ไม้เนื้อแข็ง 3 + กระดองด้วงเปลือก 2)' },
  { k: 'kill', mob: 'barkbeetle', n: 4, d: 'บททดสอบภาคสนาม: ปราบ ด้วงเปลือกไม้' },
  { k: 'deliver', npc: 'solkara:sell', item: 110, n: 4, d: 'ค้าขาย: นำ เมล็ดหนาม 4 ไปแลกกับนักสะสมโบราณ' },
  { k: 'talk', npc: 'solkara:m_artisan', take: [[160, 1]], d: 'กลับไปรับพิธีเลื่อนขั้นกับนายช่างโอโด', say: 'ค้อนนี้... หยาบแต่แข็งแรง แบบนี้แหละช่าง! ตั้งแต่วันนี้ เจ้าคือ อาร์ติซาน' },
], reward: { exp: 1500, zeny: 800, items: [[212, 1]] } });

for (const k in Q) Q[k].stages.forEach((s, i) => { s.i = i; });
// the original Iris chain stays in the save as c.q {step,k}; listed here so the client can show it in the log
const LEGACY_IRIS = { th: 'บททดสอบของไอริส', giver: 'solkara:iris' };
module.exports = { QUESTS: Q, LEGACY_IRIS };
