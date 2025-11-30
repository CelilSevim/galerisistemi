'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MusteriDefteri() {
  const router = useRouter()
  const [musteriler, setMusteriler] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    async function verileriGetir() {
      // Müşterileri ve aldıkları arabaları çek (Ters bağlantı)
      const { data, error } = await supabase
        .from('customers')
        .select('*, cars(*)') // Müşteriyle birlikte aldığı arabayı da getir
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setMusteriler(data || [])
      setYukleniyor(false)
    }
    verileriGetir()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">MÜŞTERİ DEFTERİ</h1>
        <button onClick={() => router.push('/')} className="bg-white border px-4 py-2 rounded-lg hover:bg-black hover:text-[#FFB700] transition font-bold">
          ← Garaja Dön
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {yukleniyor ? <div className="text-center text-gray-500">Defter açılıyor...</div> : 
         musteriler.length === 0 ? <div className="text-center text-gray-400 py-10">Henüz kayıtlı müşteri yok.</div> :
         musteriler.map((musteri) => (
           <div key={musteri.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition">
             
             {/* Müşteri Bilgisi */}
             <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="bg-gray-100 p-4 rounded-full text-2xl">👤</div>
               <div>
                 <h3 className="text-xl font-bold text-gray-900">{musteri.ad_soyad}</h3>
                 <a href={`tel:${musteri.telefon}`} className="text-blue-600 font-medium hover:underline flex items-center gap-1">
                   📞 {musteri.telefon}
                 </a>
               </div>
             </div>

             {/* Aldığı Araç Bilgisi */}
             <div className="w-full md:w-auto bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm">
                <span className="text-gray-400 text-xs font-bold uppercase block mb-1">Satın Aldığı Araç</span>
                {musteri.cars && musteri.cars.length > 0 ? (
                  musteri.cars.map((araba: any) => (
                    <div key={araba.id} className="font-bold text-gray-800">
                      🚗 {araba.marka} {araba.model} <span className="text-gray-400 font-normal">({araba.plaka})</span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-400 italic">Kayıt bulunamadı</span>
                )}
             </div>

           </div>
         ))
        }
      </div>
    </div>
  )
}