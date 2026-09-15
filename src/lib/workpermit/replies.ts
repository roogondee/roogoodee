import { type LocaleCode, defaultLocale } from '@/lib/i18n/config'

// Server-side replies for /api/workpermit-chat that never pass through the
// model: rate limits, session limits, errors, and the one line prepended to the
// deterministic emergency block.
//
// The chat's chrome and the bot's own answers were already multilingual — the
// prompt tells it to answer in the visitor's language — but every one of these
// paths returned Thai regardless. A Burmese worker who hit an error, or worse
// typed something the safety classifier caught, got a wall of Thai at the exact
// moment it mattered most.
//
// Only languages with a real audience on this page are translated; anything
// else falls back to Thai, the same way the page copy does.

type ReplyKey = 'rateLimit' | 'sessionLimit' | 'processingError' | 'serverError' | 'emergencyLead'

const REPLIES: Record<string, Partial<Record<ReplyKey, string>>> = {
  th: {
    rateLimit: 'มีคำขอมากเกินไป กรุณาลองใหม่อีกสักครู่ หรือโทร 081-902-3540',
    sessionLimit: 'บทสนทนายาวเกินกำหนด กรุณาเริ่มใหม่ หรือโทร 081-902-3540 / แชท LINE @roogondee',
    processingError: 'ขออภัยค่ะ ระบบประมวลผลไม่สำเร็จ กรุณาลองพิมพ์ใหม่ หรือโทร 081-902-3540 / LINE @roogondee',
    serverError: 'เกิดข้อผิดพลาด กรุณาลองใหม่ หรือโทร 081-902-3540 / LINE @roogondee',
    emergencyLead: '',
  },
  en: {
    rateLimit: 'Too many requests. Please try again shortly, or call 081-902-3540.',
    sessionLimit: 'This conversation has run too long. Please start a new one, or call 081-902-3540 / message LINE @roogondee.',
    processingError: 'Sorry — we could not process that. Please try again, or call 081-902-3540 / LINE @roogondee.',
    serverError: 'Something went wrong. Please try again, or call 081-902-3540 / LINE @roogondee.',
    emergencyLead: '🚑 EMERGENCY — call 1669 now. It is free, 24 hours, and they speak Thai. If you cannot call, go to the nearest hospital emergency room immediately. Do not drive yourself.',
  },
  my: {
    rateLimit: 'တောင်းဆိုမှု များနေပါသည်။ ခဏနေ ပြန်ကြိုးစားပါ သို့မဟုတ် 081-902-3540 သို့ ဖုန်းဆက်ပါ။',
    sessionLimit: 'စကားဝိုင်း ရှည်လွန်းပါပြီ။ အသစ် ပြန်စပါ သို့မဟုတ် 081-902-3540 သို့ ဖုန်းဆက်ပါ / LINE @roogondee သို့ စာပို့ပါ။',
    processingError: 'စိတ်မကောင်းပါ — စနစ်က မဆောင်ရွက်နိုင်ပါ။ ထပ်ကြိုးစားပါ သို့မဟုတ် 081-902-3540 / LINE @roogondee သို့ ဆက်သွယ်ပါ။',
    serverError: 'အမှားတစ်ခု ဖြစ်သွားပါသည်။ ထပ်ကြိုးစားပါ သို့မဟုတ် 081-902-3540 / LINE @roogondee သို့ ဆက်သွယ်ပါ။',
    emergencyLead: '🚑 အရေးပေါ် — ယခုချက်ချင်း 1669 သို့ ဖုန်းဆက်ပါ။ အခမဲ့ဖြစ်ပြီး ၂၄ နာရီ ဖွင့်ထားသည်။ ဖုန်းမဆက်နိုင်ပါက အနီးဆုံး ဆေးရုံ အရေးပေါ်ဌာနသို့ ချက်ချင်း သွားပါ။ ကိုယ်တိုင် ကားမမောင်းပါနှင့်။',
  },
  lo: {
    rateLimit: 'ມີຄຳຂໍຫຼາຍເກີນໄປ ກະລຸນາລອງໃໝ່ໃນອີກບໍ່ດົນ ຫຼືໂທ 081-902-3540',
    sessionLimit: 'ການສົນທະນາຍາວເກີນກຳນົດ ກະລຸນາເລີ່ມໃໝ່ ຫຼືໂທ 081-902-3540 / LINE @roogondee',
    processingError: 'ຂໍອະໄພ ລະບົບປະມວນຜົນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່ ຫຼືໂທ 081-902-3540 / LINE @roogondee',
    serverError: 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່ ຫຼືໂທ 081-902-3540 / LINE @roogondee',
    emergencyLead: '🚑 ສຸກເສີນ — ໂທ 1669 ດຽວນີ້ ຟຣີ ຕະຫຼອດ 24 ຊົ່ວໂມງ ຖ້າໂທບໍ່ໄດ້ ໃຫ້ໄປຫ້ອງສຸກເສີນຂອງໂຮງໝໍທີ່ໃກ້ທີ່ສຸດທັນທີ ຢ່າຂັບລົດໄປເອງ',
  },
  vi: {
    rateLimit: 'Quá nhiều yêu cầu. Vui lòng thử lại sau giây lát, hoặc gọi 081-902-3540.',
    sessionLimit: 'Cuộc trò chuyện đã quá dài. Vui lòng bắt đầu lại, hoặc gọi 081-902-3540 / nhắn LINE @roogondee.',
    processingError: 'Xin lỗi — hệ thống không xử lý được. Vui lòng thử lại, hoặc gọi 081-902-3540 / LINE @roogondee.',
    serverError: 'Đã xảy ra lỗi. Vui lòng thử lại, hoặc gọi 081-902-3540 / LINE @roogondee.',
    emergencyLead: '🚑 KHẨN CẤP — gọi 1669 ngay. Miễn phí, 24 giờ. Nếu không gọi được, hãy đến phòng cấp cứu của bệnh viện gần nhất ngay lập tức. Đừng tự lái xe.',
  },
}

export function workPermitReply(key: ReplyKey, locale: LocaleCode | null | undefined): string {
  const lang = locale && REPLIES[locale] ? locale : defaultLocale
  return REPLIES[lang]?.[key] ?? REPLIES[defaultLocale][key] ?? ''
}

// The deterministic emergency/crisis text from src/lib/advice/triage.ts is Thai
// and stays that way: it is vetted wording that must be identical every time,
// and re-authoring medical instructions per locale is not something to do
// casually. What a non-Thai reader needs is the actionable part — the number —
// so that goes in front, in their language, with the Thai block kept intact
// underneath for them to show to whoever they reach.
export function localizeSafetyReply(reply: string, locale: LocaleCode | null | undefined): string {
  const lead = workPermitReply('emergencyLead', locale)
  return lead ? `${lead}\n\n———\n\n${reply}` : reply
}
