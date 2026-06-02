import PatientLabUpload from '@/components/lab/PatientLabUpload'

export const metadata = {
  title: 'ส่งผลตรวจให้เราอ่านให้ฟรี — รู้ก่อนดี',
  description: 'อัปโหลดผลแลปของคุณ ทีมแพทย์ช่วยอ่านและสรุปให้ฟรี ผ่าน LINE',
}

export default function LabUploadPage() {
  return (
    <main className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-lg mx-auto">
        <header className="text-center mb-6">
          <h1 className="font-display text-2xl text-forest">ส่งผลตรวจให้เราอ่านให้ฟรี</h1>
          <p className="text-sm text-gray-600 mt-2">
            ถ่ายรูปหรืออัปโหลดไฟล์ผลแลปของคุณ ทีมงานจะช่วยอ่าน สรุปผล และคำแนะนำ
            แล้วส่งกลับให้คุณทาง LINE ภายใน 1-2 วันทำการ
          </p>
        </header>
        <PatientLabUpload />
      </div>
    </main>
  )
}
