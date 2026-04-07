import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// Configuración de Firebase (Tuya)
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
  const [coupon, setCoupon] = useState("");
  const [appliedPrice, setAppliedPrice] = useState(199);

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // Cargar historial
        const q = query(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid, 'scans'), orderBy('timestamp', 'desc'), limit(15));
        onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({id: d.id, ...d.data()}))));

        // Verificar contador de uso y status premium en Firestore
        const userDocRef = doc(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUsage(userDoc.data().scanCount || 0);
          setIsPremium(userDoc.data().isPremium || false);
        } else {
          await setDoc(userDocRef, { scanCount: 0, isPremium: false });
        }
      } else { signInAnonymously(auth); }
    });
    return () => unsubAuth();
  }, []);

  const analyzeImage = async (base64, type) => {
    if (!isPremium && usage >= 3) {
      setTab('pay');
      alert("¡Has agotado tus 3 pruebas gratuitas! Adquiere el plan anual para continuar.");
      return;
    }

    setLoading(true);
    setResult(null);
    const prompt = `Analiza ingredientes según NOM-051 México. Si alguno de estos (Azúcar, Jarabes, Maltodextrina, Jugos concentrados, terminados en -osa) está en los PRIMEROS 3 ingredientes, responde NO SE PUEDE. Responde JSON: {"productName": string, "verdict": "SÍ SE PUEDE" | "NO SE PUEDE", "foundBadIngredients": [string], "explanation": string}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
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
        const userDocRef = doc(db, 'artifacts', 'sugar-scanner-piki', 'users', user.uid);
        await updateDoc(userDocRef, { scanCount: increment(1) });
        setUsage(prev => prev + 1);
      }
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'LUISA149') {
      setAppliedPrice(149);
      alert("¡Cupón aplicado! Precio especial para comunidad Luisa activado.");
    } else { alert("Cupón no válido"); }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-slate-100 font-sans pb-28">
      {/* HEADER CENTRADO */}
      <header className="p-8 text-center bg-[#1a1a1a]">
        <h1 className="text-4xl font-black text-green-500 mb-2 tracking-tight">Sugar Scanner</h1>
        <div className="flex flex-col gap-1 items-center">
          <a href="https://www.instagram.com/vivosinazucar/" target="_blank" className="text-blue-400 font-bold hover:underline">Por: @vivosinazucar</a>
          <a href="http://wa.me/523312077909" target="_blank" className="text-green-400 text-sm font-medium border-b border-green-800 pb-1 mt-2">Click aquí para una cita con Luisa 🗓️</a>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* SCANNER */}
        {tab === 'scanner' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Límite de uso */}
            {!isPremium && (
              <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded-xl text-center text-xs">
                Escaneos gratuitos restantes: <span className="font-bold text-blue-400">{3 - usage > 0 ? 3 - usage : 0}</span>
              </div>
            )}

            <div className="bg-[#2a2a2a] border border-gray-700 rounded-3xl p-10 text-center shadow-2xl">
              <div className="text-6xl mb-6">📸</div>
              <label className="bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-black cursor-pointer transition-all inline-block shadow-lg active:scale-95">
                {loading ? "ANALIZANDO..." : "ESCANEAR ETIQUETA"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files[0];
                  const r = new FileReader();
                  r.onloadend = () => analyzeImage(r.result.split(',')[1], f.type);
                  r.readAsDataURL(f);
                }} />
              </label>
            </div>

            {result && (
              <div className={`p-8 rounded-3xl border-2 bg-white shadow-xl ${result.verdict === 'SÍ SE PUEDE' ? 'border-green-400' : 'border-red-400'}`}>
                <h2 className={`text-2xl font-black mb-2 flex items-center gap-2 ${result.verdict === 'SÍ SE PUEDE' ? 'text-green-600' : 'text-red-600'}`}>
                  {result.verdict === 'SÍ SE PUEDE' ? '😎 ¡SÍ SE PUEDE!' : '❌ NO SE PUEDE'}
                </h2>
                <p className="text-lg font-bold text-slate-800">{result.productName}</p>
                <p className="text-sm text-slate-600 my-4 leading-relaxed">{result.explanation}</p>
                <a href="https://www.amazon.com.mx/dp/B0DNX9CVVK" target="_blank" className="block mt-4 bg-orange-100 text-orange-700 p-4 rounded-xl text-center border border-orange-200 font-bold">
                  📖 ¿No sabes qué comer? Mira mi recetario
                </a>
              </div>
            )}
          </div>
        )}

        {/* HISTORIAL */}
        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Mis Revisiones</h2>
            {history.map((h) => (
              <div key={h.id} className="bg-[#2a2a2a] p-4 rounded-2xl border border-gray-800 flex items-center gap-4">
                <img src={h.imageUri} className="w-14 h-14 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="font-bold text-sm truncate w-40">{h.productName}</p>
                  <p className={`text-[10px] font-black ${h.verdict.includes('SÍ') ? 'text-green-400' : 'text-red-400'}`}>{h.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PREMIUM */}
        {tab === 'pay' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl text-slate-900 shadow-2xl border-t-8 border-green-500">
              <h2 className="text-2xl font-black text-center mb-2">Acceso Anual</h2>
              <p className="text-center text-slate-500 text-sm mb-6">Escaneos ilimitados por un año completo</p>
              
              <p className="text-5xl font-black text-center mb-8">${appliedPrice}<span className="text-lg font-normal">MXN</span></p>
              
              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Código WhatsApp" value={coupon} onChange={(e)=>setCoupon(e.target.value)} className="flex-1 bg-slate-100 px-4 py-3 rounded-xl text-sm border-none focus:ring-2 focus:ring-green-500" />
                <button onClick={applyCoupon} className="bg-slate-800 text-white px-4 rounded-xl font-bold text-xs">Aplicar</button>
              </div>

              <button className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
                ACTIVAR SUSCRIPCIÓN
              </button>
            </div>
          </div>
        )}
      </main>

      {/* NAV INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-[#1a1a1a]/95 backdrop-blur-md border-t border-gray-800 flex justify-around p-4">
        <button onClick={() => setTab('scanner')} className={`flex flex-col items-center ${tab === 'scanner' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-2xl">🔍</span><span className="text-[10px] font-bold">Scanner</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex flex-col items-center ${tab === 'history' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-2xl">📜</span><span className="text-[10px] font-bold">Historial</span>
        </button>
        <button onClick={() => setTab('pay')} className={`flex flex-col items-center ${tab === 'pay' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-2xl">💎</span><span className="text-[10px] font-bold">Premium</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
