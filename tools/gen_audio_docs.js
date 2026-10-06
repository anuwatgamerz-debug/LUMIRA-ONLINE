'use strict';
// node tools/gen_audio_docs.js  -> docs/AUDIO_ASSET_LIST.md (generated from public/audio-registry.js)
const fs = require('fs'), path = require('path');
const R = require('../public/audio-registry.js');
const PRIO = ['Low', 'Medium', 'High', 'Highest'];
const rows = [];
const row = (d, type, loop) => rows.push(`| \`${d.id}\` | ${type} | ${d.use || ''} | ${d.len || ''} | ${loop ? 'loop' : 'one-shot'} | ${d.mood || ''} | ${PRIO[d.prio] || '-'} | ${d.file ? 'final' : d.status} | \`${R.base}${d.dir}/${d.id}.mp3\` |`);
const head = '| audioId | ประเภท | ใช้ที่ไหน | ความยาวแนะนำ | loop | mood | priority | สถานะ | ไฟล์ที่แนะนำ |\n|---|---|---|---|---|---|---|---|---|';
let out = `# LUMIRA ONLINE — Audio Asset List\n\nสร้างอัตโนมัติจาก \`public/audio-registry.js\` (\`node tools/gen_audio_docs.js\`) — อย่าแก้ไฟล์นี้ด้วยมือ\n\n`;
out += `สถานะ: **placeholder** = เสียงสังเคราะห์ด้วย Web Audio (สร้างจากโค้ดในโปรเจกต์ ไม่มีลิขสิทธิ์ของผู้อื่น) · **final** = มีไฟล์จริงแล้ว · **missing** = ยังไม่มีทั้งไฟล์และ placeholder (ตอนนี้ไม่มีรายการไหนอยู่ในสถานะนี้)\n\n`;
out += `## วิธีใส่ไฟล์เสียงจริง\n\n1. วางไฟล์ใน \`public/assets/audio/<โฟลเดอร์ตามตาราง>/\` (BGM/ambient: MP3 หรือ AAC/M4A เป็นหลัก + OGG เป็นทางเลือก; SFX: MP3/OGG สั้นๆ ไม่ใช้ WAV ขนาดใหญ่)\n2. ใน \`public/audio-registry.js\` เพิ่ม \`file: '<path ใต้ assets/audio>'\` (และ \`alt: '...ogg'\` ถ้ามี) ให้รายการนั้น แล้วเปลี่ยน \`status: 'final'\`\n3. ไม่ต้องแก้ gameplay — ถ้าไฟล์หายหรือเล่นไม่ได้ ระบบจะกลับไปใช้ placeholder เอง\n4. บันทึกแหล่งที่มา/ไลเซนส์ใน \`docs/AUDIO_LICENSES.md\` แล้วรัน \`node tools/gen_audio_docs.js\`\n\n`;
const groups = [['Music (BGM)', Object.values(R.MUSIC), d => 'music/' + d.type, true], ['Ambient', Object.values(R.AMBIENT), () => 'ambient', true]];
const byDir = {}; for (const d of Object.values(R.SFX)) (byDir[d.dir] = byDir[d.dir] || []).push(d);
for (const [dir, list] of Object.entries(byDir)) groups.push(['SFX — ' + dir.replace('sfx/', ''), list, () => 'sfx', false]);
for (const [title, list, type, loop] of groups) { rows.length = 0; for (const d of list) row(d, type(d), loop || d.loop); out += `## ${title} (${list.length})\n\n${head}\n${rows.join('\n')}\n\n`; }
const all = Object.values(R.all());
out += `## สรุป\n\n- ทั้งหมด ${all.length} รายการ: Music ${Object.keys(R.MUSIC).length} · Ambient ${Object.keys(R.AMBIENT).length} · SFX ${Object.keys(R.SFX).length}\n- final: ${all.filter(d => d.file).length} · placeholder: ${all.filter(d => !d.file).length}\n- ไฟล์จริงที่ควรหาก่อน (ผลต่อความรู้สึกมากที่สุด): เพลง 6 แผนที่ของ Region 1, เพลงบอส 2 เพลง, ambient ป่า/ลำธาร/เหมือง/เมือง, เสียงอาวุธพื้นฐาน, level_up / class_change / quest_complete\n`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'AUDIO_ASSET_LIST.md'), out);
console.log('docs/AUDIO_ASSET_LIST.md:', all.length, 'entries');
