'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function KasaSayfasi() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hareketler, setHareketler] = useState<any[]>([])
  const [secilenAy, setSecilenAy] = useState<string>('Hepsi') // Ay filtresi
  
  // Yeni İşlem Formu
  const [yeniIslem, setYeniIslem] = useState({
    aciklama: '',
    tutar: '',
    tur: 'Gider', 
    tarih: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    verileriGetir()
  }, [])

  async function verileriGetir() {
    setYukleniyor(true)
    
    // 1. Dükkan İşlemlerini Çek
    const { data: islemler } = await supabase.from('transactions').select('*')
    
    // 2. Araçları ve Masraflarını Çek
    const { data: araclar } = await supabase.from('cars').select('*, expenses(*)')

    let tumHareketler: any[] = []

    // A) Dükkan İşlemlerini Listeye Ekle
    if (islemler) {
      islemler.forEach(islem => {
        tumHareketler.push({
          id: `tr-${islem.id}`,
          tarih: islem.tarih,
          aciklama: islem.aciklama,
          kategori: islem.kategori || 'Genel',
          tutar: islem.tutar,
          tur: islem.tur,
          kaynak: 'Dükkan'
        })
      })
    }

    // B) Araç Verilerini Listeye Ekle
    if (araclar) {
      araclar.forEach(arac => {
        // Araç Alışı (Gider)
        tumHareketler.push({
          id: `alis-${arac.id}`,
          tarih: arac.alis_tarihi,
          aciklama: `${arac.marka} ${arac.model} Alımı`,
          kategori: 'Araç Alım',
          tutar: arac.alis_fiyati,
          tur: 'Gider',
          kaynak: 'Oto'
        })

        // Araç Satışı (Gelir)
        if (arac.durum === 'Satıldı' && arac.satis_bedeli > 0) {
          tumHareketler.push({
            id: `satis-${arac.id}`,
            tarih: arac.satis_tarihi || arac.created_at,
            aciklama: `${arac.marka} ${arac.model} Satışı`,
            kategori: 'Araç Satış',
            tutar: arac.satis_bedeli,
            tur: 'Gelir',
            kaynak: 'Oto'
          })
        }

        // Araç Masrafları (Gider)
        if (arac.expenses) {
          arac.expenses.forEach((masraf: any) => {
            tumHareketler.push({
              id: `masraf-${masraf.id}`,
              tarih: masraf.tarih || masraf.created_at,
              aciklama: `${arac.marka} ${arac.model} - ${masraf.aciklama}`,
              kategori: 'Araç Masraf',
              tutar: masraf.tutar,
              tur: 'Gider',
              kaynak: 'Oto'
            })
          })
        }
      })
    }

    // Tarihe göre sırala (En yeniden eskiye)
    tumHareketler.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())

    setHareketler(tumHareketler)
    setYukleniyor(false)
  }

  const islemKaydet = async () => {
    if (!yeniIslem.aciklama || !yeniIslem.tutar) return alert('Lütfen alanları doldurun')

    const { error } = await supabase.from('transactions').insert([{
      aciklama: yeniIslem.aciklama,
      tutar: Number(yeniIslem.tutar),
      tur: yeniIslem.tur,
      tarih: yeniIslem.tarih,
      kategori: 'Genel' 
    }])

    if (error) alert('Hata: ' + error.message)
    else {
      alert('✅ İşlem eklendi!')
      setYeniIslem({ ...yeniIslem, aciklama: '', tutar: '' }) 
      verileriGetir() 
    }
  }

  // --- AYIRMA VE FİLTRELEME MANTIĞI ---
  
  // 1. Mevcut tüm ayları bul (Tekrarsız)
  const aylar = Array.from(new Set(hareketler.map(h => h.tarih.slice(0, 7)))).sort().reverse()

  // 2. Seçilen aya göre listeyi filtrele
  const filtrelenenHareketler = secilenAy === 'Hepsi' 
    ? hareketler 
    : hareketler.filter(h => h.tarih.startsWith(secilenAy))

  // 3. Hesaplamalar (Filtrelenmiş listeye göre)
  const toplamGelir = filtrelenenHareketler.filter(h => h.tur === 'Gelir').reduce((acc, curr) => acc + curr.tutar, 0)
  const toplamGider = filtrelenenHareketler.filter(h => h.tur === 'Gider').reduce((acc, curr) => acc + curr.tutar, 0)
  const kasaDurumu = toplamGelir - toplamGider

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-24">
      
      {/* BAŞLIK */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tighter">KASA & FİNANS</h1>
           <p className="text-gray-500 text-sm">Gelir ve giderlerinizi aylık olarak takip edin.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => router.push('/')} className="bg-white border px-4 py-2 rounded-lg hover:bg-black hover:text-[#FFB700] transition font-bold">
            ← Garaja Dön
            </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SOL TARAF: ÖZET VE FORM */}
        <div className="space-y-6">
          
          {/* AY SEÇİCİ & ÖZET KARTI */}
          <div className="bg-black text-white p-6 rounded-2xl shadow-xl border-b-8 border-[#FFB700] relative overflow-hidden">
            
            {/* Ay Seçimi */}
            <div className="mb-6 relative z-10">
                <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">Dönem Seçiniz</label>
                <select 
                    value={secilenAy} 
                    onChange={(e) => setSecilenAy(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-[#FFB700] font-bold p-2 rounded-lg outline-none focus:border-[#FFB700]"
                >
                    <option value="Hepsi">TÜM ZAMANLAR</option>
                    {aylar.map(ay => (
                        <option key={ay} value={ay}>
                            {new Date(ay + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>

            <div className="absolute top-10 right-0 p-4 opacity-10 text-9xl text-[#FFB700]">₺</div>
            
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
                {secilenAy === 'Hepsi' ? 'Genel Toplam Kâr/Zarar' : 'Aylık Kâr/Zarar'}
            </p>
            <h2 className={`text-4xl font-black tracking-tight ${kasaDurumu >= 0 ? 'text-white' : 'text-red-500'}`}>
              {kasaDurumu.toLocaleString('tr-TR')} ₺
            </h2>
            
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-800 pt-4 relative z-10">
              <div>
                <p className="text-gray-400 text-xs">Toplam Giriş</p>
                <p className="text-green-400 font-bold text-lg">+{toplamGelir.toLocaleString('tr-TR')}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Toplam Çıkış</p>
                <p className="text-red-400 font-bold text-lg">-{toplamGider.toLocaleString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* HIZLI İŞLEM EKLEME FORMU */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-[#FFB700] w-2 h-6 block rounded-sm"></span> Hızlı İşlem Ekle
            </h3>
            
            <div className="space-y-4">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setYeniIslem({...yeniIslem, tur: 'Gelir'})} 
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition ${yeniIslem.tur === 'Gelir' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>
                  Gelir (+)
                </button>
                <button onClick={() => setYeniIslem({...yeniIslem, tur: 'Gider'})} 
                  className={`flex-1 py-2 rounded-md text-sm font-bold transition ${yeniIslem.tur === 'Gider' ? 'bg-red-600 text-white shadow' : 'text-gray-500'}`}>
                  Gider (-)
                </button>
              </div>

              <input type="date" value={yeniIslem.tarih} onChange={e => setYeniIslem({...yeniIslem, tarih: e.target.value})} 
                className="w-full border p-3 rounded-lg outline-none focus:border-[#FFB700] border-gray-300" />
              
              <input type="text" placeholder="Açıklama (Örn: Kira, Çay)" value={yeniIslem.aciklama} onChange={e => setYeniIslem({...yeniIslem, aciklama: e.target.value})} 
                className="w-full border p-3 rounded-lg outline-none focus:border-[#FFB700] border-gray-300" />
              
              <div className="relative">
                <input type="number" placeholder="Tutar" value={yeniIslem.tutar} onChange={e => setYeniIslem({...yeniIslem, tutar: e.target.value})} 
                  className="w-full border p-3 rounded-lg outline-none focus:border-[#FFB700] font-bold border-gray-300" />
                <span className="absolute right-3 top-3 text-gray-400 font-bold">₺</span>
              </div>

              <button onClick={islemKaydet} className="w-full bg-black text-[#FFB700] font-bold py-3 rounded-lg hover:bg-gray-900 transition shadow-lg active:scale-95">
                KAYDET
              </button>
            </div>
          </div>

        </div>

        {/* SAĞ TARAF: HAREKET LİSTESİ TABLOSU */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">
                  {secilenAy === 'Hepsi' ? 'Tüm Hareketler' : `${new Date(secilenAy + '-01').toLocaleDateString('tr-TR', { month: 'long' }).toUpperCase()} Hareketleri`}
              </h3>
              <span className="text-xs text-gray-400 font-bold bg-gray-200 px-2 py-1 rounded">{filtrelenenHareketler.length} işlem</span>
            </div>
            
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              {yukleniyor ? (
                <div className="p-10 text-center text-gray-500">Hesaplanıyor...</div>
              ) : filtrelenenHareketler.length === 0 ? (
                <div className="p-10 text-center text-gray-400">Bu dönemde işlem yok.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs sticky top-0">
                    <tr>
                      <th className="p-4">Tarih</th>
                      <th className="p-4">Açıklama</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtrelenenHareketler.map((islem) => (
                      <tr key={islem.id} className="hover:bg-gray-50 transition">
                        <td className="p-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                          {new Date(islem.tarih).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="p-4 font-bold text-gray-800">
                          {islem.kaynak === 'Oto' ? '🚗 ' : '🏢 '}
                          {islem.aciklama}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold 
                            ${islem.kategori === 'Araç Satış' ? 'bg-green-100 text-green-700' : 
                              islem.kategori === 'Araç Alım' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'}`}>
                            {islem.kategori}
                          </span>
                        </td>
                        <td className={`p-4 text-right font-black text-base
                          ${islem.tur === 'Gelir' ? 'text-green-600' : 'text-red-600'}`}>
                          {islem.tur === 'Gelir' ? '+' : '-'}{islem.tutar.toLocaleString('tr-TR')} ₺
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}