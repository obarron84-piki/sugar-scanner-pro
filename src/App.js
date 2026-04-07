import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// Configuración de Firebase
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
  const MP_PUBLIC_KEY = "TEST-3c315b72-21a9-4672-ba6a-e62e57f17009"; // Tu clave de prueba

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const q = query(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid, 'scans'), orderBy('timestamp', 'desc'), limit(15));
        onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({id: d.id, ...d.data()}))));

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

  // FUNCIÓN DE PAGO INTEGRADA
  const handlePayment = () => {
    // Definimos los links manuales que creaste en MP
    const LINK_PUBLICO = "TU_LINK_DE_199_AQUI";
    const LINK_CUPON = "TU_LINK_DE_149_AQUI";

    // Si el precio aplicado es 149, usamos el link de descuento
    const urlFinal = appliedPrice === 149 ? LINK_CUPON : LINK_PUBLICO;

    // Redirigimos al usuario a Mercado Pago
    window.location.href = urlFinal;
  };
      
    } catch (error) {
      console.error("Error en MP:", error);
    }
    setLoading(false);
  };

  const analyzeImage = async (base64, type) => {
    if (!isPremium && usage >= 3) {
      setTab('pay');
      return;
    }
    setLoading(true);
    setResult(null);
    const prompt = `Analiza ingredientes según NOM-051 México. Si alguno de estos (Azúcar, Jarabes, Maltodextrina, Jugos concentrados, terminados en -osa) está en los PRIMEROS 3 ingredientes, responde NO SE PUEDE. Responde JSON estricto: {"productName": string, "verdict": "SÍ SE PUEDE" | "NO SE PUEDE", "foundBadIngredients": [string], "explanation": string}`;

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
      alert("¡Cupón aplicado!");
    } else { alert("Cupón no válido"); }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-slate-100 font-sans pb-28">
      {/* HEADER */}
      <header className="p-8 text-center">
        <h1 className="text-4xl font-black text-green-500 mb-2">Sugar Scanner</h1>
        <div className="flex flex-col gap-1 items-center">
          <a href="https://www.instagram.com/vivosinazucar/" target="_blank" className="text-blue-400 font-bold">Por: @vivosinazucar</a>
          <a href="http://wa.me/523312077909" target="_blank" className="text-green-400 text-sm mt-2 border-b border-green-900">Click aquí para una cita con Luisa 🗓️</a>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {tab === 'scanner' && (
          <div className="space-y-6">
            {!isPremium && usage >= 3 && (
              <div className="bg-red-900/40 border border-red-500 p-4 rounded-2xl text-center animate-bounce">
                <p className="font-bold text-sm text-red-200">⚠️ Límite gratuito alcanzado</p>
                <button onClick={()=>setTab('pay')} className="text-xs underline text-white mt-1">Obtén acceso anual aquí</button>
              </div>
            )}
            
            <div className="bg-[#2a2a2a] border border-gray-800 rounded-3xl p-10 text-center shadow-2xl">
              <div className="text-6xl mb-6">📸</div>
              <label className="bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-black cursor-pointer transition-all inline-block shadow-lg">
                {loading ? "PROCESANDO..." : "ESCANEAR ETIQUETA"}
                <input type="file" accept="image/*" className="hidden" disabled={!isPremium && usage >= 3} onChange={(e) => {
                  const f = e.target.files[0];
                  const r = new FileReader();
                  r.onloadend = () => analyzeImage(r.result.split(',')[1], f.type);
                  r.readAsDataURL(f);
                }} />
              </label>
            </div>

            {result && (
              <div className={`p-8 rounded-3xl border-2 bg-white shadow-xl ${result.verdict.includes('SÍ') ? 'border-green-400' : 'border-red-400'}`}>
                <h2 className={`text-2xl font-black mb-2 ${result.verdict.includes('SÍ') ? 'text-green-600' : 'text-red-600'}`}>
                  {result.verdict.includes('SÍ') ? '😎 SÍ SE PUEDE' : '❌ NO SE PUEDE'}
                </h2>
                <p className="text-slate-800 font-bold mb-2">{result.productName}</p>
                <p className="text-xs text-slate-500 mb-4 italic">Detectado: {result.foundBadIngredients.join(', ')}</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">{result.explanation}</p>
                <a href="https://www.amazon.com.mx/dp/B0DNX9CVVK" target="_blank" className="block bg-orange-100 text-orange-700 p-4 rounded-xl text-center border border-orange-200 font-bold text-sm">
                  📙 Ver Recetario de Luisa en Amazon
                </a>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center text-gray-400">Tu Historial</h2>
            {history.map((h) => (
              <div key={h.id} className="bg-[#2a2a2a] p-4 rounded-2xl border border-gray-800 flex items-center gap-4 shadow-md">
                <img src={h.imageUri} className="w-16 h-16 object-cover rounded-xl border border-gray-700" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-sm text-gray-200 truncate">{h.productName}</p>
                  <p className={`text-[10px] font-black mt-1 ${h.verdict.includes('SÍ') ? 'text-green-400' : 'text-red-400'}`}>{h.verdict}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pay' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <div className="bg-white p-8 rounded-3xl text-slate-900 shadow-2xl border-t-[12px] border-green-500">
              <h2 className="text-2xl font-black text-center mb-1 text-slate-800">Plan Saludable</h2>
              <p className="text-center text-slate-400 text-xs mb-8 uppercase tracking-widest font-bold">Acceso Anual Ilimitado</p>
              
              <div className="flex justify-center items-baseline gap-1 mb-8">
                <span className="text-2xl font-bold text-slate-400">$</span>
                <span className="text-6xl font-black text-slate-900">{appliedPrice}</span>
                <span className="text-lg font-bold text-slate-400">MXN</span>
              </div>

              <div className="flex gap-2 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <input 
                  type="text" 
                  placeholder="Cupón WhatsApp" 
                  value={coupon} 
                  onChange={(e)=>setCoupon(e.target.value)} 
                  className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none" 
                />
                <button onClick={applyCoupon} className="bg-slate-900 text-white px-5 rounded-xl font-bold text-[10px] uppercase">Aplicar</button>
              </div>

              <button 
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-[#009ee3] hover:bg-[#0089c7] text-white py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex justify-center items-center gap-3"
              >
                {loading ? "CARGANDO..." : (
                  <>PAGAR CON MERCADO PAGO <span className="bg-white text-[#009ee3] rounded-full px-2 py-0 text-xs text-center leading-none">M</span></>
                )}
              </button>
              
              <p className="text-[9px] text-center text-slate-400 mt-6 leading-tight italic">
                Protegido por Mercado Pago. <br/>Válido por 365 días a partir de la activación.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* NAV INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-[#1a1a1a]/95 backdrop-blur-md border-t border-gray-800 flex justify-around p-4 shadow-2xl">
        <button onClick={() => setTab('scanner')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'scanner' ? 'text-green-500 scale-110' : 'text-gray-600'}`}>
          <span className="text-2xl">🔍</span><span className="text-[10px] font-bold">Scanner</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'history' ? 'text-green-500 scale-110' : 'text-gray-600'}`}>
          <span className="text-2xl">📜</span><span className="text-[10px] font-bold">Historial</span>
        </button>
        <button onClick={() => setTab('pay')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'pay' ? 'text-green-500 scale-110' : 'text-gray-600'}`}>
          <span className="text-2xl">💎</span><span className="text-[10px] font-bold">Premium</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
