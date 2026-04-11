import type { Metadata } from 'next'
import Link from 'next/link'
import NavBar from '@/components/ui/NavBar'

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว (PDPA) — รู้ก่อนดี',
  description: 'นโยบายความเป็นส่วนตัวของรู้ก่อนดี การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลตาม พ.ร.บ. PDPA',
  alternates: { canonical: 'https://roogondee.com/privacy' },
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream">
      <NavBar />

      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">นโยบายความเป็นส่วนตัว</h1>
        <p className="text-muted text-sm mb-10">อัปเดตล่าสุด: เมษายน 2568 | บริษัท เจียรักษา จำกัด</p>

        <div className="space-y-8 text-forest/80 text-sm leading-relaxed">

          <section>
            <h2 className="font-display text-xl text-forest mb-3">1. บทนำ</h2>
            <p>บริษัท เจียรักษา จำกัด (&ldquo;บริษัท&rdquo;) ดำเนินงานเว็บไซต์ roogondee.com และให้บริการปรึกษาสุขภาพออนไลน์ บริษัทตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้บริการตาม พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">2. ข้อมูลที่เราเก็บรวบรวม</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>ข้อมูลที่คุณให้โดยตรง:</strong> ชื่อ เบอร์โทรศัพท์ LINE ID อีเมล และข้อมูลสุขภาพที่คุณกรอกในแบบฟอร์มปรึกษา</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> หน้าที่เยี่ยมชม ระยะเวลาบนเว็บไซต์ ผ่าน Google Analytics 4</li>
              <li><strong>ข้อมูลอุปกรณ์:</strong> ชนิดอุปกรณ์ ระบบปฏิบัติการ และเบราว์เซอร์ (เก็บโดย Google Analytics)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">3. วัตถุประสงค์การใช้ข้อมูล</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>ติดต่อกลับเพื่อให้คำปรึกษาสุขภาพที่คุณร้องขอ</li>
              <li>ปรับปรุงและพัฒนาคุณภาพบริการ</li>
              <li>วิเคราะห์การใช้งานเว็บไซต์เพื่อปรับปรุงประสบการณ์ผู้ใช้</li>
              <li>ปฏิบัติตามกฎหมายและระเบียบข้อบังคับที่เกี่ยวข้อง</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">4. การเปิดเผยข้อมูล</h2>
            <p className="mb-2">บริษัทจะไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลของคุณแก่บุคคลภายนอก เราอาจแชร์ข้อมูลกับ:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Google Analytics:</strong> เพื่อวิเคราะห์การใช้งาน (ข้อมูลไม่ระบุตัวตน)</li>
              <li><strong>Supabase:</strong> ผู้ให้บริการฐานข้อมูลที่ตั้งอยู่ใน EU (มาตรฐาน GDPR)</li>
              <li><strong>หน่วยงานราชการ:</strong> เฉพาะเมื่อมีคำสั่งโดยชอบด้วยกฎหมาย</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">5. การเก็บรักษาข้อมูล</h2>
            <p>เราจะเก็บข้อมูลของคุณไว้ตราบเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่ระบุ หรือตามที่กฎหมายกำหนด โดยทั่วไปไม่เกิน 3 ปีนับจากการติดต่อครั้งสุดท้าย</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">6. สิทธิของคุณ</h2>
            <p className="mb-2">ภายใต้ PDPA คุณมีสิทธิ:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>เข้าถึงและขอสำเนาข้อมูลส่วนบุคคลของคุณ</li>
              <li>ขอแก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li>ขอลบหรือทำลายข้อมูล</li>
              <li>คัดค้านการประมวลผลข้อมูล</li>
              <li>ถอนความยินยอมที่ให้ไว้</li>
            </ul>
            <p className="mt-2">ติดต่อใช้สิทธิได้ที่: <a href="mailto:privacy@roogondee.com" className="text-forest underline">privacy@roogondee.com</a></p>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">7. คุกกี้</h2>
            <p className="mb-2">เราใช้คุกกี้เพื่อ:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>คุกกี้จำเป็น:</strong> สำหรับการทำงานของเว็บไซต์ (ไม่สามารถปิดได้)</li>
              <li><strong>คุกกี้วิเคราะห์:</strong> Google Analytics เพื่อวิเคราะห์พฤติกรรมผู้ใช้ (ปิดได้)</li>
            </ul>
            <p className="mt-2">คุณสามารถจัดการการตั้งค่าคุกกี้ได้ผ่านการตั้งค่าเบราว์เซอร์</p>
          </section>

          <section>
            <h2 className="font-display text-xl text-forest mb-3">8. ติดต่อเรา</h2>
            <p className="mb-3">หากมีข้อสงสัยเกี่ยวกับนโยบายนี้ กรุณาติดต่อ:</p>
            <div className="bg-white border border-mint/20 rounded-xl p-4">
              <p><strong>บริษัท เจียรักษา จำกัด</strong></p>
              <p>ที่อยู่: สมุทรสาคร, ประเทศไทย</p>
              <p>อีเมล: <a href="mailto:privacy@roogondee.com" className="text-forest underline">privacy@roogondee.com</a></p>
              <p>LINE OA: <a href="https://line.me/ti/p/@roogondee" className="text-forest underline">@roogondee</a></p>
            </div>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-muted hover:text-forest transition-colors">← กลับหน้าแรก</Link>
        </div>
      </div>
    </main>
  )
}
