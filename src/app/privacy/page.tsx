import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว (PDPA) — รู้ก่อนดี',
  description: 'นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของรู้ก่อนดี บริษัท เจียรักษา จำกัด สมุทรสาคร',
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
        <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">Legal · PDPA</p>
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-muted text-sm mb-10">อัปเดตล่าสุด: {LAST_UPDATED} | พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>

        <div className="article-body space-y-8">

          <section>
            <h2>1. ผู้ควบคุมข้อมูลส่วนบุคคล (Data Controller)</h2>
            <p>
              บริษัท เจียรักษา จำกัด (&ldquo;บริษัท&rdquo;, &ldquo;เรา&rdquo;) ในฐานะผู้ให้บริการเว็บไซต์ <strong>รู้ก่อนดี (roogondee.com)</strong>
              เป็นผู้ควบคุมข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            </p>
            <p>
              ช่องทางติดต่อ DPO: <strong>privacy@roogondee.com</strong><br />
              LINE OA: <strong>@roogondee</strong><br />
              โทรศัพท์: <strong>081-902-3540</strong><br />
              ที่ตั้ง: จังหวัดสมุทรสาคร
            </p>
          </section>

          <section>
            <h2>2. ฐานทางกฎหมายในการประมวลผลข้อมูล</h2>
            <p>เราประมวลผลข้อมูลส่วนบุคคลของท่านบนฐานทางกฎหมายดังต่อไปนี้:</p>
            <ul>
              <li><strong>ความยินยอม (Consent)</strong> — เมื่อท่านกรอกแบบฟอร์มขอรับคำปรึกษาหรือสนทนากับ AI Chat</li>
              <li><strong>ประโยชน์อันชอบด้วยกฎหมาย (Legitimate Interest)</strong> — การปรับปรุงบริการและเนื้อหาของเว็บไซต์</li>
              <li><strong>การปฏิบัติตามสัญญา (Contract)</strong> — การให้บริการปรึกษาและส่งต่อผู้เชี่ยวชาญ</li>
            </ul>
          </section>

          <section>
            <h2>3. ข้อมูลที่เราเก็บรวบรวม</h2>
            <p>เมื่อท่านใช้บริการเว็บไซต์ เราเก็บข้อมูลดังนี้:</p>
            <ul>
              <li><strong>ชื่อ-นามสกุล</strong> — เพื่อระบุตัวตนในการติดต่อกลับ</li>
              <li><strong>เบอร์โทรศัพท์</strong> — เพื่อติดต่อให้คำปรึกษา</li>
              <li><strong>บริการที่สนใจ</strong> — เพื่อส่งต่อผู้เชี่ยวชาญที่เหมาะสม</li>
              <li><strong>ข้อความสนทนา AI Chat</strong> (ถ้ามี) — เพื่อส่งต่อข้อมูลให้ทีมผู้เชี่ยวชาญ</li>
              <li><strong>ข้อมูลทางเทคนิค</strong> — IP address, ประเภทเบราว์เซอร์, หน้าที่เข้าชม (เพื่อสถิติและความปลอดภัย)</li>
            </ul>
            <p>เราไม่เก็บข้อมูลสุขภาพโดยตรง — ข้อมูลที่ท่านกรอกถือเป็นข้อมูลที่ท่านเปิดเผยเองโดยสมัครใจ</p>
          </section>

          <section>
            <h2>4. วัตถุประสงค์ในการใช้ข้อมูล</h2>
            <p>เราใช้ข้อมูลของท่านเพื่อ:</p>
            <ul>
              <li>ติดต่อกลับเพื่อให้คำปรึกษาเบื้องต้นด้านสุขภาพ</li>
              <li>ส่งต่อข้อมูลให้ผู้เชี่ยวชาญหรือโรงพยาบาลคู่ค้าที่เหมาะสม</li>
              <li>ปรับปรุงคุณภาพบริการและเนื้อหาของเว็บไซต์</li>
              <li>ส่งข้อมูลสุขภาพที่เกี่ยวข้องตามที่ท่านยินยอม</li>
            </ul>
            <p>เราไม่ใช้ข้อมูลของท่านเพื่อวัตถุประสงค์อื่นโดยไม่ได้รับความยินยอม และ<strong>ไม่นำข้อมูลไปขายหรือแลกเปลี่ยน</strong></p>
          </section>

          <section>
            <h2>5. การเปิดเผยข้อมูลแก่บุคคลที่สาม</h2>
            <p>เราอาจเปิดเผยข้อมูลของท่านให้กับ:</p>
            <ul>
              <li><strong>W Medical Hospital สมุทรสาคร</strong> — เฉพาะกรณีที่ท่านประสงค์ให้ส่งต่อเพื่อรับการรักษา</li>
              <li><strong>ผู้ให้บริการระบบ</strong> — Supabase (จัดเก็บข้อมูล, สหรัฐอเมริกา), Vercel (โฮสติ้ง), Anthropic (AI processing) ซึ่งผูกพันตามข้อตกลงรักษาความลับ</li>
            </ul>
            <p>ในกรณีที่ข้อมูลถูกส่งไปยังต่างประเทศ เราดำเนินการให้มีมาตรการคุ้มครองที่เหมาะสมตาม PDPA มาตรา 28</p>
          </section>

          <section>
            <h2>6. ระยะเวลาการเก็บรักษาข้อมูล</h2>
            <p>
              เราเก็บข้อมูลของท่านไว้ไม่เกิน <strong>2 ปี</strong> นับจากวันที่กรอกแบบฟอร์ม
              หรือจนกว่าท่านจะร้องขอให้ลบ แล้วแต่กรณีใดเกิดขึ้นก่อน
              หลังครบกำหนด เราจะลบข้อมูลออกจากระบบโดยอัตโนมัติ
            </p>
          </section>

          <section>
            <h2>7. สิทธิของเจ้าของข้อมูล (Data Subject Rights)</h2>
            <p>ภายใต้ PDPA ท่านมีสิทธิดังนี้:</p>
            <ul>
              <li><strong>สิทธิในการเข้าถึง (Access)</strong> — ขอดูข้อมูลที่เราเก็บไว้เกี่ยวกับท่าน</li>
              <li><strong>สิทธิในการแก้ไข (Rectification)</strong> — ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li><strong>สิทธิในการลบ (Erasure)</strong> — ขอให้ลบข้อมูลของท่าน &ldquo;Right to be Forgotten&rdquo;</li>
              <li><strong>สิทธิในการคัดค้าน (Objection)</strong> — คัดค้านการประมวลผลข้อมูลในบางกรณี</li>
              <li><strong>สิทธิในการโอนย้ายข้อมูล (Portability)</strong> — ขอรับข้อมูลของท่านในรูปแบบที่อ่านได้</li>
              <li><strong>สิทธิในการถอนความยินยอม (Withdraw Consent)</strong> — ถอนได้ตลอดเวลา โดยไม่กระทบสิทธิที่ได้รับก่อนหน้า</li>
            </ul>
            <p>ติดต่อใช้สิทธิได้ที่: <strong>privacy@roogondee.com</strong> เราจะตอบกลับภายใน 30 วัน</p>
          </section>

          <section>
            <h2>8. ความปลอดภัยของข้อมูล</h2>
            <p>
              เราใช้มาตรการรักษาความปลอดภัยที่เหมาะสม ได้แก่:
            </p>
            <ul>
              <li>การเข้ารหัส SSL/TLS สำหรับการส่งข้อมูลทุกรายการ</li>
              <li>การเข้าถึงข้อมูลเฉพาะผู้ที่ได้รับอนุญาต (Role-based Access Control)</li>
              <li>การจัดเก็บบนระบบ Supabase ที่ผ่านมาตรฐาน SOC 2 Type II</li>
              <li>ไม่จัดเก็บรหัสผ่านหรือข้อมูลบัตรเครดิตใดๆ</li>
            </ul>
          </section>

          <section>
            <h2>9. คุกกี้และการติดตาม</h2>
            <p>
              เว็บไซต์นี้ใช้คุกกี้เพื่อวัตถุประสงค์ดังนี้:
            </p>
            <ul>
              <li><strong>คุกกี้จำเป็น</strong> — สำหรับการทำงานของระบบ (ไม่สามารถปิดได้)</li>
              <li><strong>คุกกี้วิเคราะห์</strong> — Google Analytics 4 เพื่อวัดจำนวนผู้เข้าชม (ปิดได้ในเบราว์เซอร์)</li>
            </ul>
            <p>ท่านสามารถปิดการใช้งานคุกกี้ได้ในการตั้งค่าเบราว์เซอร์ แต่อาจกระทบการใช้งานบางส่วน</p>
          </section>

          <section>
            <h2>10. การเปลี่ยนแปลงนโยบาย</h2>
            <p>
              เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยจะแจ้งให้ทราบผ่านเว็บไซต์และแสดงวันที่อัปเดต
              การใช้บริการต่อหลังจากการเปลี่ยนแปลงถือว่าท่านยอมรับนโยบายใหม่
            </p>
          </section>

          <section>
            <h2>11. ติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (DPO)</h2>
            <p>หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวหรือต้องการใช้สิทธิ PDPA:</p>
            <ul>
              <li>อีเมล: <strong>privacy@roogondee.com</strong></li>
              <li>LINE OA: <strong>@roogondee</strong></li>
              <li>โทรศัพท์: <strong>081-902-3540</strong></li>
            </ul>
            <p>ท่านมีสิทธิร้องเรียนต่อ<strong>สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล</strong> หากเชื่อว่าสิทธิของท่านถูกละเมิด</p>
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
