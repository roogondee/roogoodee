import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ข้อตกลงการใช้บริการ — รู้ก่อนดี',
  description: 'ข้อตกลงและเงื่อนไขการใช้บริการเว็บไซต์รู้ก่อนดี บริษัท เจียรักษา จำกัด',
}

const LAST_UPDATED = '5 เมษายน 2569'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 md:py-5 flex justify-between items-center bg-cream/90 backdrop-blur-md border-b border-mint/15">
        <Link href="/" className="font-display text-xl md:text-2xl text-forest">รู้ก่อน<span className="text-mint italic">ดี</span></Link>
        <Link href="/contact" className="bg-forest text-white px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:bg-sage transition-all">💬 ปรึกษาฟรี</Link>
      </nav>

      <div className="pt-24 md:pt-32 pb-16 md:pb-24 max-w-3xl mx-auto px-6">
        <p className="text-xs font-bold tracking-widest uppercase text-mint mb-3">Legal</p>
        <h1 className="font-display text-3xl md:text-4xl text-forest mb-2">ข้อตกลงการใช้บริการ</h1>
        <p className="text-muted text-sm mb-10">อัปเดตล่าสุด: {LAST_UPDATED}</p>

        <div className="article-body space-y-8">

          <section>
            <h2>1. การยอมรับข้อตกลง</h2>
            <p>
              การเข้าใช้งานเว็บไซต์ <strong>roogondee.com</strong> หรือการกรอกแบบฟอร์มขอรับคำปรึกษา
              ถือว่าท่านได้อ่านและยอมรับข้อตกลงการใช้บริการฉบับนี้แล้ว
              หากท่านไม่ยอมรับข้อตกลงใดๆ ในที่นี้ กรุณางดใช้บริการ
            </p>
          </section>

          <section>
            <h2>2. ลักษณะของบริการ</h2>
            <p>
              รู้ก่อนดี ให้บริการ <strong>ข้อมูลสุขภาพเบื้องต้นและการส่งต่อผู้เชี่ยวชาญ</strong> เท่านั้น
              บริการของเราไม่ใช่การวินิจฉัยโรค ไม่ใช่การรักษาพยาบาล
              และไม่ทดแทนการพบแพทย์หรือบุคลากรทางการแพทย์ที่มีใบอนุญาต
            </p>
            <p>
              เว็บไซต์นี้ <strong>ไม่มีการจำหน่ายสินค้าหรือบริการทางการแพทย์โดยตรง</strong>
              บริการที่นำเสนอคือการให้ข้อมูลและประสานงานส่งต่อไปยังสถานพยาบาลที่เหมาะสม
            </p>
          </section>

          <section>
            <h2>3. ข้อจำกัดความรับผิด</h2>
            <p>บริษัท เจียรักษา จำกัด และรู้ก่อนดี <strong>ไม่รับผิดชอบ</strong>ต่อ:</p>
            <ul>
              <li>ความเสียหายใดๆ ที่เกิดจากการนำข้อมูลบนเว็บไซต์ไปใช้โดยไม่ผ่านการปรึกษาแพทย์</li>
              <li>ผลลัพธ์ของการรักษาที่ดำเนินการโดยสถานพยาบาลที่รับส่งต่อ</li>
              <li>ความล่าช้าในการติดต่อกลับอันเกิดจากเหตุสุดวิสัย</li>
              <li>ความไม่ถูกต้องของข้อมูลที่ท่านกรอกในแบบฟอร์ม</li>
            </ul>
            <p>
              เนื้อหาบทความบนเว็บไซต์จัดทำขึ้นเพื่อ <strong>ให้ความรู้ทั่วไปเท่านั้น</strong>
              ไม่ใช่คำแนะนำทางการแพทย์เฉพาะบุคคล
            </p>
          </section>

          <section>
            <h2>4. หน้าที่ของผู้ใช้บริการ</h2>
            <p>ท่านตกลงที่จะ:</p>
            <ul>
              <li>ให้ข้อมูลที่ถูกต้องและเป็นความจริงในแบบฟอร์มทุกช่อง</li>
              <li>ไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือก่อให้เกิดความเสียหาย</li>
              <li>ไม่แอบอ้าง ปลอมแปลงตัวตน หรือส่งข้อมูลเท็จ</li>
              <li>ติดต่อฉุกเฉินทางการแพทย์โดยตรงที่ <strong>1669</strong> ในกรณีเร่งด่วน</li>
            </ul>
          </section>

          <section>
            <h2>5. ทรัพย์สินทางปัญญา</h2>
            <p>
              เนื้อหา บทความ รูปภาพ และองค์ประกอบทั้งหมดบนเว็บไซต์เป็นทรัพย์สินของ
              บริษัท เจียรักษา จำกัด ห้ามคัดลอก ทำซ้ำ หรือดัดแปลงโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
            </p>
          </section>

          <section>
            <h2>6. การเชื่อมโยงไปยังเว็บไซต์ภายนอก</h2>
            <p>
              เว็บไซต์อาจมีลิงก์ไปยังเว็บไซต์ภายนอก บริษัทไม่รับผิดชอบต่อเนื้อหา
              นโยบาย หรือความน่าเชื่อถือของเว็บไซต์เหล่านั้น
            </p>
          </section>

          <section>
            <h2>7. การเปลี่ยนแปลงบริการ</h2>
            <p>
              บริษัทสงวนสิทธิ์ในการแก้ไข ปรับปรุง ระงับ หรือยกเลิกบริการไม่ว่าส่วนใดส่วนหนึ่ง
              โดยไม่ต้องแจ้งล่วงหน้า
            </p>
          </section>

          <section>
            <h2>8. กฎหมายที่ใช้บังคับ</h2>
            <p>
              ข้อตกลงนี้อยู่ภายใต้กฎหมายไทย ข้อพิพาทใดๆ ให้ยื่นต่อศาลที่มีเขตอำนาจในประเทศไทย
            </p>
          </section>

          <section>
            <h2>9. ติดต่อเรา</h2>
            <p>หากมีคำถามเกี่ยวกับข้อตกลงการใช้บริการ ติดต่อได้ที่:</p>
            <ul>
              <li>อีเมล: <strong>privacy@roogondee.com</strong></li>
              <li>โทรศัพท์: <strong>081-902-3540 / 091-982-6661</strong></li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-mint/20 flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-forest transition-colors">นโยบายความเป็นส่วนตัว</Link>
          <Link href="/" className="hover:text-forest transition-colors">กลับหน้าแรก</Link>
        </div>
      </div>
    </main>
  )
}
