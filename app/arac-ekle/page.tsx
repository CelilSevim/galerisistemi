'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AracEkle() {
  const router = useRouter()
  const [yukleniyor, setYukleniyor] = useState(false)

  // Form Verileri
  const [formData, setFormData] = useState({
    marka: '',
    model: '',
    yil: '',
    plaka: '',
    kilometre: '',
    renk: '', 
    yakit: 'Benzin',
    vites: 'Manuel',
    kasa_tipi: 'Sedan',
    alis_fiyati: '',
    alis_tarihi: '',
    tramer: '',
    notlar: ''
  })

  // Dosya State'leri
  const [resimDosyasi, setResimDosyasi] = useState<File | null>(null)
  const [sozlesmeDosyasi, setSozlesmeDosyasi] = useState<File | null>(null)

  // Resim Yükleme Fonksiyonu
  async function dosyaYukle(dosya: File, klasor: string) {
    const temizIsim = dosya.name.replace(/[^a-zA-Z0-9.-]/g, '')
    const dosyaAdi = `${Date.now()}-${temizIsim}`
    
    const { data, error } = await supabase.storage
      .from('images') 
      .upload(`${klasor}/${dosyaAdi}`, dosya)

    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path)
      
    return urlData.publicUrl
  }

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    setYukleniyor(true)

    try {
      let resimUrl = ''
      let sozlesmeUrl = ''

      // 1. Dosyaları Yükle
      if (resimDosyasi) {
        resimUrl = await dosyaYukle(resimDosyasi, 'araclar')
      }
      if (sozlesmeDosyasi) {
        sozlesmeUrl = await dosyaYukle(sozlesmeDosyasi, 'sozlesmeler')
      }

      // 2. Veritabanına Kaydet
      const { error } = await supabase.from('cars').insert([
        {
          marka: formData.marka,
          model: formData.model,
          yil: Number(formData.yil),
          kilometre: Number(formData.kilometre),
          renk: formData.renk,
          vites: formData.vites,
          yakit: formData.yakit,
          plaka: formData.plaka,
          kasa_tipi: formData.kasa_tipi,
          alis_fiyati: Number(formData.alis_fiyati),
          alis_tarihi: formData.alis_tarihi,
          tramer: formData.tramer ? Number(formData.tramer) : 0,
          notlar: formData.notlar,
          resim_url: resimUrl,
          sozlesme_url: sozlesmeUrl,
          durum: 'Stokta',
          satis_bedeli: 0 
        }
      ])

      if (error) throw error
      alert('✅ Araç başarıyla eklendi!')
      router.push('/') 

    } catch (error: any) {
      console.error('Hata:', error)
      alert('❌ Bir hata oluştu: ' + error.message)
    } finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        
        {/* BAŞLIK: SİYAH & GOLD */}
        <div className="bg-black p-6 text-white border-b-4 border-[#FFB700] flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Yeni Araç Girişi</h1>
                <p className="text-gray-400 text-sm">Stok listesine yeni bir araç ekleyin.</p>
            </div>
            <button onClick={() => router.push('/')} className="text-[#FFB700] hover:text-white transition text-sm font-bold border border-[#FFB700] px-4 py-2 rounded-lg hover:bg-[#FFB700] hover:border-transparent hover:text-black">
                ← Vazgeç
            </button>
        </div>
        
        <form onSubmit={kaydet} className="p-8 space-y-8">
          
          {/* Bölüm 1: Araç Kimlik Bilgileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Marka</label>
              <input type="text" required placeholder="Örn: BMW" className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, marka: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Model</label>
              <input type="text" required placeholder="Örn: 3.20i" className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, model: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Yıl</label>
              <input type="number" required placeholder="2023" className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, yil: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Plaka</label>
              <input type="text" required placeholder="34 ABC 34" className="w-full rounded-lg border border-gray-300 p-3 uppercase outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, plaka: e.target.value})} />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Bölüm 2: Teknik Detaylar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Kilometre</label>
              <input type="number" required className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, kilometre: e.target.value})} />
            </div>
             <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Renk</label>
              <input type="text" required placeholder="Beyaz" className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, renk: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Yakıt</label>
              <select className="w-full rounded-lg border border-gray-300 p-3 bg-white outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition"
                onChange={e => setFormData({...formData, yakit: e.target.value})}>
                <option>Benzin</option>
                <option>Dizel</option>
                <option>Hibrit</option>
                <option>Elektrik</option>
                <option>LPG</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Vites</label>
              <select className="w-full rounded-lg border border-gray-300 p-3 bg-white outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition"
                onChange={e => setFormData({...formData, vites: e.target.value})}>
                <option>Manuel</option>
                <option>Otomatik</option>
                <option>Yarı Otomatik</option>
              </select>
            </div>
          </div>

          {/* Bölüm 3: Finansal Bilgiler (Özel Tasarım) */}
          <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-[#FFB700] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Alış Fiyatı (TL)</label>
              <input type="number" required className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition font-bold text-gray-900" 
                onChange={e => setFormData({...formData, alis_fiyati: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Alış Tarihi</label>
              <input type="date" required className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
                onChange={e => setFormData({...formData, alis_tarihi: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tramer (TL)</label>
              <input type="number" className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" placeholder="0"
                onChange={e => setFormData({...formData, tramer: e.target.value})} />
            </div>
          </div>

          {/* Bölüm 4: Dosya Yükleme */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#FFB700] hover:bg-yellow-50 transition text-center cursor-pointer relative group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition">📸</span>
              <label className="block text-sm font-bold text-gray-700 mb-1">Araç Fotoğrafı</label>
              <p className="text-xs text-gray-400">Yüklemek için tıklayın</p>
              <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => setResimDosyasi(e.target.files ? e.target.files[0] : null)} />
                <div className="text-xs text-[#FFB700] font-bold mt-2 truncate">{resimDosyasi ? resimDosyasi.name : ''}</div>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-400 hover:bg-orange-50 transition text-center cursor-pointer relative group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition">📄</span>
              <label className="block text-sm font-bold text-gray-700 mb-1">Alış Sözleşmesi</label>
              <p className="text-xs text-gray-400">Yüklemek için tıklayın</p>
              <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={e => setSozlesmeDosyasi(e.target.files ? e.target.files[0] : null)} />
                 <div className="text-xs text-orange-600 font-bold mt-2 truncate">{sozlesmeDosyasi ? sozlesmeDosyasi.name : ''}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Notlar</label>
            <textarea rows={3} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-[#FFB700] focus:border-transparent transition" 
              onChange={e => setFormData({...formData, notlar: e.target.value})}></textarea>
          </div>

          <button type="submit" disabled={yukleniyor}
            className={`w-full py-4 px-6 rounded-xl font-black text-lg shadow-lg transition transform active:scale-95 border-b-4 
              ${yukleniyor ? 'bg-gray-400 border-gray-500 cursor-not-allowed text-white' : 'bg-[#FFB700] border-yellow-600 text-black hover:bg-yellow-400'}`}>
            {yukleniyor ? 'KAYDEDİLİYOR...' : 'ARACI SİSTEME KAYDET'}
          </button>

        </form>
      </div>
    </div>
  )
}