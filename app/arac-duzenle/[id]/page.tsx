'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function AracDuzenle() {
  const router = useRouter()
  const params = useParams()
  const id = params.id 

  const [yukleniyor, setYukleniyor] = useState(false)
  const [masraflar, setMasraflar] = useState<any[]>([]) 
  const [yeniMasraf, setYeniMasraf] = useState({ aciklama: '', tutar: '', tarih: '' })

  const [formData, setFormData] = useState<any>({
    marka: '', model: '', yil: '', plaka: '', kilometre: '',
    renk: '', yakit: 'Benzin', vites: 'Manuel', kasa_tipi: 'Sedan',
    alis_fiyati: '', alis_tarihi: '', tramer: '', notlar: '',
    resim_url: '', sozlesme_url: ''
  })
  
  // --- EKSPERTİZ STATE ---
  const [ekspertiz, setEkspertiz] = useState<any>({
    kaput: 'Orijinal', tavan: 'Orijinal', bagaj: 'Orijinal',
    sol_on_camurluk: 'Orijinal', sol_on_kapi: 'Orijinal', sol_arka_kapi: 'Orijinal', sol_arka_camurluk: 'Orijinal',
    sag_on_camurluk: 'Orijinal', sag_on_kapi: 'Orijinal', sag_arka_kapi: 'Orijinal', sag_arka_camurluk: 'Orijinal',
    on_tampon: 'Orijinal', arka_tampon: 'Orijinal'
  })

  const [yeniResim, setYeniResim] = useState<File | null>(null)

  // PARÇALAR
  const parcalar = [
    { key: 'kaput', label: 'Kaput' },
    { key: 'tavan', label: 'Tavan' },
    { key: 'bagaj', label: 'Bagaj' },
    { key: 'sol_on_camurluk', label: 'Sol Ön Çamurluk' },
    { key: 'sol_on_kapi', label: 'Sol Ön Kapı' },
    { key: 'sol_arka_kapi', label: 'Sol Arka Kapı' },
    { key: 'sol_arka_camurluk', label: 'Sol Arka Çamurluk' },
    { key: 'sag_on_camurluk', label: 'Sağ Ön Çamurluk' },
    { key: 'sag_on_kapi', label: 'Sağ Ön Kapı' },
    { key: 'sag_arka_kapi', label: 'Sağ Arka Kapı' },
    { key: 'sag_arka_camurluk', label: 'Sağ Arka Çamurluk' },
  ]

  const durumlar = ['Orijinal', 'Boyalı', 'Lokal Boyalı', 'Değişen', 'Plastik']

  useEffect(() => {
    async function verileriGetir() {
      const { data: aracData, error: aracError } = await supabase
        .from('cars').select('*').eq('id', id).single()

      if (aracError) {
        alert('Araç bulunamadı!')
        router.push('/')
      } else {
        setFormData(aracData)
        if(aracData.ekspertiz) setEkspertiz(aracData.ekspertiz)
      }
      masraflariYenile()
    }
    if (id) verileriGetir()
  }, [id, router])

  async function masraflariYenile() {
    const { data } = await supabase.from('expenses').select('*').eq('car_id', id).order('tarih', { ascending: false })
    setMasraflar(data || [])
  }

  async function dosyaYukle(dosya: File) {
    const dosyaAdi = `${Date.now()}-${dosya.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const { data, error } = await supabase.storage.from('images').upload(`araclar/${dosyaAdi}`, dosya)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  const guncelle = async (e: React.FormEvent) => {
    e.preventDefault()
    setYukleniyor(true)
    try {
      let guncelResimUrl = formData.resim_url
      if (yeniResim) guncelResimUrl = await dosyaYukle(yeniResim)

      const { error } = await supabase
        .from('cars')
        .update({
          ...formData,
          yil: Number(formData.yil),
          kilometre: Number(formData.kilometre),
          alis_fiyati: Number(formData.alis_fiyati),
          tramer: Number(formData.tramer || 0),
          resim_url: guncelResimUrl,
          ekspertiz: ekspertiz 
        })
        .eq('id', id)

      if (error) throw error
      alert('✅ Güncelleme Başarılı!')
      router.push('/')

    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setYukleniyor(false)
    }
  }

  const masrafEkle = async () => {
    if (!yeniMasraf.aciklama || !yeniMasraf.tutar) return alert('Alanları doldurun!')
    const { error } = await supabase.from('expenses').insert([{
      car_id: id, aciklama: yeniMasraf.aciklama, tutar: Number(yeniMasraf.tutar), tarih: yeniMasraf.tarih || new Date().toISOString()
    }])
    if (error) alert('Hata: ' + error.message)
    else { setYeniMasraf({ aciklama: '', tutar: '', tarih: '' }); masraflariYenile() }
  }

  const masrafSil = async (masrafId: number) => {
    if(!confirm('Silmek istiyor musunuz?')) return
    await supabase.from('expenses').delete().eq('id', masrafId)
    masraflariYenile()
  }

  const hepsiniOrjinalYap = () => {
    const yeniEkspertiz: any = {}
    parcalar.forEach(p => yeniEkspertiz[p.key] = 'Orijinal')
    setEkspertiz(yeniEkspertiz)
  }

  // --- GÜNCELLENEN RENKLER ---
  // Boyalı: Mavi, Lokal: Sarı, Değişen: Kırmızı, Orijinal: Yeşil
  const renkKoduAl = (durum: string) => {
    if(durum === 'Boyalı') return '#3B82F6' // Mavi
    if(durum === 'Lokal Boyalı') return '#FACC15' // Sarı
    if(durum === 'Değişen') return '#EF4444' // Kırmızı
    if(durum === 'Orijinal') return '#22C55E' // Yeşil
    return '#E5E7EB' // Gri
  }

  const renkClassAl = (durum: string) => {
    if(durum === 'Boyalı') return 'bg-blue-100 text-blue-800 border-blue-300'
    if(durum === 'Lokal Boyalı') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if(durum === 'Değişen') return 'bg-red-100 text-red-800 border-red-300'
    if(durum === 'Orijinal') return 'bg-green-50 text-green-800 border-green-200'
    return 'bg-gray-50 border-gray-200'
  }

  const toplamMasraf = masraflar.reduce((acc, item) => acc + (item.tutar || 0), 0)

  if (!formData.marka) return <div className="p-10 text-center">Yükleniyor...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        
        <div className="bg-black p-6 text-white flex justify-between items-center border-b-4 border-[#FFB700]">
            <div><h1 className="text-2xl font-bold">Düzenle & Ekspertiz</h1><p className="text-gray-400 text-sm">{formData.marka} {formData.model}</p></div>
            <button onClick={() => router.push('/')} className="border border-[#FFB700] text-[#FFB700] px-4 py-2 rounded hover:bg-[#FFB700] hover:text-black transition font-bold">Geri Dön</button>
        </div>
        
        <div className="p-6">
          
          {/* ÜST KISIM: ARAÇ BİLGİLERİ VE MASRAFLAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* SOL: ARAÇ BİLGİLERİ (ESKİ HALİNE DÖNDÜ - LABEL'LAR GELDİ) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2">🚗 Araç Bilgileri</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Marka</label>
                        <input type="text" value={formData.marka} onChange={e => setFormData({...formData, marka: e.target.value})} className="w-full border p-2 rounded focus:border-[#FFB700] outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Model</label>
                        <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full border p-2 rounded focus:border-[#FFB700] outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Yıl</label>
                        <input type="number" value={formData.yil} onChange={e => setFormData({...formData, yil: e.target.value})} className="w-full border p-2 rounded focus:border-[#FFB700] outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Plaka</label>
                        <input type="text" value={formData.plaka} onChange={e => setFormData({...formData, plaka: e.target.value})} className="w-full border p-2 rounded uppercase focus:border-[#FFB700] outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Kilometre</label>
                        <input type="number" value={formData.kilometre} onChange={e => setFormData({...formData, kilometre: e.target.value})} className="w-full border p-2 rounded focus:border-[#FFB700] outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Alış Fiyatı (TL)</label>
                        <input type="number" value={formData.alis_fiyati} onChange={e => setFormData({...formData, alis_fiyati: e.target.value})} className="w-full border p-2 rounded focus:border-[#FFB700] outline-none font-bold" />
                    </div>
                </div>

                <div className="border-2 border-dashed p-4 rounded-lg bg-gray-50 hover:bg-yellow-50 transition cursor-pointer relative">
                  <p className="text-xs text-gray-500 mb-1 font-bold text-center">📸 Fotoğrafı Değiştir</p>
                  <input type="file" onChange={e => setYeniResim(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
            </div>

            {/* SAĞ: MASRAFLAR */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                🛠️ Masraflar
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">{toplamMasraf.toLocaleString('tr-TR')} ₺</span>
              </h3>
              <div className="space-y-4 mb-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Açıklama</label>
                    <input type="text" placeholder="Örn: Lastik" value={yeniMasraf.aciklama} onChange={e => setYeniMasraf({...yeniMasraf, aciklama: e.target.value})} className="w-full border p-2 rounded text-sm focus:border-[#FFB700] outline-none" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tutar</label>
                    <input type="number" placeholder="0" value={yeniMasraf.tutar} onChange={e => setYeniMasraf({...yeniMasraf, tutar: e.target.value})} className="w-full border p-2 rounded text-sm focus:border-[#FFB700] outline-none" />
                  </div>
                  <div className="flex items-end">
                     <button onClick={masrafEkle} className="bg-black text-[#FFB700] h-[38px] px-4 rounded text-lg font-bold hover:bg-gray-800">+</button>
                  </div>
                </div>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto max-h-40">
                {masraflar.map((masraf) => (
                    <div key={masraf.id} className="bg-gray-50 p-2 rounded border flex justify-between items-center text-xs group">
                      <span className="font-medium text-gray-700">{masraf.aciklama}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">-{masraf.tutar}₺</span>
                        <button onClick={() => masrafSil(masraf.id)} className="text-gray-300 hover:text-red-500 font-bold px-1">×</button>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* --- ALT KISIM: EKSPERTİZ VE GÖRSEL ARAÇ --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* SOL ALT: DROPDOWN LİSTESİ (Düzenlendi) */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><span className="text-xl">📋</span> Ekspertiz Raporu</h3>
                    <button onClick={hepsiniOrjinalYap} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold hover:bg-green-200 transition">Hepsini Orijinal Yap</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    {parcalar.map((parca) => (
                        <div key={parca.key} className={`flex justify-between items-center p-2 px-3 rounded-lg border transition-colors duration-300 ${renkClassAl(ekspertiz[parca.key])}`}>
                            <span className="font-medium text-sm">{parca.label}</span>
                            {/* Dropdown Genişletildi */}
                            <select 
                                value={ekspertiz[parca.key] || ''} 
                                onChange={(e) => setEkspertiz({...ekspertiz, [parca.key]: e.target.value})}
                                className="bg-transparent border-0 rounded px-2 py-1 text-xs font-bold focus:ring-0 outline-none cursor-pointer text-right w-32"
                            >
                                <option value="">Seçiniz...</option>
                                {durumlar.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* SAĞ ALT: GERÇEKÇİ ARABA GÖRSELİ */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center relative shadow-inner">
                <h3 className="absolute top-4 left-4 font-bold text-gray-400 text-sm uppercase">Görsel Durum</h3>
                
                {/* YENİ SVG: GERÇEKÇİ SEDAN GÖRÜNÜMÜ */}
                <svg width="220" height="380" viewBox="0 0 220 380" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                    
                    {/* Tekerlekler (Gölge) */}
                    <rect x="10" y="70" width="10" height="40" rx="2" fill="#333" />
                    <rect x="200" y="70" width="10" height="40" rx="2" fill="#333" />
                    <rect x="10" y="270" width="10" height="40" rx="2" fill="#333" />
                    <rect x="200" y="270" width="10" height="40" rx="2" fill="#333" />

                    {/* Ön Tampon */}
                    <path d="M40 20 Q110 0 180 20 L180 40 L40 40 Z" fill={renkKoduAl(ekspertiz.on_tampon)} stroke="#fff" strokeWidth="2" />

                    {/* Kaput (Daha kavisli) */}
                    <path d="M40 40 L180 40 L170 110 Q110 120 50 110 Z" fill={renkKoduAl(ekspertiz.kaput)} stroke="#fff" strokeWidth="2" />
                    
                    {/* Ön Cam (Sabit Mavi/Gri) */}
                    <path d="M50 110 Q110 120 170 110 L165 140 Q110 145 55 140 Z" fill="#9CA3AF" opacity="0.5" stroke="#fff" strokeWidth="1" />

                    {/* Tavan */}
                    <path d="M55 140 L165 140 L165 230 L55 230 Z" fill={renkKoduAl(ekspertiz.tavan)} stroke="#fff" strokeWidth="2" />

                    {/* Arka Cam (Sabit Mavi/Gri) */}
                    <path d="M55 230 L165 230 L170 260 Q110 265 50 260 Z" fill="#9CA3AF" opacity="0.5" stroke="#fff" strokeWidth="1" />

                    {/* Bagaj */}
                    <path d="M50 260 Q110 265 170 260 L180 320 L40 320 Z" fill={renkKoduAl(ekspertiz.bagaj)} stroke="#fff" strokeWidth="2" />

                    {/* Arka Tampon */}
                    <path d="M40 320 L180 320 L180 340 Q110 360 40 340 Z" fill={renkKoduAl(ekspertiz.arka_tampon)} stroke="#fff" strokeWidth="2" />

                    {/* Sol Ön Çamurluk */}
                    <path d="M20 40 L40 40 L50 110 L20 110 Z" fill={renkKoduAl(ekspertiz.sol_on_camurluk)} stroke="#fff" strokeWidth="2" />
                    {/* Sağ Ön Çamurluk */}
                    <path d="M180 40 L200 40 L200 110 L170 110 Z" fill={renkKoduAl(ekspertiz.sag_on_camurluk)} stroke="#fff" strokeWidth="2" />

                    {/* Sol Ön Kapı */}
                    <path d="M20 110 L55 140 L55 200 L20 200 Z" fill={renkKoduAl(ekspertiz.sol_on_kapi)} stroke="#fff" strokeWidth="2" />
                    {/* Sağ Ön Kapı */}
                    <path d="M200 110 L165 140 L165 200 L200 200 Z" fill={renkKoduAl(ekspertiz.sag_on_kapi)} stroke="#fff" strokeWidth="2" />

                    {/* Sol Arka Kapı */}
                    <path d="M20 200 L55 200 L55 230 L20 250 Z" fill={renkKoduAl(ekspertiz.sol_arka_kapi)} stroke="#fff" strokeWidth="2" />
                    {/* Sağ Arka Kapı */}
                    <path d="M200 200 L165 200 L165 230 L200 250 Z" fill={renkKoduAl(ekspertiz.sag_arka_kapi)} stroke="#fff" strokeWidth="2" />

                    {/* Sol Arka Çamurluk */}
                    <path d="M20 250 L50 260 L40 320 L20 320 Z" fill={renkKoduAl(ekspertiz.sol_arka_camurluk)} stroke="#fff" strokeWidth="2" />
                    {/* Sağ Arka Çamurluk */}
                    <path d="M200 250 L170 260 L180 320 L200 320 Z" fill={renkKoduAl(ekspertiz.sag_arka_camurluk)} stroke="#fff" strokeWidth="2" />

                </svg>

                {/* Renk Açıklaması (GÜNCELLENDİ) */}
                <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs font-bold text-gray-600 bg-white p-3 rounded-lg shadow-sm border">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Orijinal</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Boyalı</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Lokal</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> Değişen</span>
                </div>
            </div>

          </div>

          <div className="mt-8 text-center">
             <button onClick={guncelle} className="w-full md:w-1/2 bg-[#FFB700] text-black py-4 rounded-xl font-black text-lg hover:bg-yellow-400 shadow-xl transition transform active:scale-95">
                KAYDET VE ÇIK
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}