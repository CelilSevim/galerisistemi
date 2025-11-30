'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function VitrinKagidi() {
  const params = useParams()
  const id = params.id
  const [arac, setArac] = useState<any>(null)
  const [fiyat, setFiyat] = useState('') 

  useEffect(() => {
    async function veriGetir() {
      const { data } = await supabase.from('cars').select('*').eq('id', id).single()
      if (data) setArac(data)
    }
    if (id) veriGetir()
  }, [id])

  if (!arac) return <div className="text-center p-10">...</div>

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      
      <div className="print:hidden mb-8 flex gap-4 items-center bg-white p-4 rounded-xl shadow-lg z-10 border-l-4 border-carbay-gold">
        <input type="text" placeholder="Fiyat Girin (Örn: 1.250.000 TL)" className="border p-2 rounded w-64 font-bold" value={fiyat} onChange={(e) => setFiyat(e.target.value)} />
        <button onClick={() => window.print()} className="bg-black text-carbay-gold px-6 py-2 rounded-lg font-bold hover:bg-gray-900 transition flex items-center gap-2">🖨️ Yazdır</button>
        <button onClick={() => window.close()} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">Kapat</button>
      </div>

      {/* A4 TASARIM */}
      <div className="bg-white w-[210mm] h-[297mm] shadow-2xl p-12 relative print:shadow-none print:w-full print:h-screen flex flex-col print:p-8">
        
        {/* LOGO */}
        <div className="text-center border-b-8 border-black pb-6 mb-8 flex flex-col items-center">
           <div className="text-7xl font-black tracking-tighter leading-none">
              <span className="text-carbay-gold">CAR</span><span className="text-black">BAY</span>
           </div>
           <div className="bg-black text-white px-8 py-1 mt-2 text-sm tracking-[0.5em] font-light uppercase">Celil Sevim</div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-5xl font-black text-gray-900 uppercase tracking-tight">{arac.marka}</h2>
          <h3 className="text-3xl font-light text-gray-600 mt-1">{arac.model}</h3>
        </div>

        <div className="w-full h-[500px] bg-gray-900 overflow-hidden mb-8 shadow-sm relative">
          {arac.resim_url ? <img src={arac.resim_url} className="w-full h-full object-cover" /> : null}
           <div className="absolute top-0 right-0 bg-carbay-gold text-black font-bold text-2xl px-6 py-3 shadow-lg">
             {arac.yil}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-lg mb-8">
          <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2"><span className="text-gray-400 font-bold uppercase text-sm">Kilometre</span><span className="font-black text-gray-900 text-2xl">{arac.kilometre.toLocaleString('tr-TR')} KM</span></div>
          <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2"><span className="text-gray-400 font-bold uppercase text-sm">Yakıt</span><span className="font-black text-gray-900 text-2xl">{arac.yakit}</span></div>
          <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2"><span className="text-gray-400 font-bold uppercase text-sm">Vites</span><span className="font-black text-gray-900 text-2xl">{arac.vites}</span></div>
          <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2"><span className="text-gray-400 font-bold uppercase text-sm">Renk</span><span className="font-black text-gray-900 text-2xl">{arac.renk || '-'}</span></div>
        </div>

        <div className="mt-auto pt-4 text-center">
            {fiyat ? (
                <div className="bg-black text-white p-8 shadow-2xl inline-block px-16 relative transform -rotate-1">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-carbay-gold text-black text-xs uppercase font-black px-4 py-1">Satış Fiyatı</div>
                    <span className="text-6xl font-black tracking-tight leading-none">{fiyat}</span>
                </div>
            ) : <div className="border-4 border-dashed border-gray-200 p-8 text-gray-300 font-bold text-3xl uppercase">Fiyat Bilgisi Alınız</div>}
        </div>

        <div className="mt-10 text-center text-xs text-gray-400 border-t pt-6 font-bold tracking-widest uppercase">
            CARBAY MOTORS • GÜVENİLİR İKİNCİ ELİN ADRESİ • İSTANBUL
        </div>
      </div>
      
      <style jsx global>{`
        @media print { @page { size: A4; margin: 0mm; } body { background: white; -webkit-print-color-adjust: exact; } .print\\:hidden { display: none !important; } .print\\:p-8 { padding: 2rem !important; } }
      `}</style>
    </div>
  )
}