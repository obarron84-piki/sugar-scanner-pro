import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

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

// Función para detectar si es iPhone o Android
const getOS = () => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  return 'Other';
};

function App() {
  const [tab, setTab] = useState('scanner');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [os, setOs] = useState('Other');
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    setOs(getOS());
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) { 
        setUser(u);
        const q = query(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid, 'scans'), orderBy('timestamp', 'desc'), limit(15));
        onSnapshot(q, (snapshot) => setHistory(snapshot.docs.map(d => ({id: d.id, ...d.data()}))));
      } else { signInAnonymously(auth); }
    });
    return () => unsubAuth();
  }, []);

  const analyzeImage = async (base64, type) => {
    setLoading(true);
    setResult(null);
    
    const prompt = `Actúa como un experto en nutrición y NOM-051. Analiza la lista de ingredientes de la imagen.
    REGLA DE ORO: Si alguno de los siguientes ingredientes aparece entre los PRIMEROS 3 de la lista, el veredicto es "NO SE PUEDE". De lo contrario es "SÍ SE PUEDE".
    LISTA NEGRA (Azúcares añadidos):
    1. Azúcares: blanca, refinada, morena, mascabado, estándar, de caña, remolacha, coco, dátil, invertido.
    2. Jarabes: JMAF, maíz, agave, malta, arce, arroz integral, melaza, piloncillo.
    3. Terminados en "-osa": Glucosa, Fructosa, Sacarosa, Dextrosa, Maltosa, Galactosa, Lactosa.
    4. Almidones: Extracto de malta, Maltodextrina, Sólidos de maíz, Dextrina, Almidón hidrolizado.
    5. Concentrados: Jugo de fruta, Néctar.

    Responde solo JSON: 
    {
      "productName": "nombre",
      "verdict": "SÍ SE PUEDE" o "NO SE PUEDE",
      "foundBadIngredients": ["ingrediente1", "ingrediente2"],
      "nutritionalExplanation": "breve explicación",
      "isTopThree": boolean
    }`;
    
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: type, data: base64 } }] }] })
      });
      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const cleanJson = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);
      
      const scanData = { 
        ...cleanJson, 
        timestamp: Date.now(),
        imageUri: `data:${type};base64,${base64}` 
      };

      setResult(scanData);
      if (user) await addDoc(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', user.uid, 'scans'), scanData);
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  const shareToCommunity = (itemName) => {
    // Aquí conectaremos la lógica de Firebase en el futuro
    alert(`¡Has compartido tu análisis de ${itemName} en la Comunidad!`);
  };

  return (
    <div className="min-h-screen bg-cyan-50 text-slate-800 font-sans pb-28">
      {/* 1. SECCIÓN PRINCIPAL (SCANNER) */}
      {tab === 'scanner' && (
        <div className="p-6">
          <h1 className="text-3xl font-black text-teal-700 mb-1">Sugar Scanner</h1>
          <p className="text-teal-600/70 mb-6 font-medium">Cuidando tu nutrición</p>

          {/* INSTRUCCIONES PWA (APP DE ESCRITORIO) */}
          <div className="bg-blue-100/50 border border-blue-200 p-4 rounded-2xl mb-6 text-sm text-blue-800">
            <p className="font-bold mb-1">📲 Instala esta App:</p>
            {os === 'iOS' && <p>Toca el ícono de <strong>Compartir</strong> (cuadrado con flecha) y selecciona <strong>"Agregar a inicio"</strong>.</p>}
            {os === 'Android' && <p>Toca los <strong>3 puntos</strong> en la esquina del navegador y selecciona <strong>"Agregar a la pantalla principal"</strong>.</p>}
            {os === 'Other' && <p>Guarda esta página en tus marcadores o favoritos para rápido acceso.</p>}
          </div>

          <div className="bg-white border border-teal-100 rounded-3xl p-10 text-center mb-8 shadow-sm">
            <div className="text-6xl mb-6">📸</div>
            <label className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 rounded-2xl font-black cursor-pointer transition-all inline-block shadow-md active:scale-95">
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
            <div className={`p-8 rounded-3xl border-2 bg-white shadow-lg animate-in zoom-in duration-300 ${result.verdict === 'SÍ SE PUEDE' ? 'border-green-400' : 'border-red-400'}`}>
              <h2 className={`text-2xl font-black mb-2 flex items-center gap-2 ${result.verdict === 'SÍ SE PUEDE' ? 'text-green-600' : 'text-red-600'}`}>
                {result.verdict === 'SÍ SE PUEDE' ? '😎 ¡SÍ SE PUEDE!' : '❌ NO SE PUEDE'}
              </h2>
              <p className="text-lg font-bold text-slate-700 mb-4">{result.productName}</p>
              
              {result.foundBadIngredients.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Se encontró:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.foundBadIngredients.map((ing, i) => (
                      <span key={i} className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm border border-red-200">{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-sm leading-relaxed text-slate-600 mb-4">
                <span className="font-bold text-amber-500">Nota Nutricional: </span> 
                {result.nutritionalExplanation}
              </p>

              <button onClick={() => shareToCommunity(result.productName)} className="w-full bg-blue-50 text-blue-600 font-bold py-3 rounded-xl border border-blue-200 hover:bg-blue-100 transition">
                Compartir en Comunidad 🌍
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. HISTÓRICO */}
      {tab === 'history' && (
        <div className="p-6">
          <h2 className="text-2xl font-black mb-6 text-teal-800">Mi Historial</h2>
          <div className="space-y-4">
            {history.map((h) => (
              <div key={h.id} className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                <div className="flex gap-4 items-center mb-3">
                  {h.imageUri ? (
                    <img src={h.imageUri} alt="etiqueta" className="w-16 h-16 object-cover rounded-xl border border-slate-100" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-xl">📄</div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 leading-tight">{h.productName}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-1">
                      {new Date(h.timestamp).toLocaleDateString()}
                    </p>
                    <div className={`mt-1 font-black text-xs inline-block px-2 py-1 rounded-lg ${h.verdict === 'SÍ SE PUEDE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {h.verdict === 'SÍ SE PUEDE' ? '😎 SÍ SE PUEDE' : '❌ NO SE PUEDE'}
                    </div>
                  </div>
                </div>
                <button onClick={() => shareToCommunity(h.productName)} className="w-full bg-slate-50 text-slate-500 text-sm font-bold py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                  Compartir 🌍
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SOCIAL / COMUNIDAD */}
      {tab === 'social' && (
        <div className="p-6 text-center">
          <h2 className="text-2xl font-black mb-2 text-teal-800">Comunidad</h2>
          <p className="text-slate-500 text-sm mb-8">Conecta con otras personas y comparte descubrimientos saludables.</p>
          
          <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm mb-8">
            <div className="text-5xl mb-4">👍</div>
            <p className="font-bold text-slate-700 mb-4">Vincula tu cuenta para participar</p>
            <button className="bg-[#1877F2] text-white font-bold w-full py-4 rounded-xl shadow-md active:scale-95 transition-all">
              Conectar con Facebook
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-teal-100 shadow-sm text-left opacity-60">
            <h3 className="font-bold text-teal-800 mb-2">Muro Reciente</h3>
            <p className="text-sm text-slate-500 italic">Inicia sesión para ver lo que otros han escaneado hoy...</p>
          </div>
        </div>
      )}

      {/* 4. PAGOS / PREMIUM */}
      {tab === 'pay' && (
        <div className="p-6">
          <h2 className="text-2xl font-black mb-6 text-teal-800 text-center">Planes Premium</h2>
          
          <div className="space-y-4">
            <div className="bg-white border-2 border-teal-500 p-6 rounded-3xl shadow-md relative">
              <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase">Más Popular</div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Mensual</h3>
              <p className="text-3xl font-black text-teal-600 mb-4">$99 <span className="text-sm font-normal text-slate-400">MXN / mes</span></p>
              <ul className="text-sm text-slate-600 space-y-2 mb-6">
                <li>✔️ Escaneos ilimitados</li>
                <li>✔️ Historial extendido</li>
                <li>✔️ Sin anuncios</li>
              </ul>
              <button className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-teal-600 transition">Elegir Plan Mensual</button>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Anual</h3>
              <p className="text-3xl font-black text-slate-600 mb-4">$899 <span className="text-sm font-normal text-slate-400">MXN / año</span></p>
              <ul className="text-sm text-slate-600 space-y-2 mb-6">
                <li>✔️ Todo lo del plan mensual</li>
                <li>✔️ Ahorras 2 meses</li>
              </ul>
              <button className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-200 transition">Elegir Plan Anual</button>
            </div>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR (CON TEXTO) */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 flex justify-around p-3 pb-6 shadow-2xl">
        <button onClick={() => setTab('scanner')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'scanner' ? 'text-teal-600 scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl">📸</span>
          <span className="text-[10px] font-bold">Escanear</span>
        </button>
        <button onClick={() => setTab('history')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'history' ? 'text-teal-600 scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl">📜</span>
          <span className="text-[10px] font-bold">Historial</span>
        </button>
        <button onClick={() => setTab('social')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'social' ? 'text-teal-600 scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl">🌍</span>
          <span className="text-[10px] font-bold">Comunidad</span>
        </button>
        <button onClick={() => setTab('pay')} className={`flex flex-col items-center gap-1 transition-all ${tab === 'pay' ? 'text-teal-600 scale-110' : 'text-slate-400'}`}>
          <span className="text-2xl">💳</span>
          <span className="text-[10px] font-bold">Premium</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
