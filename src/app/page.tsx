import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SERVICE_COLORS: Record<string, string> = {
  std:     'bg-rose-100 text-rose-700',
  glp1:    'bg-emerald-100 text-emerald-700',
  ckd:     'bg-blue-100 text-blue-700',
  foreign: 'bg-amber-100 text-amber-700',
}

export const revalidate = 60

export default async function Home() {
  const { data: posts } = await supabase
    .from('posts')
    .select('id,title,slug,excerpt,service,image_url,published_at,meta_desc')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <main className="min-h-screen bg-cream">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <div className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></div>
        <Link href="/contact" className="bg-forest text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:bg-sage transition-all hover:-translate-y-0.5 hover:shadow-lg">
          💬 ปรึกษาฟรี
        </Link>
      </nav>

      {/* HERO */}
      <section className="min-h-screen grid grid-cols-1 md:grid-cols-2 pt-16 md:pt-20">
        <div className="flex flex-col justify-center px-6 md:px-20 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 bg-mint/10 border border-mint/30 text-sage px-4 py-2 rounded-full text-xs md:text-sm font-semibold mb-6 md:mb-8 w-fit">
            <span className="w-2 h-2 bg-mint rounded-full animate-pulse"></span>
            ปรึกษาสุขภาพ ส่วนตัว ปลอดภัย
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-forest leading-tight mb-4 md:mb-6">
            สุขภาพของคุณ<br/>
            <em className="text-mint">สำคัญที่สุด</em>
          </h1>
          <p className="text-base md:text-lg text-muted leading-relaxed mb-8 md:mb-10 max-w-md">
            ปรึกษาผู้เชี่ยวชาญ ฟรี ไม่ตัดสิน<br/>
            ครอบคลุมทุกเรื่องสุขภาพที่คุณอยากรู้
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link href="/contact" className="flex items-center justify-center gap-2 bg-forest text-white px-6 md:px-8 py-3.5 md:py-4 rounded-full text-sm md:text-base font-semibold hover:bg-sage transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-xl">
              📝 ปรึกษาฟรี
            </Link>
            <Link href="/blog" className="flex items-center justify-center gap-2 border-2 border-forest text-forest px-5 md:px-7 py-3.5 md:py-4 rounded-full text-sm md:text-base font-semibold hover:bg-forest hover:text-white transition-all">
              📚 อ่านบทความ
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-6 mt-8 md:mt-12">
            {[['✓','ฟรี ไม่มีค่าใช้จ่าย'],['🔒','ปลอดภัย ไม่ตัดสิน'],['⚡','ตอบไวใน 30 นาที']].map(([icon,text]) => (
              <div key={text} className="flex items-center gap-2 text-xs md:text-sm text-muted font-medium">
                <div className="w-6 h-6 bg-mint/15 rounded-full flex items-center justify-center text-xs flex-shrink-0">{icon}</div>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="relative bg-gradient-to-br from-forest via-sage to-mint flex items-center justify-center overflow-hidden py-16 md:py-0 min-h-64 md:min-h-0">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-10 w-72 md:w-80 z-10">
            <div className="w-12 md:w-14 h-12 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-5">🌿</div>
            <h3 className="font-display text-xl md:text-2xl text-white mb-2 md:mb-3">ปรึกษาได้ทุกเรื่อง</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-5 md:mb-6">STD, GLP-1, โรคไต หรือสุขภาพแรงงาน เราพร้อมช่วยคุณเสมอ</p>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-white text-sm font-semibold">
              💬 LINE: @roogondee
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white" id="services">
        <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 md:mb-4">บริการของเรา</p>
        <h2 className="font-display text-3xl md:text-5xl text-forest mb-3 md:mb-4">ครอบคลุมทุกด้าน</h2>
        <p className="text-muted text-base md:text-lg mb-10 md:mb-16 max-w-lg">ปรึกษาฟรี ส่งต่อผู้เชี่ยวชาญ ดูแลทุกขั้นตอน</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[
            { emoji:'🔴', tag:'Sexual Health', color:'from-pink-50 to-rose-100 border-rose-200', name:'ตรวจ STD\n& PrEP HIV', desc:'ปรึกษาเรื่องสุขภาพทางเพศอย่างปลอดภัย ไม่ตัดสิน', features:['ตรวจ STD ครบ 10 โรค','PrEP/PEP HIV ป้องกัน','ปรึกษาลับ ไม่มีการบันทึก'] },
            { emoji:'💉', tag:'Weight Management', color:'from-green-50 to-emerald-100 border-emerald-200', name:'GLP-1\nลดน้ำหนักถาวร', desc:'ยา GLP-1 ช่วยลดน้ำหนักได้จริง ภายใต้การดูแลแพทย์', features:['ประเมินความเหมาะสมฟรี','ติดตามผลโดยแพทย์','ปรับยาตามร่างกาย'] },
            { emoji:'🫘', tag:'Kidney Health', color:'from-blue-50 to-indigo-100 border-indigo-200', name:'CKD Clinic\nโรคไตเรื้อรัง', desc:'ดูแลผู้ป่วย CKD ทุกระยะ ชะลอการเสื่อมของไต', features:['ประเมิน CKD Stage','แผนอาหารเฉพาะบุคคล','ติดตามค่าไตสม่ำเสมอ'] },
            { emoji:'🧪', tag:'Corporate Health', color:'from-yellow-50 to-amber-100 border-amber-200', name:'ตรวจสุขภาพ\nแรงงานต่างด้าว', desc:'บริการ B2B สำหรับ HR และนายจ้างในสมุทรสาคร', features:['ราคาพิเศษหมู่คณะ','4 สัญชาติ: พม่า กัมพูชา ลาว เวียดนาม','ใบรับรองแพทย์ภายในวันเดียว'] },
          ].map((s) => (
            <Link href="/contact" key={s.tag} className={`bg-gradient-to-br ${s.color} border rounded-2xl md:rounded-3xl p-7 md:p-10 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}>
              <span className="text-4xl md:text-5xl mb-4 md:mb-5 block">{s.emoji}</span>
              <span className="text-xs font-bold tracking-widest uppercase opacity-60 bg-black/5 px-3 py-1 rounded-full">{s.tag}</span>
              <h3 className="font-display text-2xl md:text-3xl text-forest mt-3 mb-2 md:mb-3 whitespace-pre-line">{s.name}</h3>
              <p className="text-muted text-sm leading-relaxed mb-4 md:mb-5">{s.desc}</p>
              <ul className="space-y-2 mb-5 md:mb-6">
                {s.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-rtext font-medium">
                    <span className="w-5 h-5 bg-mint/20 text-sage rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <span className="text-sm font-bold text-forest flex items-center gap-1 group">ปรึกษาฟรี <span className="group-hover:translate-x-1 transition-transform">→</span></span>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-forest relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-mint/10 rounded-full -translate-y-1/2 translate-x-1/2 hidden md:block"></div>
        <p className="text-xs font-bold tracking-widest uppercase text-leaf mb-3 md:mb-4">วิธีการ</p>
        <h2 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4">ง่าย เพียง 3 ขั้นตอน</h2>
        <p className="text-white/60 text-base md:text-lg mb-10 md:mb-16">ไม่ต้องเดินทาง ปรึกษาได้ทันที</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 relative z-10">
          {[
            { num:'01', icon:'📝', title:'กรอกฟอร์ม', desc:'บอกอาการหรือบริการที่สนใจ เราพร้อมรับฟังโดยไม่ตัดสิน' },
            { num:'02', icon:'🩺', title:'รับคำแนะนำ', desc:'ผู้เชี่ยวชาญวิเคราะห์ แนะนำการตรวจหรือรักษาที่เหมาะสม' },
            { num:'03', icon:'🏥', title:'ส่งต่อโรงพยาบาล', desc:'ประสานงานกับโรงพยาบาลคู่ค้า เพื่อการดูแลที่ดีที่สุด' },
          ].map((s) => (
            <div key={s.num} className="bg-white/5 border border-white/10 rounded-2xl p-7 md:p-9 hover:bg-white/8 hover:-translate-y-1 transition-all relative">
              <span className="absolute top-5 right-7 font-display text-6xl md:text-7xl text-white/5 font-bold">{s.num}</span>
              <span className="text-3xl md:text-4xl mb-4 md:mb-5 block">{s.icon}</span>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3">{s.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-warm">
        <div className="flex justify-between items-end mb-8 md:mb-12">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-mint mb-2 md:mb-3">บทความสุขภาพ</p>
            <h2 className="font-display text-3xl md:text-4xl text-forest">ความรู้ที่คุณควรรู้</h2>
          </div>
          <Link href="/blog" className="text-forest font-semibold flex items-center gap-1 hover:gap-2 transition-all text-sm md:text-base whitespace-nowrap ml-4">ดูทั้งหมด →</Link>
        </div>

        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {posts.map(post => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                {post.image_url && (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 md:p-6">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${SERVICE_COLORS[post.service] || 'bg-gray-100 text-gray-600'}`}>
                    {post.service?.toUpperCase()}
                  </span>
                  <h3 className="font-display text-lg md:text-xl text-forest mt-3 mb-2 leading-tight">{post.title}</h3>
                  <p className="text-muted text-sm leading-relaxed line-clamp-2">{post.meta_desc || post.excerpt}</p>
                  <p className="text-xs text-muted/60 mt-3">{post.published_at ? new Date(post.published_at).toLocaleDateString('th-TH') : ''}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16 text-muted">
            <div className="text-5xl mb-4">📰</div>
            <p>บทความกำลังจะมาเร็วๆ นี้ค่ะ</p>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-cream">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'ปรึกษาฟรีหรือเปล่า?', acceptedAnswer: { '@type': 'Answer', text: 'ฟรีทุกขั้นตอนครับ ตั้งแต่กรอกฟอร์ม พูดคุยกับทีม ไปจนถึงรับคำแนะนำเบื้องต้น ไม่มีค่าใช้จ่ายใดๆ' } },
              { '@type': 'Question', name: 'ตรวจ STD ต้องเตรียมตัวอย่างไร?', acceptedAnswer: { '@type': 'Answer', text: 'ไม่ต้องเตรียมอะไรพิเศษครับ แค่มาในชุดสบายๆ ผลตรวจเป็นความลับ 100% ไม่มีการระบุชื่อบนผลตรวจ ทีมไม่ตัดสิน' } },
              { '@type': 'Question', name: 'PrEP คืออะไร กินแล้วป้องกัน HIV ได้จริงไหม?', acceptedAnswer: { '@type': 'Answer', text: 'PrEP คือยาป้องกัน HIV สำหรับผู้ที่มีความเสี่ยง กินสม่ำเสมอสามารถลดความเสี่ยงติด HIV ได้มากกว่า 99% ต้องได้รับการประเมินและสั่งยาโดยแพทย์เท่านั้น' } },
              { '@type': 'Question', name: 'GLP-1 คืออะไร ใครเหมาะกับยานี้?', acceptedAnswer: { '@type': 'Answer', text: 'GLP-1 คือฮอร์โมนที่ช่วยควบคุมน้ำตาลและลดความหิว ยาในกลุ่มนี้เช่น Ozempic, Saxenda เหมาะสำหรับผู้ที่มี BMI เกิน 27 หรือมีโรคร่วม เช่น เบาหวาน ความดัน' } },
              { '@type': 'Question', name: 'โรคไตเรื้อรัง (CKD) สังเกตได้จากอาการอะไร?', acceptedAnswer: { '@type': 'Answer', text: 'อาการที่ควรระวัง เช่น บวมที่เท้าและข้อเท้า ปัสสาวะเป็นฟอง อ่อนเพลียผิดปกติ ความดันสูง หรือค่า Creatinine ในเลือดสูงกว่าปกติ ควรพบแพทย์โรคไตโดยเร็ว' } },
              { '@type': 'Question', name: 'ตรวจสุขภาพแรงงานต่างด้าวต้องใช้เอกสารอะไร?', acceptedAnswer: { '@type': 'Answer', text: 'ใช้บัตรประจำตัวหรือ Passport ของแรงงาน ตรวจได้ทั้งกลุ่มและรายบุคคล สามารถออกใบรับรองแพทย์ได้ทันที รองรับทุกสัญชาติ' } },
              { '@type': 'Question', name: 'อยู่ต่างจังหวัดสามารถใช้บริการได้ไหม?', acceptedAnswer: { '@type': 'Answer', text: 'ปรึกษาเบื้องต้นผ่าน LINE @roogondee ได้ทุกที่ทั่วประเทศ สำหรับการตรวจจริงมาที่ W Medical Hospital สมุทรสาคร' } },
            ]
          })}}
        />
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">FAQ</p>
          <h2 className="font-display text-3xl md:text-4xl text-forest mb-10 md:mb-14">คำถามที่พบบ่อย</h2>
          <div className="space-y-3">
            {[
              { q: 'ปรึกษาฟรีหรือเปล่า?', a: 'ฟรีทุกขั้นตอนครับ ตั้งแต่กรอกฟอร์ม พูดคุยกับทีม ไปจนถึงรับคำแนะนำเบื้องต้น ไม่มีค่าใช้จ่ายใดๆ' },
              { q: 'ตรวจ STD ต้องเตรียมตัวอย่างไร?', a: 'ไม่ต้องเตรียมอะไรพิเศษครับ แค่มาในชุดสบายๆ ผลตรวจเป็นความลับ 100% ไม่มีการระบุชื่อบนผลตรวจ ทีมไม่ตัดสิน' },
              { q: 'PrEP คืออะไร กินแล้วป้องกัน HIV ได้จริงไหม?', a: 'PrEP คือยาป้องกัน HIV สำหรับผู้ที่มีความเสี่ยง กินสม่ำเสมอสามารถลดความเสี่ยงติด HIV ได้มากกว่า 99% ต้องได้รับการประเมินและสั่งยาโดยแพทย์เท่านั้น' },
              { q: 'GLP-1 คืออะไร ใครเหมาะกับยานี้?', a: 'GLP-1 คือฮอร์โมนที่ช่วยควบคุมน้ำตาลและลดความหิว ยาในกลุ่มนี้เช่น Ozempic, Saxenda เหมาะสำหรับผู้ที่มี BMI เกิน 27 หรือมีโรคร่วม เช่น เบาหวาน ความดัน' },
              { q: 'โรคไตเรื้อรัง (CKD) สังเกตได้จากอาการอะไร?', a: 'อาการที่ควรระวัง เช่น บวมที่เท้าและข้อเท้า ปัสสาวะเป็นฟอง อ่อนเพลียผิดปกติ ความดันสูง หรือค่า Creatinine ในเลือดสูงกว่าปกติ ควรพบแพทย์โรคไตโดยเร็ว' },
              { q: 'ตรวจสุขภาพแรงงานต่างด้าวต้องใช้เอกสารอะไร?', a: 'ใช้บัตรประจำตัวหรือ Passport ของแรงงาน ตรวจได้ทั้งกลุ่มและรายบุคคล สามารถออกใบรับรองแพทย์ได้ทันที รองรับทุกสัญชาติ' },
              { q: 'อยู่ต่างจังหวัดสามารถใช้บริการได้ไหม?', a: 'ปรึกษาเบื้องต้นผ่าน LINE @roogondee ได้ทุกที่ทั่วประเทศ สำหรับการตรวจจริงมาที่ W Medical Hospital สมุทรสาคร' },
            ].map((item, i) => (
              <details key={i} className="group bg-white border border-mint/15 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none font-semibold text-forest text-sm md:text-base hover:bg-mint/5 transition-colors">
                  {item.q}
                  <span className="ml-4 flex-shrink-0 w-6 h-6 rounded-full bg-mint/15 flex items-center justify-center text-mint text-xs transition-transform group-open:rotate-45">＋</span>
                </summary>
                <div className="px-6 pb-5 text-muted text-sm md:text-base leading-relaxed border-t border-mint/10 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3 md:mb-4">เริ่มต้นวันนี้</p>
          <h2 className="font-display text-3xl md:text-5xl text-forest leading-tight mb-4 md:mb-5">
            พร้อมดูแลสุขภาพ<br/>ของคุณ<em className="text-mint">แล้ว</em>
          </h2>
          <p className="text-muted text-base md:text-lg leading-relaxed mb-8 md:mb-10">อย่ารอให้อาการหนักขึ้น ปรึกษาผู้เชี่ยวชาญได้เลยวันนี้ ฟรี ไม่มีค่าใช้จ่าย ไม่ตัดสิน</p>
          <Link href="/contact" className="inline-flex items-center gap-2 bg-forest text-white px-8 md:px-10 py-3.5 md:py-4 rounded-full text-sm md:text-base font-semibold hover:bg-sage transition-all hover:-translate-y-0.5 shadow-lg">
            📝 กรอกฟอร์มปรึกษาฟรี
          </Link>
        </div>
        <div className="bg-gradient-to-br from-forest to-sage rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="text-5xl mb-4">💬</div>
          <h3 className="font-display text-2xl md:text-3xl mb-2">ปรึกษาผ่าน LINE</h3>
          <p className="text-white/70 text-sm mb-5 md:mb-6">ทีมผู้เชี่ยวชาญพร้อมตอบทุกวัน ไม่มีวันหยุด</p>
          <div className="bg-white/15 border border-white/20 rounded-xl px-6 py-4 text-2xl font-bold tracking-wide mb-5 md:mb-6">@roogondee</div>
          <a href="https://line.me/ti/p/@roogondee" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#06C755] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#00B04B] transition-all w-full">
            💬 เพิ่มเพื่อน LINE OA
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-dark py-12 md:py-16 px-6 md:px-20 text-white/50">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8 md:mb-12 pb-8 md:pb-12 border-b border-white/10">
          <div>
            <div className="font-display text-2xl md:text-3xl text-white mb-2 md:mb-3">รู้ก่อน<span className="text-mint italic">ดี</span></div>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">ปรึกษาสุขภาพ ส่วนตัว ปลอดภัย ไม่ตัดสิน</p>
          </div>
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-4 md:mb-5">บริการ</h4>
            <ul className="space-y-2 text-sm text-white/45">
              {['ตรวจ STD & PrEP HIV','GLP-1 ลดน้ำหนัก','CKD Clinic โรคไต','ตรวจสุขภาพแรงงานต่างด้าว'].map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-4 md:mb-5">ติดต่อ</h4>
            <ul className="space-y-2 text-sm text-white/45">
              <li>LINE: @roogondee</li>
              <li>📞 081-902-3540</li>
              <li>roogondee.com</li>
              <li>สมุทรสาคร</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between gap-2 text-xs">
          <span>© 2026 บริษัท เจียรักษา จำกัด | รู้ก่อนดี</span>
          <div className="flex gap-4 text-white/40">
            <Link href="/privacy" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</Link>
            <Link href="/terms" className="hover:text-white transition-colors">ข้อตกลงการใช้บริการ</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
