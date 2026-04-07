import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// 1. Configuración de Firebase (Se mantiene igual)
const firebaseConfig = {
  apiKey: "AIzaSyAsOVe0tGXGUOUAnYE65N6RVLIIeqndAiQ",
  authDomain: "sugar-scanner-piki.firebaseapp.com",
  projectId: "sugar-scanner-piki",
  storageBucket: "sugar-scanner-piki.firebasestorage.app",
  messagingSenderId: "874023944542",
  appId: "1:874023944542:web:0d787daaf584113dc0cfcf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function App() {
  const [tab, setTab] = useState('scanner');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [usage, setUsage] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const q = query(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid, 'scans'), orderBy('timestamp', 'desc'), limit(10));
        onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const userDoc = await getDoc(doc(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid));
        if (userDoc.exists()) {
          setUsage(userDoc.data().scanCount || 0);
          setIsPremium(userDoc.data().isPremium || false);
        }
      } else { signInAnonymously(auth); }
    });
    return () => unsubAuth();
  }, []);

  const analyzeImage = async (base64, type) => {
    if (!isPremium && usage >= 3) { setTab('pay'); return; }
    setLoading(true);
    const prompt = `Analiza ingredientes según NOM-051 México. Detecta cualquier azúcar añadida en los PRIMEROS 3 ingredientes (incluyendo jarabes, concentrados y almidones). Responde JSON: {"productName": string, "verdict": "SÍ SE PUEDE" | "NO SE PUEDE", "explanation": string}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: type, data: base64 } }] }] })
      });
      const data = await res.json();
      const cleanJson = JSON.parse(data.candidates[0].content.parts[0].text.match(/\{[\s\S]*\}/)[0]);
      const scanData = { ...cleanJson, timestamp: Date.now(), imageUri: `data:${type};base64,${base64}` };
      setResult(scanData);
      if (user) {
        await addDoc(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', user.uid, 'scans'), scanData);
        await updateDoc(doc(db, 'artifacts', 'sugar-scanner-piki', 'users', user.uid), { scanCount: increment(1) });
        setUsage(prev => prev + 1);
      }
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="bg-[#f8f5fb] min-h-screen text-[#2e2e32] font-sans pb-32">
      {/* Header Estilo Vitality */}
      <header className="bg-white flex items-center justify-between px-6 py-4 w-full h-16 fixed top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#176a21]">nutrition</span>
          <span className="text-[#176a21] font-bold text-lg tracking-tighter">Vitality</span>
        </div>
        <a href="https://instagram.com/vivosinazucar" target="_blank" className="text-sm text-zinc-500 font-medium">@vivosinazucar</a>
      </header>

      <main className="pt-20 px-6 max-w-2xl mx-auto space-y-8">
        {/* Alerta de Límite */}
        {!isPremium && usage >= 3 && (
          <div className="bg-[#ffc3bd] text-[#940010] px-6 py-4 rounded-lg flex items-center gap-4 shadow-sm">
            <span className="material-symbols-outlined">warning</span>
            <p className="text-sm font-semibold">Límite alcanzado hoy. <span onClick={() => setTab('pay')} className="underline cursor-pointer">Pásate a Premium</span>.</p>
          </div>
        )}

        {tab === 'scanner' && (
          <>
            {/* Hero Scanner */}
            <section className="bg-white rounded-xl p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#176a21] text-5xl">barcode_scanner</span>
                </div>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Analiza tu compra</h2>
                  <p className="text-zinc-500 mt-2">Escanea la lista de ingredientes según la NOM-051.</p>
                </div>
                <label className="w-full bg-gradient-to-br from-[#176a21] to-[#025d16] text-white font-bold py-5 px-8 rounded-full shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined">photo_camera</span>
                  {loading ? "ANALIZANDO..." : "ESCANEAR ETIQUETA"}
                  <input type="file" accept="image/*" className="hidden" disabled={!isPremium && usage >= 3} onChange={(e) => {
                    const f = e.target.files[0];
                    const r = new FileReader();
                    r.onloadend = () => analyzeImage(r.result.split(',')[1], f.type);
                    r.readAsDataURL(f);
                  }} />
                </label>
              </div>
            </section>

            {/* Resultado */}
            {result && (
              <div className={`p-6 rounded-xl border-l-8 shadow-sm bg-white ${result.verdict.includes('SÍ') ? 'border-green-500' : 'border-red-500'}`}>
                <span className={`font-bold text-sm tracking-widest uppercase ${result.verdict.includes('SÍ') ? 'text-green-600' : 'text-red-600'}`}>
                  VEREDICTO VITALITY
                </span>
                <h3 className={`text-4xl font-extrabold mb-2 ${result.verdict.includes('SÍ') ? 'text-green-600' : 'text-red-600'}`}>
                  {result.verdict}
                </h3>
                <p className="text-zinc-800 font-bold mb-1">{result.productName}</p>
                <p className="text-zinc-600 leading-relaxed">{result.explanation}</p>
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-400">Escaneos Recientes</h2>
            {history.map(h => (
              <div key={h.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
                <img src={h.imageUri} className="w-16 h-16 object-cover rounded-lg" alt="scan" />
                <div>
                  <p className="font-bold text-sm truncate w-40">{h.productName}</p>
                  <p className={`text-xs font-black ${h.verdict.includes('SÍ') ? 'text-green-600' : 'text-red-600'}`}>{h.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Amazon Promo */}
        <section className="bg-orange-50 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 border border-orange-100">
          <div className="w-24 h-36 bg-white shadow-xl rounded flex-shrink-0 transform -rotate-3 overflow-hidden">
            <img src="https://m.media-amazon.com/images/I/71-331B27vL._SY522_.jpg" className="w-full h-full object-cover" alt="Libro Luisa" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <h3 className="text-xl font-extrabold text-orange-900">📙 Recetario de Luisa</h3>
            <p className="text-orange-800/80 text-sm">Aprende a cocinar sin azúcar con la guía de la experta.</p>
            <a href="https://www.amazon.com.mx/dp/B0DNX9CVVK" target="_blank" className="bg-orange-600 text-white font-bold py-2 px-6 rounded-full inline-flex items-center gap-2 text-sm">
              Ver en Amazon <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>
        </section>
      </main>

      {/* Nav de Vitality */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-xl shadow-lg rounded-t-[2.5rem]">
        <button onClick={() => setTab('scanner')} className={`flex flex-col items-center px-6 py-2 rounded-full ${tab === 'scanner' ? 'bg-green-100 text-[#176a21]' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined">barcode_scanner</span>
          <span className="font-bold text-[11px]">Scanner</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex flex-col items-center px-6 py-2 ${tab === 'history' ? 'text-[#176a21]' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined">history</span>
          <span className="font-bold text-[11px]">Historial</span>
        </button>
        <button onClick={() => setTab('pay')} className={`flex flex-col items-center px-6 py-2 ${tab === 'pay' ? 'text-[#176a21]' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined">workspace_premium</span>
          <span className="font-bold text-[11px]">Premium</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
