'use strict';
// ============================================================ ELYNDRA ONLINE — mail (foundation)
// System / GM compensation / player mail; market mail later. Items and gold never come from what the client says:
// the server checks the sender really has them, takes them and creates the attachment in ONE transaction (and the
// same for claiming: mark claimed + put into the bag + save the character together). If the transaction fails the
// in-memory character is restored, so nothing is duplicated or lost.
module.exports = function mail(api) {
  const { store, ITEMS, addItem, countItem, takeItem, L } = api;
  const MAIL_DAYS = 30;
  const snap = c => ({ inv: c.inv.map(s => ({ ...s })), zeny: c.zeny });
  const restore = (c, s) => { c.inv = s.inv; c.zeny = s.zeny; };
  // system / GM mail (no sender character): attachments are created out of nothing on purpose — GM-only path
  function send(m) { return store.mailInsert({ kind: m.kind || 'system', from: null, fromName: m.fromName || 'ระบบ', to: m.to, subject: String(m.subject || '').slice(0, 60), body: String(m.body || '').slice(0, 500), expires: Date.now() + MAIL_DAYS * 864e5 }, (m.atts || []).filter(a => a && (a.item || a.gold))); }
  // player -> player: the sender must own the item / gold now; removal + attachment in one transaction
  function sendFromPlayer(p, toId, subject, body, itemId, qty, gold) {
    const c = p.c; itemId = itemId | 0; qty = qty | 0; gold = Math.max(0, gold | 0);
    if (!toId || toId === c._id) return 'ผู้รับไม่ถูกต้อง';
    if (store.isBlocked(c._id, toId)) return 'ไม่สามารถส่งจดหมายถึงผู้เล่นนี้ได้';
    if (itemId && (!ITEMS[itemId] || ITEMS[itemId].ty === 'quest' || qty < 1 || countItem(c, itemId) < qty)) return 'ไม่มีไอเทมนี้ในกระเป๋า';
    if (gold > c.zeny) return 'Zeny ไม่พอ';
    const before = snap(c);
    try {
      return store.tx(() => {
        if (itemId) takeItem(c, itemId, qty);
        c.zeny -= gold;
        store.saveChars([c]);
        return store.mailInsert({ kind: 'player', from: c._id, fromName: c.name, to: toId, subject: String(subject || '').slice(0, 60) || 'จดหมาย', body: String(body || '').slice(0, 500), expires: Date.now() + MAIL_DAYS * 864e5 },
          itemId || gold ? [{ item: itemId || null, qty: itemId ? qty : 0, gold }] : []);
      });
    } catch (e) { restore(c, before); L.error('mail_error', { from: c.name, err: e.message }); return 'ส่งจดหมายไม่สำเร็จ'; }
  }
  function list(c) { return store.mailList(c._id).map(m => ({ id: m.id, kind: m.kind, from: m.sender_name, subject: m.subject, body: m.body, at: m.created_at, read: !!m.read_at, claimed: !!m.claimed_at, atts: m.atts.map(a => ({ item: a.item_id, qty: a.qty, gold: a.gold })) })); }
  // claim attachments: owner only, once, with bag space; one transaction
  function claim(p, id) {
    const c = p.c, m = store.mailGet(id | 0);
    if (!m || m.receiver_char_id !== c._id || m.deleted_at) return 'ไม่พบจดหมาย';
    if (m.claimed_at) return 'รับของในจดหมายนี้ไปแล้ว';
    if (m.expires_at && m.expires_at < Date.now()) return 'จดหมายหมดอายุแล้ว';
    const before = snap(c);
    for (const a of m.atts) if (a.item_id && !addItem(c, a.item_id, a.qty)) { restore(c, before); return 'กระเป๋าเต็ม — เคลียร์ช่องก่อนรับของ'; }
    for (const a of m.atts) c.zeny += a.gold | 0;
    try { store.tx(() => { if (!store.mailMarkClaimed(m.id, c._id)) throw new Error('already claimed'); store.saveChars([c]); }); }
    catch (e) { restore(c, before); return /already/.test(e.message) ? 'รับของในจดหมายนี้ไปแล้ว' : 'รับของไม่สำเร็จ'; }
    L.log('mail_claim', { char: c.name, mail: m.id, atts: m.atts });
    return null;
  }
  return { send, sendFromPlayer, list, claim, read: (c, id) => store.mailRead(id | 0, c._id) };
};
