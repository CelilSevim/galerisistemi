'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [araclar, setAraclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  
  // Arama, Filtre ve Auth
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtreDurumu, setFiltreDurumu] = useState('Hepsi') 
  const [oturumVarMi, setOturumVarMi] = useState(false)

  // --- MODAL STATE'LERİ ---
  const [satilacakArac, setSatilacakArac] = useState<any>(null)
  const [satisFiyati, setSatisFiyati] = useState('')
  const [satisTarihi, setSatisTarihi] = useState('') 
  const [satisSozlesmesi, setSatisSozlesmesi] = useState<File | null>(null)
  const [satisYukleniyor, setSatisYukleniyor] = useState(false)

  // Sözleşme Görüntüleme Penceresi
  const [sozlesmeArac, setSozlesmeArac] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState<'alis' | 'satis'>('alis')

  useEffect(() => {
    async function oturumKontrol() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setOturumVarMi(true)
        verileriGetir()
      }
    }
    oturumKontrol()
  }, [router])

  async function verileriGetir() {
    const { data, error } = await supabase
      .from('cars')
      .select('*, expenses(*)') 
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Veri çekme hatası:', error)
    } else {
      setAraclar(data || [])
    }
    setYukleniyor(false)
  }

  const cikisYap = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const gunFarkiHesapla = (alisTarihi: string, satisTarihi: string) => {
    if (!alisTarihi || !satisTarihi) return 0
    const d1 = new Date(alisTarihi)
    const d2 = new Date(satisTarihi)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
  }

  async function dosyaYukle(dosya: File) {
    const dosyaAdi = `sozlesme-${Date.now()}-${dosya.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
    const { data, error } = await supabase.storage.from('images').upload(`sozlesmeler/${dosyaAdi}`, dosya)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  const masrafHesapla = (arac: any) => {
    if (!arac.expenses) return 0
    return arac.expenses.reduce((toplam: number, item: any) => toplam + (item.tutar || 0), 0)
  }

  const aracSil = async (id: number) => {
    if (!confirm('Bu aracı kalıcı olarak silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('cars').delete().eq('id', id)
    if (error) alert('Hata: ' + error.message)
    else setAraclar(araclar.filter(arac => arac.id !== id))
  }

  const satisiTamamla = async () => {
    if (!satisFiyati || !satilacakArac || !satisTarihi) return alert('Lütfen fiyat ve tarih girin!')
    setSatisYukleniyor(true)
    try {
      let sozlesmeUrl = ''
      if (satisSozlesmesi) sozlesmeUrl = await dosyaYukle(satisSozlesmesi)

      const { error } = await supabase.from('cars').update({ 
        durum: 'Satıldı', 
        satis_bedeli: Number(satisFiyati),
        satis_tarihi: satisTarihi,
        satis_sozlesmesi_url: sozlesmeUrl 
      }).eq('id', satilacakArac.id)

      if (error) throw error
      alert('🎉 Satış başarıyla kaydedildi!')
      setSatilacakArac(null); setSatisFiyati(''); setSatisTarihi(''); setSatisSozlesmesi(null); verileriGetir()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSatisYukleniyor(false)
    }
  }

  // --- WHATSAPP PAYLAŞIM FONKSİYONU ---
  const whatsappPaylas = (arac: any) => {
    const bosluk = '%0A' // Satır atlama kodu
    
    // Ekspertiz Raporunu Metne Dökme İşlemi
    let ekspertizMetni = ""
    if (arac.ekspertiz) {
        const parcaIsimleri: any = {
            kaput: 'Kaput', tavan: 'Tavan', bagaj: 'Bagaj',
            sol_on_camurluk: 'Sol Ön Çamurluk', sol_on_kapi: 'Sol Ön Kapı',
            sol_arka_kapi: 'Sol Arka Kapı', sol_arka_camurluk: 'Sol Arka Çamurluk',
            sag_on_camurluk: 'Sağ Ön Çamurluk', sag_on_kapi: 'Sağ Ön Kapı',
            sag_arka_kapi: 'Sağ Arka Kapı', sag_arka_camurluk: 'Sağ Arka Çamurluk'
        }

        let kusurlar = []
        for (const key in arac.ekspertiz) {
            const durum = arac.ekspertiz[key]
            // Eğer parça Orijinal değilse ve verisi varsa listeye ekle
            if (durum && durum !== 'Orijinal' && parcaIsimleri[key]) {
                kusurlar.push(`- ${parcaIsimleri[key]}: *${durum}*`)
            }
        }

        if (kusurlar.length === 0) {
            ekspertizMetni = `✅ *EKSPERTİZ: HATASIZ - BOYASIZ - DEĞİŞENSİZ*`
        } else {
            ekspertizMetni = `⚠️ *EKSPERTİZ DURUMU:*${bosluk}${kusurlar.join(bosluk)}`
        }
    } else {
        ekspertizMetni = "ℹ️ Ekspertiz bilgisi girilmemiştir."
    }

    const mesaj = `Merhaba, Carbay Motors güvencesiyle incelediğiniz araç:${bosluk}${bosluk}` +
                  `🚗 *${arac.marka} ${arac.model}*${bosluk}` +
                  `📅 Yıl: ${arac.yil}${bosluk}` +
                  `⛽ Yakıt: ${arac.yakit}${bosluk}` +
                  `🕹 Vites: ${arac.vites}${bosluk}` +
                  `🛣 KM: ${arac.kilometre.toLocaleString('tr-TR')}${bosluk}` +
                  `🎨 Renk: ${arac.renk || '-'}${bosluk}${bosluk}` +
                  `${ekspertizMetni}${bosluk}${bosluk}` + // Ekspertiz buraya eklendi
                  `💰 *Fiyat: [FİYAT BİLGİSİ GİRİNİZ] TL*${bosluk}${bosluk}` +
                  `📸 Fotoğraf: ${arac.resim_url || 'Mevcut değil'}`

    window.open(`https://wa.me/?text=${mesaj}`, '_blank')
  }

  const filtrelenenAraclar = araclar.filter(arac => {
    const metinUyumu = 
      arac.marka.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      arac.model.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      arac.plaka.toLowerCase().includes(aramaMetni.toLowerCase())
    let durumUyumu = true
    if (filtreDurumu === 'Stokta') durumUyumu = arac.durum !== 'Satıldı'
    else if (filtreDurumu === 'Satıldı') durumUyumu = arac.durum === 'Satıldı'
    return metinUyumu && durumUyumu
  })

  // Hesaplamalar
  const toplamStokMaliyeti = araclar.filter(a => a.durum === 'Stokta').reduce((toplam, arac) => toplam + (arac.alis_fiyati || 0) + masrafHesapla(arac), 0)
  const toplamCiro = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => toplam + (arac.satis_bedeli || 0), 0)
  const toplamKar = araclar.filter(a => a.durum === 'Satıldı').reduce((toplam, arac) => {
      const maliyet = (arac.alis_fiyati || 0) + masrafHesapla(arac)
      return toplam + ((arac.satis_bedeli || 0) - maliyet)
    }, 0)

  if (!oturumVarMi && yukleniyor) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Yükleniyor...</div>

  return (
    <main className="min-h-screen bg-gray-50 pb-32"> 
      
      {/* ÜST MENÜ: SİYAH VE GOLD TEMA */}
      <header className="bg-black text-white shadow-lg sticky top-0 z-10 border-b-4 border-[#FFB700]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <div className="flex flex-col cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="flex items-center text-3xl font-black tracking-tighter">
              <span className="text-[#FFB700]">CAR</span>
              <span className="text-white">BAY</span>
            </div>
            <div className="text-[10px] tracking-[0.4em] text-white/70 font-light -mt-1 ml-1 uppercase">Celil Sevim</div>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
             <button onClick={() => router.push('/musteriler')} className="text-gray-300 hover:text-[#FFB700] px-3 py-2 transition text-sm font-bold flex items-center gap-1">📒 Müşteriler</button>
             <button onClick={() => router.push('/kasa')} className="text-gray-300 hover:text-[#FFB700] px-3 py-2 transition text-sm font-bold flex items-center gap-1">💰 Kasa</button>
             <button onClick={() => router.push('/analiz')} className="text-[#FFB700] border border-[#FFB700] hover:bg-[#FFB700] hover:text-black px-4 py-2.5 rounded-lg font-bold transition text-sm flex items-center gap-2">📊 Analiz</button>
             <button onClick={() => router.push('/arac-ekle')} className="bg-[#FFB700] hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-bold transition shadow-lg flex items-center gap-2 active:scale-95">
              <span>+</span> Yeni Araç
            </button>
            <button onClick={cikisYap} className="text-gray-400 hover:text-white px-3 py-2.5 rounded-lg font-medium transition text-sm">Çıkış</button>
          </div>
        </div>
      </header>

      {/* İÇERİK */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* FİNANSAL TABLO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow border-l-4 border-black">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Stok Maliyeti</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{toplamStokMaliyeti.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border-l-4 border-[#FFB700]">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Toplam Ciro</div>
            <div className="text-3xl font-bold text-[#FFB700] mt-1">{toplamCiro.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-600">
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider">Net Kâr</div>
            <div className={`text-3xl font-bold mt-1 ${toplamKar >= 0 ? 'text-green-600' : 'text-red-600'}`}>{toplamKar.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>

        {/* ARAMA ALANI */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-3 text-gray-400">🔍</span>
            <input type="text" placeholder="Marka, Model veya Plaka..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#FFB700] transition"
              value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
              <button key={durum} onClick={() => setFiltreDurumu(durum)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition ${filtreDurumu === durum ? 'bg-black text-[#FFB700] shadow-sm' : 'text-gray-500 hover:text-black'}`}>
                {durum}
              </button>
            ))}
          </div>
        </div>

        {/* ARAÇ LİSTESİ */}
        {yukleniyor && !araclar.length ? (
          <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filtrelenenAraclar.length === 0 ? <div className="col-span-3 text-center text-gray-400 py-10">Kayıt bulunamadı.</div> : null}
             
             {filtrelenenAraclar.map((arac) => {
                const masrafTutari = masrafHesapla(arac)
                const toplamMaliyet = (arac.alis_fiyati || 0) + masrafTutari
                const netKar = (arac.satis_bedeli || 0) - toplamMaliyet
                const satisGunu = arac.durum === 'Satıldı' && arac.satis_tarihi ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi) : null

                return (
                  <div key={arac.id} className={`bg-white rounded-xl shadow-sm hover:shadow-2xl transition duration-300 overflow-hidden group relative border
                    ${arac.durum === 'Satıldı' ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100'}`}>
                    
                    <div className="relative h-56 bg-gray-900">
                      {arac.resim_url ? (
                        <img src={arac.resim_url} className={`w-full h-full object-cover ${arac.durum === 'Satıldı' ? 'grayscale opacity-70' : ''}`} />
                      ) : (<div className="flex items-center justify-center h-full text-gray-600 text-sm">Resim Yok</div>)}
                      
                      {arac.durum === 'Satıldı' && <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"><span className="border-4 border-[#FFB700] text-[#FFB700] font-black text-4xl -rotate-12 px-6 py-2 rounded-lg tracking-widest shadow-2xl bg-black">SATILDI</span></div>}
                      
                      {satisGunu !== null && (
                        <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-md z-10">
                          ⏱️ {satisGunu} Günde
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-[#FFB700] text-black px-3 py-1 rounded-md text-xs font-bold shadow-sm">{arac.yil}</div>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 leading-tight">{arac.marka} {arac.model}</h3>
                          <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">{arac.plaka}</p>
                        </div>
                        
                        <div className="flex gap-1 flex-wrap">
                          {arac.durum !== 'Satıldı' && (
                            <button onClick={() => { setSatilacakArac(arac); setSatisTarihi(new Date().toISOString().split('T')[0]) }} className="bg-green-100 hover:bg-green-600 hover:text-white text-green-700 p-2 rounded-lg transition" title="Sat">💰</button>
                          )}
                          <button onClick={() => { setSozlesmeArac(arac); setAktifSekme('alis') }} className="bg-orange-100 hover:bg-orange-500 hover:text-white text-orange-700 p-2 rounded-lg transition" title="Sözleşmeler">📂</button>
                          
                          {/* --- WHATSAPP BUTONU --- */}
                          <button onClick={() => whatsappPaylas(arac)} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition" title="WhatsApp ile Paylaş">📲</button>
                          
                          <button onClick={() => window.open(`/arac-vitrin/${arac.id}`, '_blank')} className="bg-gray-100 hover:bg-black hover:text-[#FFB700] text-gray-600 p-2 rounded-lg transition" title="Yazdır">🖨️</button>
                          <button onClick={() => router.push(`/arac-duzenle/${arac.id}`)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 p-2 rounded-lg transition" title="Düzenle">✏️</button>
                          <button onClick={() => aracSil(arac.id)} className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 p-2 rounded-lg transition" title="Sil">🗑️</button>
                        </div>
                      </div>

                      {masrafTutari > 0 && <div className="mb-3 text-xs flex items-center gap-1 text-red-600 font-bold bg-red-50 border border-red-100 px-2 py-1 rounded w-fit">🛠️ {masrafTutari.toLocaleString('tr-TR')} TL Masraf</div>}
                      
                      <div className="flex gap-2 mb-4 mt-2 text-xs font-medium text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">{arac.yakit}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">{arac.vites}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">{arac.kilometre.toLocaleString('tr-TR')} KM</span>
                      </div>

                      <div className="border-t border-gray-200 pt-4">
                        {arac.durum === 'Satıldı' ? (
                          <div className="flex justify-between items-center">
                             <div><div className="text-[10px] text-gray-400 font-bold uppercase">Net Kâr</div><div className={`text-xl font-black ${netKar >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netKar.toLocaleString('tr-TR')} ₺</div></div>
                             <div className="text-right"><div className="text-[10px] text-gray-400 uppercase">Satış Rakamı</div><div className="font-bold text-gray-900">{arac.satis_bedeli?.toLocaleString('tr-TR')} ₺</div></div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div><div className="text-[10px] text-gray-400 font-bold uppercase">Toplam Maliyet</div><div className="text-lg font-bold text-gray-900">{toplamMaliyet.toLocaleString('tr-TR')} ₺</div></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* MOBİL ALT MENÜ (YENİLENMİŞ TASARIM) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-black/90 backdrop-blur-md border-t border-white/10 flex justify-around items-center z-50 shadow-2xl pb-safe-area-inset-bottom transition-all">
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700] active:scale-110 transition-all p-2">
          <span className="text-2xl">🏠</span><span className="text-[10px] font-bold">Garaj</span>
        </button>
        <button onClick={() => router.push('/musteriler')} className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700] active:scale-110 transition-all p-2">
          <span className="text-2xl">📒</span><span className="text-[10px] font-bold">Müşteri</span>
        </button>
        
        {/* ORTA EKLE BUTONU (VURGULU) */}
        <div className="relative">
           <button onClick={() => router.push('/arac-ekle')} className="absolute left-1/2 -translate-x-1/2 -top-10 bg-[#FFB700] text-black p-4 rounded-full shadow-[0_0_25px_rgba(255,183,0,0.6)] border-[3px] border-black active:scale-95 active:shadow-[0_0_10px_rgba(255,183,0,0.4)] transition-all transform hover:bg-yellow-400 flex items-center justify-center z-50">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
        </div>

        <button onClick={() => router.push('/kasa')} className="flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700] active:scale-110 transition-all p-2">
          <span className="text-2xl">💰</span><span className="text-[10px] font-bold">Kasa</span>
        </button>
      </nav>

      {/* SÖZLEŞMELER PENCERESİ */}
      {sozlesmeArac && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-black text-white flex justify-between items-center border-b border-[#FFB700]">
              <div><h3 className="font-bold text-[#FFB700]">Sözleşme Dosyaları</h3><p className="text-xs text-gray-400">{sozlesmeArac.marka} {sozlesmeArac.model}</p></div>
              <button onClick={() => setSozlesmeArac(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            <div className="flex border-b border-gray-200">
              <button onClick={() => setAktifSekme('alis')} className={`flex-1 py-3 font-bold text-sm transition ${aktifSekme === 'alis' ? 'border-b-4 border-[#FFB700] text-black bg-yellow-50' : 'text-gray-400'}`}>📥 Alış Sözleşmesi</button>
              <button onClick={() => setAktifSekme('satis')} className={`flex-1 py-3 font-bold text-sm transition ${aktifSekme === 'satis' ? 'border-b-4 border-[#FFB700] text-black bg-yellow-50' : 'text-gray-400'}`}>📤 Satış Sözleşmesi</button>
            </div>
            <div className="flex-1 p-6 bg-gray-50 overflow-auto flex items-center justify-center">
              {aktifSekme === 'alis' && (sozlesmeArac.sozlesme_url ? <img src={sozlesmeArac.sozlesme_url} className="max-w-full max-h-full shadow-lg border" /> : <div className="text-gray-400 text-center"><span className="text-4xl block mb-2">📂</span>Dosya Yok</div>)}
              {aktifSekme === 'satis' && (sozlesmeArac.satis_sozlesmesi_url ? <img src={sozlesmeArac.satis_sozlesmesi_url} className="max-w-full max-h-full shadow-lg border" /> : <div className="text-gray-400 text-center"><span className="text-4xl block mb-2">📂</span>Dosya Yok</div>)}
            </div>
            <div className="p-4 bg-white border-t text-center">
               {(aktifSekme === 'alis' && sozlesmeArac.sozlesme_url) || (aktifSekme === 'satis' && sozlesmeArac.satis_sozlesmesi_url) ? 
                 <button onClick={() => window.open(aktifSekme === 'alis' ? sozlesmeArac.sozlesme_url : sozlesmeArac.satis_sozlesmesi_url, '_blank')} className="text-black underline text-sm font-bold hover:text-[#FFB700]">Tam Ekran Aç ↗</button> : null}
            </div>
          </div>
        </div>
      )}

      {/* SATIŞ MODALI */}
      {satilacakArac && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Satış Onayı</h3>
              <div className="w-16 h-1 bg-[#FFB700] mx-auto mt-2"></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Satış Fiyatı (TL)</label>
              <input type="number" autoFocus value={satisFiyati} onChange={(e) => setSatisFiyati(e.target.value)} className="w-full text-3xl font-black text-gray-900 border-b-2 border-gray-200 focus:border-[#FFB700] outline-none py-2 bg-transparent" placeholder="0" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Satış Tarihi</label>
              <input type="date" value={satisTarihi} onChange={(e) => setSatisTarihi(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50" />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Satış Sözleşmesi</label>
              <input type="file" accept="image/*" onChange={(e) => setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSatilacakArac(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">İptal</button>
              <button onClick={satisiTamamla} disabled={satisYukleniyor} className="flex-1 py-3 bg-[#FFB700] text-black font-bold rounded-lg hover:bg-yellow-400 shadow-lg">{satisYukleniyor ? '...' : 'Satışı Tamamla'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}