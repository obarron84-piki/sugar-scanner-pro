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

function App() {
  const [tab, setTab] = useState('scanner');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) { 
        setUser(u);
        const q = query(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', u.uid, 'scans'), orderBy('timestamp', 'desc'), limit(10));
        onSnapshot(q, (snapshot) => setHistory(snapshot.docs.map(d => d.data())));
      } else { signInAnonymously(auth); }
    });
    return () => unsubAuth();
  }, []);

  const analyzeImage = async (base64, type) => {
    setLoading(true);
    setResult(null);
    
    // Prompt optimizado con la info del PDF NOM-051
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
      "nutritionalExplanation": "breve explicación de por qué no se recomiendan esos ingredientes específicos encontrados",
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
      
      setResult(cleanJson);
      if (user) await addDoc(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', user.uid, 'scans'), { ...cleanJson, timestamp: Date.now() });
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24">
      {tab === 'scanner' && (
        <div className="p-6">
          <h1 className="text-3xl font-black text-green-500 mb-2">Sugar Scanner</h1>
          <p className="text-gray-400 mb-8 font-medium">Validación NOM-051 • Guía de Luisa</p>

          <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-10 text-center mb-8 shadow-2xl">
            <div className="text-6xl mb-6">📸</div>
            <label className="bg-green-600 hover:bg-green-500 px-10 py-5 rounded-2xl font-black cursor-pointer transition-all inline-block shadow-lg active:scale-95">
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
            <div className={`p-8 rounded-3xl border-4 animate-in zoom-in duration-300 ${result.verdict === 'SÍ SE PUEDE' ? 'border-green-500 bg-green-950/20' : 'border-red-600 bg-red-950/30'}`}>
              <h2 className="text-2xl font-black mb-1">{result.verdict}</h2>
              <p className="text-lg font-bold text-gray-300 mb-4">{result.productName}</p>
              
              {result.foundBadIngredients.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Ingredientes detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.foundBadIngredients.map((ing, i) => (
                      <span key={i} className="bg-black/50 px-3 py-1 rounded-full text-sm border border-white/20">{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm leading-relaxed text-gray-200">
                  <span className="font-bold text-yellow-500">¿Por qué? </span> 
                  {result.nutritionalExplanation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-green-500">Historial de Luisa</h2>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="bg-slate-900 p-5 rounded-2xl flex justify-between items-center border border-slate-800">
                <div>
                  <p className="font-bold">{h.productName}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
                    {new Date(h.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className={`font-black text-xs px-3 py-1 rounded-lg ${h.verdict === 'SÍ SE PUEDE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {h.verdict}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 flex justify-around p-5 shadow-2xl">
        <button onClick={() => setTab('scanner')} className={`text-2xl transition-all ${tab === 'scanner' ? 'text-green-500 scale-125' : 'text-slate-500'}`}>📸</button>
        <button onClick={() => setTab('history')} className={`text-2xl transition-all ${tab === 'history' ? 'text-green-500 scale-125' : 'text-slate-500'}`}>📜</button>
        <button onClick={() => setTab('social')} className={`text-2xl transition-all ${tab === 'social' ? 'text-green-500 scale-125' : 'text-slate-500'}`}>🌍</button>
        <button onClick={() => setTab('pay')} className={`text-2xl transition-all ${tab === 'pay' ? 'text-green-500 scale-125' : 'text-slate-500'}`}>💳</button>
      </nav>
    </div>
  );
}

export default App;
