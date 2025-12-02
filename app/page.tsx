'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [araclar, setAraclar] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  
  // Arama ve Filtre
  const [aramaMetni, setAramaMetni] = useState('')
  const [filtreDurumu, setFiltreDurumu] = useState('Hepsi') 
  const [oturumVarMi, setOturumVarMi] = useState(false)

  // Modallar
  const [satilacakArac, setSatilacakArac] = useState<any>(null)
  const [satisFiyati, setSatisFiyati] = useState('')
  const [satisTarihi, setSatisTarihi] = useState('') 
  const [satisSozlesmesi, setSatisSozlesmesi] = useState<File | null>(null)
  const [satisYukleniyor, setSatisYukleniyor] = useState(false)
  const [sozlesmeArac, setSozlesmeArac] = useState<any>(null)
  const [aktifSekme, setAktifSekme] = useState<'alis' | 'satis'>('alis')

  useEffect(() => {
    async function oturumKontrol() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
      else {
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
    
    if (error) console.error(error)
    else setAraclar(data || [])
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
    if (!satisFiyati || !satilacakArac || !satisTarihi) return alert('Lütfen bilgileri doldurun!')
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
      alert('🎉 Satış kaydedildi.')
      setSatilacakArac(null); setSatisFiyati(''); setSatisTarihi(''); setSatisSozlesmesi(null); verileriGetir()
    } catch (error: any) { alert('Hata: ' + error.message) } 
    finally { setSatisYukleniyor(false) }
  }

  // WhatsApp Paylaşım
  const whatsappPaylas = (arac: any) => {
    const bosluk = '%0A'
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
            if (durum && durum !== 'Orijinal' && parcaIsimleri[key]) {
                kusurlar.push(`- ${parcaIsimleri[key]}: *${durum}*`)
            }
        }
        if (kusurlar.length === 0) ekspertizMetni = `✅ *EKSPERTİZ: HATASIZ - BOYASIZ*`
        else ekspertizMetni = `⚠️ *EKSPERTİZ DURUMU:*${bosluk}${kusurlar.join(bosluk)}`
    } else ekspertizMetni = "ℹ️ Ekspertiz girilmemiş."

    const mesaj = `Merhaba, Carbay Motors güvencesiyle:${bosluk}${bosluk}🚗 *${arac.marka} ${arac.model}*${bosluk}📅 ${arac.yil} | 🛣 ${arac.kilometre} KM${bosluk}${ekspertizMetni}${bosluk}${bosluk}📸 Fotoğraf: ${arac.resim_url || 'Yok'}`
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

  if (!oturumVarMi && yukleniyor) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>

  return (
    <main className="min-h-screen bg-gray-50 pb-28"> 
      
      {/* ÜST MENÜ: Siyah & Gold */}
      <header className="bg-black text-white shadow-lg sticky top-0 z-10 border-b-4 border-[#FFB700]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex flex-col cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="flex items-center text-3xl font-black tracking-tighter">
              <span className="text-[#FFB700]">CAR</span><span className="text-white">BAY</span>
            </div>
            <div className="text-[10px] tracking-[0.4em] text-white/70 font-light -mt-1 ml-1 uppercase">Celil Sevim</div>
          </div>
          
          {/* Masaüstü Butonlar */}
          <div className="hidden md:flex items-center gap-3">
             <button onClick={() => router.push('/musteriler')} className="text-gray-300 hover:text-[#FFB700] px-3 py-2 font-bold flex items-center gap-1">📒 Müşteriler</button>
             <button onClick={() => router.push('/kasa')} className="text-gray-300 hover:text-[#FFB700] px-3 py-2 font-bold flex items-center gap-1">💰 Kasa</button>
             <button onClick={() => router.push('/arac-ekle')} className="bg-[#FFB700] hover:bg-yellow-400 text-black px-6 py-2.5 rounded-lg font-bold shadow-lg active:scale-95"><span>+</span> Yeni Araç</button>
             <button onClick={cikisYap} className="text-gray-400 hover:text-white px-3 py-2.5 font-medium text-sm">Çıkış</button>
          </div>
        </div>
      </header>

      {/* İÇERİK */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* FİNANSAL KARTLAR (DÜZGÜN BEYAZ KARTLAR) */}
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

        {/* ARAMA VE FİLTRE */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <input type="text" placeholder="Marka, Model veya Plaka..." 
            className="w-full md:w-96 border p-3 rounded-lg outline-none focus:ring-2 focus:ring-[#FFB700]"
            value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)} />
          
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            {['Hepsi', 'Stokta', 'Satıldı'].map((durum) => (
              <button key={durum} onClick={() => setFiltreDurumu(durum)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition ${filtreDurumu === durum ? 'bg-black text-[#FFB700] shadow' : 'text-gray-500'}`}>
                {durum}
              </button>
            ))}
          </div>
        </div>

        {/* ARAÇ LİSTESİ */}
        {yukleniyor && !araclar.length ? (
          <div className="text-center py-20 text-gray-500">Listeleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filtrelenenAraclar.length === 0 ? <div className="col-span-3 text-center text-gray-400 py-10">Araç bulunamadı.</div> : null}
             
             {filtrelenenAraclar.map((arac) => {
                const masrafTutari = masrafHesapla(arac)
                const toplamMaliyet = (arac.alis_fiyati || 0) + masrafTutari
                const netKar = (arac.satis_bedeli || 0) - toplamMaliyet
                const satisGunu = arac.durum === 'Satıldı' && arac.satis_tarihi ? gunFarkiHesapla(arac.alis_tarihi, arac.satis_tarihi) : null

                return (
                  <div key={arac.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition overflow-hidden border ${arac.durum === 'Satıldı' ? 'border-green-500' : 'border-gray-100'}`}>
                    <div className="relative h-56 bg-gray-200">
                      {arac.resim_url ? <img src={arac.resim_url} className={`w-full h-full object-cover ${arac.durum === 'Satıldı' ? 'grayscale opacity-70' : ''}`} /> : <div className="flex items-center justify-center h-full text-gray-400">Resim Yok</div>}
                      {arac.durum === 'Satıldı' && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="border-4 border-[#FFB700] text-[#FFB700] font-black text-3xl -rotate-12 px-4 py-1 rounded bg-black">SATILDI</span></div>}
                      {satisGunu !== null && <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">⏱️ {satisGunu} Günde</div>}
                      <div className="absolute top-2 right-2 bg-[#FFB700] text-black px-2 py-1 rounded text-xs font-bold">{arac.yil}</div>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{arac.marka} {arac.model}</h3>
                          <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block">{arac.plaka}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {arac.durum !== 'Satıldı' && <button onClick={() => { setSatilacakArac(arac); setSatisTarihi(new Date().toISOString().split('T')[0]) }} className="bg-green-100 text-green-700 p-2 rounded hover:bg-green-200" title="Sat">💰</button>}
                          <button onClick={() => { setSozlesmeArac(arac); setAktifSekme('alis') }} className="bg-orange-100 text-orange-700 p-2 rounded hover:bg-orange-200" title="Sözleşmeler">📂</button>
                          <button onClick={() => whatsappPaylas(arac)} className="bg-green-500 text-white p-2 rounded hover:bg-green-600" title="WhatsApp">📲</button>
                          <button onClick={() => window.open(`/arac-vitrin/${arac.id}`, '_blank')} className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200" title="Yazdır">🖨️</button>
                          <button onClick={() => router.push(`/arac-duzenle/${arac.id}`)} className="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100" title="Düzenle">✏️</button>
                          <button onClick={() => aracSil(arac.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100" title="Sil">🗑️</button>
                        </div>
                      </div>

                      {masrafTutari > 0 && <div className="mb-3 text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded w-fit">🛠️ {masrafTutari.toLocaleString('tr-TR')} TL Masraf</div>}
                      
                      <div className="flex gap-2 mb-4 text-xs font-medium text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">{arac.yakit}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">{arac.vites}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">{arac.kilometre.toLocaleString('tr-TR')} KM</span>
                      </div>

                      <div className="border-t pt-3">
                        {arac.durum === 'Satıldı' ? (
                          <div className="flex justify-between items-center">
                             <div><div className="text-[10px] text-gray-400 font-bold uppercase">Net Kâr</div><div className={`text-xl font-black ${netKar >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netKar.toLocaleString('tr-TR')} ₺</div></div>
                             <div className="text-right"><div className="text-[10px] text-gray-400 uppercase">Satış</div><div className="font-bold text-gray-900">{arac.satis_bedeli?.toLocaleString('tr-TR')} ₺</div></div>
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

      {/* --- MOBİL ALT MENÜ (DÜZELTİLMİŞ & HİZALANMIŞ) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-[70px] bg-black border-t-2 border-[#FFB700] flex justify-around items-center z-50 shadow-2xl pb-1">
        
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center justify-center w-16 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700]">
          <span className="text-xl mb-1">🏠</span>
          <span className="text-[10px] font-bold">Garaj</span>
        </button>

        <button onClick={() => router.push('/musteriler')} className="flex flex-col items-center justify-center w-16 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700]">
          <span className="text-xl mb-1">📒</span>
          <span className="text-[10px] font-bold">Müşteri</span>
        </button>
        
        {/* ORTA EKLE BUTONU (DÜZELTİLDİ: YUKARI TAŞMA VE HİZALAMA) */}
        <div className="relative -top-6">
           <button onClick={() => router.push('/arac-ekle')} 
             className="w-16 h-16 bg-[#FFB700] rounded-full shadow-[0_0_15px_rgba(255,183,0,0.6)] border-4 border-black flex items-center justify-center transform active:scale-95 transition-all text-black">
             <span className="text-3xl font-bold mb-1">+</span>
          </button>
        </div>

        <button onClick={() => router.push('/kasa')} className="flex flex-col items-center justify-center w-16 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700]">
          <span className="text-xl mb-1">💰</span>
          <span className="text-[10px] font-bold">Kasa</span>
        </button>

        <button onClick={() => router.push('/analiz')} className="flex flex-col items-center justify-center w-16 text-gray-400 hover:text-[#FFB700] active:text-[#FFB700]">
          <span className="text-xl mb-1">📊</span>
          <span className="text-[10px] font-bold">Analiz</span>
        </button>

      </nav>

      {/* SÖZLEŞMELER PENCERESİ */}
      {sozlesmeArac && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-black text-white flex justify-between items-center border-b border-[#FFB700]">
              <div><h3 className="font-bold text-[#FFB700]">Dosyalar</h3><p className="text-xs text-gray-400">{sozlesmeArac.marka}</p></div>
              <button onClick={() => setSozlesmeArac(null)} className="text-2xl">✕</button>
            </div>
            <div className="flex border-b">
              <button onClick={() => setAktifSekme('alis')} className={`flex-1 py-3 font-bold text-sm ${aktifSekme === 'alis' ? 'bg-yellow-100 text-black border-b-4 border-[#FFB700]' : 'text-gray-500'}`}>📥 Alış</button>
              <button onClick={() => setAktifSekme('satis')} className={`flex-1 py-3 font-bold text-sm ${aktifSekme === 'satis' ? 'bg-yellow-100 text-black border-b-4 border-[#FFB700]' : 'text-gray-500'}`}>📤 Satış</button>
            </div>
            <div className="flex-1 p-6 bg-gray-100 overflow-auto flex items-center justify-center">
              {aktifSekme === 'alis' && (sozlesmeArac.sozlesme_url ? <img src={sozlesmeArac.sozlesme_url} className="max-w-full shadow-lg" /> : <p className="text-gray-400">Dosya Yok</p>)}
              {aktifSekme === 'satis' && (sozlesmeArac.satis_sozlesmesi_url ? <img src={sozlesmeArac.satis_sozlesmesi_url} className="max-w-full shadow-lg" /> : <p className="text-gray-400">Dosya Yok</p>)}
            </div>
            <div className="p-4 bg-white border-t text-center">
               {(aktifSekme === 'alis' && sozlesmeArac.sozlesme_url) || (aktifSekme === 'satis' && sozlesmeArac.satis_sozlesmesi_url) ? 
                 <button onClick={() => window.open(aktifSekme === 'alis' ? sozlesmeArac.sozlesme_url : sozlesmeArac.satis_sozlesmesi_url, '_blank')} className="text-black underline font-bold">Tam Ekran Aç</button> : null}
            </div>
          </div>
        </div>
      )}

      {/* SATIŞ MODALI */}
      {satilacakArac && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-center mb-4">SATIŞ ONAYI</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-gray-500">Fiyat (TL)</label><input type="number" autoFocus value={satisFiyati} onChange={(e) => setSatisFiyati(e.target.value)} className="w-full text-2xl font-black border-b-2 border-[#FFB700] outline-none" /></div>
              <div><label className="text-xs font-bold text-gray-500">Tarih</label><input type="date" value={satisTarihi} onChange={(e) => setSatisTarihi(e.target.value)} className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold text-gray-500">Sözleşme</label><input type="file" onChange={(e) => setSatisSozlesmesi(e.target.files ? e.target.files[0] : null)} className="w-full text-sm" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSatilacakArac(null)} className="flex-1 py-3 bg-gray-200 rounded font-bold">İptal</button>
              <button onClick={satisiTamamla} disabled={satisYukleniyor} className="flex-1 py-3 bg-[#FFB700] text-black font-bold rounded shadow-lg">{satisYukleniyor ? '...' : 'ONAYLA'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}