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
      const { data, error } = await supabase
        .from('customers')
        .select('*, cars(*)') 
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setMusteriler(data || [])
      setYukleniyor(false)
    }
    verileriGetir()
  }, [])

  // --- SİLME FONKSİYONU ---
  const musteriSil = async (id: number) => {
    if (!confirm('Bu müşteri kaydını ve geçmişini silmek istediğinize emin misiniz?')) return

    const { error } = await supabase.from('customers').delete().eq('id', id)

    if (error) {
      console.error(error)
      alert('Silinemedi! Bu müşteriye ait satış kayıtları duruyor olabilir.')
    } else {
      setMusteriler(musteriler.filter(m => m.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] p-4 md:p-8 pb-24 font-sans text-white">
      
      {/* BAŞLIK */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center border-b border-white/10 pb-4">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">MÜŞTERİ <span className="text-[#FFD60A]">DEFTERİ</span></h1>
            <p className="text-gray-500 text-sm">Kayıtlı müşteriler ve alım geçmişleri</p>
        </div>
        <button onClick={() => router.push('/')} className="bg-[#1C1C1E] border border-white/10 px-4 py-2 rounded-xl hover:bg-[#FFD60A] hover:text-black hover:border-[#FFD60A] transition font-bold text-sm">
          ← Garaja Dön
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {yukleniyor ? <div className="text-center text-[#FFD60A] animate-pulse">Defter açılıyor...</div> : 
         musteriler.length === 0 ? <div className="text-center text-gray-600 py-20 bg-[#1C1C1E] rounded-2xl border border-white/5">Henüz kayıtlı müşteri yok.</div> :
         musteriler.map((musteri) => (
           <div key={musteri.id} className="bg-[#1C1C1E] p-6 rounded-2xl shadow-lg border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-[#FFD60A]/30 transition-all">
             
             {/* SOL: Müşteri Bilgisi */}
             <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="bg-[#2C2C2E] w-14 h-14 rounded-full flex items-center justify-center text-2xl border border-white/5">
                 👤
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">{musteri.ad_soyad}</h3>
                 <a href={`tel:${musteri.telefon}`} className="text-gray-400 text-sm font-medium hover:text-[#FFD60A] transition flex items-center gap-2 mt-1">
                   📞 {musteri.telefon}
                 </a>
               </div>
             </div>

             {/* SAĞ: Aldığı Araç & Sil Butonu */}
             <div className="w-full md:w-auto flex flex-col md:flex-row items-start md:items-center gap-4">
                 
                 {/* Araç Bilgisi Kutusu */}
                 <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-sm min-w-[200px]">
                    <span className="text-gray-500 text-[10px] font-bold uppercase block mb-1 tracking-wider">Satın Aldığı Araç</span>
                    {musteri.cars && musteri.cars.length > 0 ? (
                      musteri.cars.map((araba: any) => (
                        <div key={araba.id} className="font-bold text-[#FFD60A] flex items-center gap-1">
                          🚗 {araba.marka} {araba.model} 
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-600 italic text-xs">Araç kaydı yok</span>
                    )}
                 </div>

                 {/* SİLME BUTONU */}
                 <button 
                    onClick={() => musteriSil(musteri.id)}
                    className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition shadow-lg border border-red-500/20"
                    title="Müşteriyi Sil"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                 </button>

             </div>

           </div>
         ))
        }
      </div>
    </div>
  )
}