'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'

export default function PrivacyClient() {
  const { locale, t } = useTranslation()
  const isTh = locale === 'th'

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />
      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">
          {isTh ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
        </h1>
        <p className="text-muted text-sm mb-10">
          {isTh ? 'อัปเดตล่าสุด: เมษายน 2568 | บริษัท เจียรักษา จำกัด' : 'Last updated: April 2025 | Jia Raksa Co., Ltd.'}
        </p>

        <div className="space-y-8 text-forest/80 text-sm leading-relaxed">
          {isTh ? (
            <>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">1. บทนำ</h2>
                <p>บริษัท เจียรักษา จำกัด (&ldquo;บริษัท&rdquo;) ดำเนินงานเว็บไซต์ roogondee.com และให้บริการปรึกษาสุขภาพออนไลน์ บริษัทตระหนักถึงความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้บริการตาม พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">2. ข้อมูลที่เราเก็บรวบรวม</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>ข้อมูลที่คุณให้โดยตรง:</strong> ชื่อ เบอร์โทรศัพท์ LINE ID อีเมล และข้อมูลสุขภาพที่คุณกรอกในแบบฟอร์มปรึกษา</li>
                  <li><strong>ข้อมูลการใช้งาน:</strong> หน้าที่เยี่ยมชม ระยะเวลาบนเว็บไซต์ ผ่าน Google Analytics 4</li>
                  <li><strong>ข้อมูลอุปกรณ์:</strong> ชนิดอุปกรณ์ ระบบปฏิบัติการ และเบราว์เซอร์</li>
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
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>คุกกี้จำเป็น:</strong> สำหรับการทำงานของเว็บไซต์</li>
                  <li><strong>คุกกี้วิเคราะห์:</strong> Google Analytics เพื่อวิเคราะห์พฤติกรรมผู้ใช้ (ปิดได้)</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">8. ติดต่อเรา</h2>
                <div className="bg-white border border-mint/20 rounded-xl p-4">
                  <p><strong>บริษัท เจียรักษา จำกัด</strong></p>
                  <p>สมุทรสาคร, ประเทศไทย</p>
                  <p>อีเมล: <a href="mailto:privacy@roogondee.com" className="text-forest underline">privacy@roogondee.com</a></p>
                  <p>LINE OA: <a href="https://line.me/ti/p/@roogondee" className="text-forest underline">@roogondee</a></p>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">1. Introduction</h2>
                <p>Jia Raksa Co., Ltd. (&ldquo;Company&rdquo;) operates roogondee.com and provides online health consultation services. The Company recognizes the importance of protecting personal data of service users in accordance with Thailand&apos;s Personal Data Protection Act B.E. 2562 (PDPA).</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">2. Data We Collect</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Information you provide directly:</strong> Name, phone number, LINE ID, email, and health information entered in consultation forms</li>
                  <li><strong>Usage data:</strong> Pages visited, time spent on website via Google Analytics 4</li>
                  <li><strong>Device data:</strong> Device type, operating system, and browser</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">3. Purpose of Data Use</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Contact you to provide the health consultation you requested</li>
                  <li>Improve and develop service quality</li>
                  <li>Analyze website usage to improve user experience</li>
                  <li>Comply with applicable laws and regulations</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">4. Data Disclosure</h2>
                <p className="mb-2">The Company will not sell or rent your personal data to third parties. We may share data with:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Google Analytics:</strong> For usage analysis (anonymized data)</li>
                  <li><strong>Supabase:</strong> Database provider located in the EU (GDPR compliant)</li>
                  <li><strong>Government agencies:</strong> Only when required by lawful order</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">5. Data Retention</h2>
                <p>We retain your data only as long as necessary for the stated purposes or as required by law, generally no longer than 3 years from the last contact.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">6. Your Rights</h2>
                <p className="mb-2">Under PDPA, you have the right to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Access and request copies of your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion or destruction of data</li>
                  <li>Object to data processing</li>
                  <li>Withdraw consent previously given</li>
                </ul>
                <p className="mt-2">Contact: <a href="mailto:privacy@roogondee.com" className="text-forest underline">privacy@roogondee.com</a></p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">7. Cookies</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Essential cookies:</strong> Required for website functionality</li>
                  <li><strong>Analytics cookies:</strong> Google Analytics for user behavior analysis (can be disabled)</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">8. Contact Us</h2>
                <div className="bg-white border border-mint/20 rounded-xl p-4">
                  <p><strong>Jia Raksa Co., Ltd.</strong></p>
                  <p>Samut Sakhon, Thailand</p>
                  <p>Email: <a href="mailto:privacy@roogondee.com" className="text-forest underline">privacy@roogondee.com</a></p>
                  <p>LINE OA: <a href="https://line.me/ti/p/@roogondee" className="text-forest underline">@roogondee</a></p>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="mt-10 text-center">
          <Link href="/" className="text-sm text-muted hover:text-forest transition-colors">{t.common.backToHome}</Link>
        </div>
      </div>
    </main>
  )
}
