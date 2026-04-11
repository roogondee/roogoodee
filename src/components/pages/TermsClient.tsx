'use client'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n/context'
import NavBar from '@/components/ui/NavBar'

export default function TermsClient() {
  const { locale, t } = useTranslation()
  const isTh = locale === 'th'

  return (
    <main className="min-h-screen bg-cream">
      <NavBar />
      <div className="pt-28 pb-20 max-w-3xl mx-auto px-6">
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">
          {isTh ? 'ข้อกำหนดการใช้บริการ' : 'Terms of Service'}
        </h1>
        <p className="text-muted text-sm mb-10">
          {isTh ? 'อัปเดตล่าสุด: เมษายน 2568 | บริษัท เจียรักษา จำกัด' : 'Last updated: April 2025 | Jia Raksa Co., Ltd.'}
        </p>

        <div className="space-y-8 text-forest/80 text-sm leading-relaxed">
          {isTh ? (
            <>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">1. การยอมรับข้อกำหนด</h2>
                <p>การเข้าใช้งานเว็บไซต์ roogondee.com (&ldquo;เว็บไซต์&rdquo;) ซึ่งดำเนินงานโดย บริษัท เจียรักษา จำกัด (&ldquo;บริษัท&rdquo;) ถือว่าคุณยอมรับข้อกำหนดและเงื่อนไขการใช้บริการเหล่านี้ทั้งหมด หากคุณไม่ยอมรับข้อกำหนดใดๆ กรุณาหยุดใช้งานเว็บไซต์</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">2. ลักษณะการให้บริการ</h2>
                <p>เว็บไซต์นี้เป็นแพลตฟอร์มให้คำปรึกษาสุขภาพออนไลน์ โดยเชื่อมต่อผู้ใช้กับเภสัชกรและบุคลากรทางการแพทย์ที่ได้รับอนุญาต เว็บไซต์นี้ไม่ใช่โรงพยาบาล คลินิก หรือสถานพยาบาล และไม่ได้ให้บริการรักษาพยาบาลโดยตรง</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">3. ข้อจำกัดความรับผิดชอบทางการแพทย์</h2>
                <p className="mb-2">ข้อมูลและคำปรึกษาที่ให้ผ่านเว็บไซต์นี้:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>มีวัตถุประสงค์เพื่อให้ข้อมูลทั่วไปเท่านั้น ไม่ใช่การวินิจฉัยโรค</li>
                  <li>ไม่สามารถทดแทนการตรวจรักษาจากแพทย์หรือบุคลากรทางการแพทย์โดยตรง</li>
                  <li>ไม่ควรใช้เป็นพื้นฐานในการตัดสินใจทางการแพทย์โดยไม่ปรึกษาแพทย์</li>
                  <li>ในกรณีฉุกเฉินทางการแพทย์ กรุณาโทร 1669 หรือไปพบแพทย์ที่โรงพยาบาลที่ใกล้ที่สุดทันที</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">4. หน้าที่ของผู้ใช้บริการ</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>ให้ข้อมูลที่ถูกต้อง ครบถ้วน และเป็นปัจจุบัน</li>
                  <li>ผู้ใช้ต้องมีอายุ 18 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครอง</li>
                  <li>ไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือไม่เหมาะสม</li>
                  <li>ไม่พยายามเข้าถึงระบบหรือข้อมูลที่ไม่ได้รับอนุญาต</li>
                  <li>รับผิดชอบในการรักษาความลับของข้อมูลบัญชีของตนเอง</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">5. ความเป็นส่วนตัว</h2>
                <p>การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของคุณเป็นไปตาม <Link href="/privacy" className="text-forest underline">นโยบายความเป็นส่วนตัว</Link> ของเรา ซึ่งถือเป็นส่วนหนึ่งของข้อกำหนดการใช้บริการนี้</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">6. ทรัพย์สินทางปัญญา</h2>
                <p>เนื้อหาทั้งหมดบนเว็บไซต์นี้ รวมถึงข้อความ รูปภาพ โลโก้ กราฟิก ซอฟต์แวร์ และการออกแบบ เป็นทรัพย์สินของบริษัท เจียรักษา จำกัด หรือผู้ให้อนุญาต และได้รับการคุ้มครองตามกฎหมายทรัพย์สินทางปัญญาของประเทศไทย ห้ามทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">7. ข้อจำกัดความรับผิด</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>บริษัทให้บริการ &ldquo;ตามสภาพ&rdquo; โดยไม่มีการรับประกันใดๆ ทั้งโดยชัดแจ้งหรือโดยปริยาย</li>
                  <li>บริษัทจะไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการใช้หรือไม่สามารถใช้บริการ</li>
                  <li>บริษัทไม่รับประกันว่าเว็บไซต์จะทำงานได้อย่างต่อเนื่องหรือปราศจากข้อผิดพลาด</li>
                  <li>ความรับผิดสูงสุดของบริษัทจำกัดไม่เกินจำนวนเงินที่คุณชำระค่าบริการ (ถ้ามี)</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">8. กฎหมายที่ใช้บังคับ</h2>
                <p>ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย ข้อพิพาทใดๆ ที่เกิดขึ้นจะอยู่ภายใต้เขตอำนาจของศาลไทย</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">9. การเปลี่ยนแปลงข้อกำหนด</h2>
                <p>บริษัทขอสงวนสิทธิ์ในการแก้ไขข้อกำหนดเหล่านี้ได้ตลอดเวลา โดยจะแจ้งให้ทราบผ่านทางเว็บไซต์ การใช้งานเว็บไซต์ต่อหลังจากมีการเปลี่ยนแปลงถือว่าคุณยอมรับข้อกำหนดที่แก้ไขแล้ว</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">10. ติดต่อเรา</h2>
                <div className="bg-white border border-mint/20 rounded-xl p-4">
                  <p><strong>บริษัท เจียรักษา จำกัด</strong></p>
                  <p>สมุทรสาคร, ประเทศไทย</p>
                  <p>อีเมล: <a href="mailto:legal@roogondee.com" className="text-forest underline">legal@roogondee.com</a></p>
                  <p>LINE OA: <a href="https://line.me/ti/p/@roogondee" className="text-forest underline">@roogondee</a></p>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">1. Acceptance of Terms</h2>
                <p>By accessing and using roogondee.com (&ldquo;Website&rdquo;), operated by Jia Raksa Co., Ltd. (&ldquo;Company&rdquo;), you agree to be bound by these Terms of Service in their entirety. If you do not agree to any of these terms, please discontinue use of the Website.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">2. Services Description</h2>
                <p>This Website is an online health consultation platform that connects users with licensed pharmacists and healthcare professionals. The Website is not a hospital, clinic, or medical facility, and does not provide direct medical treatment.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">3. Medical Disclaimer</h2>
                <p className="mb-2">Information and advice provided through this Website:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Is intended for general informational purposes only and does not constitute a medical diagnosis</li>
                  <li>Is not a substitute for professional medical advice, examination, or treatment</li>
                  <li>Should not be used as the sole basis for medical decisions without consulting a physician</li>
                  <li>In case of a medical emergency, please call 1669 or visit the nearest hospital immediately</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">4. User Obligations</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Provide accurate, complete, and up-to-date information</li>
                  <li>Users must be at least 18 years of age or have parental consent</li>
                  <li>Do not use the service for any unlawful or inappropriate purposes</li>
                  <li>Do not attempt to access unauthorized systems or data</li>
                  <li>Maintain the confidentiality of your account information</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">5. Privacy</h2>
                <p>The collection, use, and disclosure of your personal data is governed by our <Link href="/privacy" className="text-forest underline">Privacy Policy</Link>, which forms an integral part of these Terms of Service.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">6. Intellectual Property</h2>
                <p>All content on this Website, including text, images, logos, graphics, software, and design, is the property of Jia Raksa Co., Ltd. or its licensors and is protected under Thai intellectual property laws. Reproduction, modification, or distribution without written permission is prohibited.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">7. Limitation of Liability</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li>The Company provides its services &ldquo;as is&rdquo; without any warranties, express or implied</li>
                  <li>The Company shall not be liable for any damages arising from the use or inability to use the service</li>
                  <li>The Company does not guarantee that the Website will operate continuously or error-free</li>
                  <li>The Company&apos;s maximum liability is limited to the amount you paid for the service, if any</li>
                </ul>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">8. Governing Law</h2>
                <p>These Terms are governed by and construed in accordance with the laws of the Kingdom of Thailand. Any disputes arising shall be subject to the jurisdiction of the Thai courts.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">9. Changes to Terms</h2>
                <p>The Company reserves the right to modify these Terms at any time. Changes will be communicated via the Website. Continued use of the Website after changes are posted constitutes your acceptance of the revised Terms.</p>
              </section>
              <section>
                <h2 className="font-display text-xl text-forest mb-3">10. Contact Us</h2>
                <div className="bg-white border border-mint/20 rounded-xl p-4">
                  <p><strong>Jia Raksa Co., Ltd.</strong></p>
                  <p>Samut Sakhon, Thailand</p>
                  <p>Email: <a href="mailto:legal@roogondee.com" className="text-forest underline">legal@roogondee.com</a></p>
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
