import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว — รู้ก่อนดี',
  description: 'นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของรู้ก่อนดี บริษัท เจียรักษา จำกัด',
}

const LAST_UPDATED = '5 เมษายน 2569'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <Link href="/contact" className="bg-forest text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:bg-sage transition-all">💬 ปรึกษาฟรี</Link>
      </nav>

      <div className="pt-24 md:pt-32 pb-16 md:pb-24 max-w-3xl mx-auto px-6">
        <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">Legal</p>
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-muted text-sm mb-10">อัปเดตล่าสุด: {LAST_UPDATED}</p>

        <div className="article-body space-y-8">

          <section>
            <h2>1. ผู้ควบคุมข้อมูลส่วนบุคคล</h2>
            <p>
              บริษัท เจียรักษา จำกัด ("บริษัท", "เรา") ในฐานะผู้ให้บริการเว็บไซต์ <strong>รู้ก่อนดี (roogondee.com)</strong>
              เป็นผู้ควบคุมข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            </p>
            <p>
              ช่องทางติดต่อ: <strong>privacy@roogondee.com</strong><br />
              LINE OA: <strong>@034qjajh</strong><br />
              ที่ตั้ง: จังหวัดสมุทรสาคร
            </p>
          </section>

          <section>
            <h2>2. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p>เมื่อท่านกรอกแบบฟอร์มขอรับคำปรึกษาบนเว็บไซต์ เราเก็บข้อมูลดังนี้:</p>
            <ul>
              <li><strong>ชื่อ-นามสกุล</strong> — เพื่อระบุตัวตนในการติดต่อกลับ</li>
              <li><strong>เบอร์โทรศัพท์</strong> — เพื่อติดต่อให้คำปรึกษา</li>
              <li><strong>บริการที่สนใจ</strong> — เพื่อส่งต่อผู้เชี่ยวชาญที่เหมาะสม</li>
              <li><strong>ข้อความเพิ่มเติม</strong> (ถ้ามี) — รายละเอียดอาการหรือคำถาม</li>
            </ul>
            <p>
              นอกจากนี้เว็บไซต์อาจเก็บข้อมูลทางเทคนิคอัตโนมัติ เช่น IP address, ประเภทเบราว์เซอร์
              และหน้าที่เข้าชม เพื่อวัตถุประสงค์ทางสถิติและความปลอดภัย
            </p>
          </section>

          <section>
            <h2>3. วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <p>เราใช้ข้อมูลของท่านเพื่อ:</p>
            <ul>
              <li>ติดต่อกลับเพื่อให้คำปรึกษาเบื้องต้นด้านสุขภาพ</li>
              <li>ส่งต่อข้อมูลให้ผู้เชี่ยวชาญหรือโรงพยาบาลคู่ค้าที่เหมาะสม</li>
              <li>ปรับปรุงคุณภาพบริการและเนื้อหาของเว็บไซต์</li>
            </ul>
            <p>เราไม่ใช้ข้อมูลของท่านเพื่อวัตถุประสงค์อื่นโดยไม่ได้รับความยินยอม</p>
          </section>

          <section>
            <h2>4. การเปิดเผยข้อมูล</h2>
            <p>เราอาจเปิดเผยข้อมูลของท่านให้กับ:</p>
            <ul>
              <li><strong>โรงพยาบาลหรือคลินิกคู่ค้า</strong> — เฉพาะกรณีที่ท่านประสงค์ให้ส่งต่อเพื่อรับการรักษา</li>
              <li><strong>ผู้ให้บริการระบบ</strong> — เช่น Supabase (จัดเก็บข้อมูล) และ Vercel (โฮสติ้ง) ซึ่งผูกพันตามข้อตกลงรักษาความลับ</li>
            </ul>
            <p>เราไม่ขาย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนบุคคลของท่านให้บุคคลภายนอกเพื่อวัตถุประสงค์ทางการตลาดโดยไม่ได้รับความยินยอม</p>
          </section>

          <section>
            <h2>5. ระยะเวลาการเก็บรักษาข้อมูล</h2>
            <p>
              เราเก็บข้อมูลของท่านไว้ไม่เกิน <strong>2 ปี</strong> นับจากวันที่กรอกแบบฟอร์ม
              หรือจนกว่าท่านจะร้องขอให้ลบ แล้วแต่ว่ากรณีใดจะเกิดขึ้นก่อน
            </p>
          </section>

          <section>
            <h2>6. สิทธิของเจ้าของข้อมูล</h2>
            <p>ภายใต้ PDPA ท่านมีสิทธิดังนี้:</p>
            <ul>
              <li><strong>สิทธิในการเข้าถึง</strong> — ขอดูข้อมูลที่เราเก็บไว้เกี่ยวกับท่าน</li>
              <li><strong>สิทธิในการแก้ไข</strong> — ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li><strong>สิทธิในการลบ</strong> — ขอให้ลบข้อมูลของท่าน</li>
              <li><strong>สิทธิในการคัดค้าน</strong> — คัดค้านการประมวลผลข้อมูลในบางกรณี</li>
              <li><strong>สิทธิในการถอนความยินยอม</strong> — ถอนความยินยอมได้ตลอดเวลา โดยไม่กระทบสิทธิที่ได้รับก่อนหน้า</li>
            </ul>
            <p>ติดต่อใช้สิทธิได้ที่: <strong>privacy@roogondee.com</strong></p>
          </section>

          <section>
            <h2>7. ความปลอดภัยของข้อมูล</h2>
            <p>
              เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม ได้แก่ การเข้ารหัส SSL/TLS
              สำหรับการส่งข้อมูล การเข้าถึงข้อมูลเฉพาะผู้ที่ได้รับอนุญาต
              และการจัดเก็บบนระบบที่ผ่านมาตรฐานความปลอดภัย
            </p>
          </section>

          <section>
            <h2>8. คุกกี้</h2>
            <p>
              เว็บไซต์นี้อาจใช้คุกกี้เพื่อวัตถุประสงค์ทางเทคนิคพื้นฐาน (เช่น การวิเคราะห์การเข้าชม)
              ท่านสามารถปิดการใช้งานคุกกี้ได้ในการตั้งค่าเบราว์เซอร์ แต่อาจกระทบการใช้งานบางส่วน
            </p>
          </section>

          <section>
            <h2>9. การเปลี่ยนแปลงนโยบาย</h2>
            <p>
              เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแจ้งให้ทราบผ่านเว็บไซต์
              การใช้บริการต่อหลังจากการเปลี่ยนแปลงถือว่าท่านยอมรับนโยบายใหม่
            </p>
          </section>

          <section>
            <h2>10. ติดต่อเรา</h2>
            <p>หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว ติดต่อได้ที่:</p>
            <ul>
              <li>อีเมล: <strong>privacy@roogondee.com</strong></li>
              <li>LINE OA: <strong>@034qjajh</strong></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-mint/20 flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/terms" className="hover:text-forest transition-colors">ข้อตกลงการใช้บริการ</Link>
          <Link href="/" className="hover:text-forest transition-colors">กลับหน้าแรก</Link>
        </div>
      </div>
    </main>
  )
}
