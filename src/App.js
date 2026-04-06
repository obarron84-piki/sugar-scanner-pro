import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// Tu configuración de Firebase
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
    const prompt = "Analiza según NOM-051 México. Responde solo JSON: {'productName': string, 'hasSugar': boolean, 'seals': [string], 'warning': string, 'ingredients': [string]}";
    
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
    } catch (e) { alert("Error de análisis: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-24">
      {/* 1. SECCIÓN PRINCIPAL (SCANNER) */}
      {tab === 'scanner' && (
        <div className="p-6 animate-in fade-in duration-500">
          <h1 className="text-3xl font-black text-green-500 mb-2">Sugar Scanner</h1>
          <p className="text-gray-400 mb-8">Validación NOM-051 Zapopan, Jal.</p>

          <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-10 text-center mb-6">
            <div className="text-5xl mb-4">📸</div>
            <label className="bg-green-600 hover:bg-green-500 px-8 py-4 rounded-2xl font-bold cursor-pointer transition-all inline-block">
              {loading ? "ANALIZANDO..." : "ESCANEAR AHORA"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files[0];
                const r = new FileReader();
                r.onloadend = () => analyzeImage(r.result.split(',')[1], f.type);
                r.readAsDataURL(f);
              }} />
            </label>
          </div>

          {result && (
            <div className={`p-6 rounded-3xl border-2 ${result.hasSugar ? 'border-red-500 bg-red-950/20' : 'border-green-500 bg-green-950/20'}`}>
              <h2 className="text-xl font-bold mb-2">{result.productName}</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.seals.map(s => <span className="bg-black text-white text-[10px] px-2 py-1 border border-white font-bold">{s}</span>)}
              </div>
              <p className="text-sm italic">{result.warning}</p>
            </div>
          )}
        </div>
      )}

      {/* 2. HISTÓRICO */}
      {tab === 'history' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Mis Escaneos</h2>
          <div className="space-y-4">
            {history.map((h, i) => (
              <div key={i} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center">
                <span>{h.productName}</span>
                <span className={h.hasSugar ? 'text-red-400' : 'text-green-400'}>{h.hasSugar ? '⚠️' : '✅'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SOCIAL */}
      {tab === 'social' && (
        <div className="p-6 text-center">
          <div className="text-6xl mt-20">👥</div>
          <h2 className="text-2xl font-bold mt-4 text-green-400 text-center">Comunidad Luisa</h2>
          <p className="text-gray-400 mt-2">Comparte tus hallazgos con otros pacientes de la consulta nutricional.</p>
        </div>
      )}

      {/* 4. PAGOS (MERCADO PAGO) */}
      {tab === 'pay' && (
        <div className="p-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-3xl shadow-xl text-center">
            <h2 className="text-2xl font-bold mb-4">Plan Premium</h2>
            <p className="mb-6 opacity-90 text-sm">Escaneos ilimitados y reporte PDF para tu nutrióloga.</p>
            <button className="bg-white text-blue-600 w-full py-4 rounded-2xl font-black text-lg">
              PAGAR CON MERCADO PAGO
            </button>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800 flex justify-around p-4">
        <button onClick={() => setTab('scanner')} className={tab === 'scanner' ? 'text-green-500' : 'text-slate-500'}>📸</button>
        <button onClick={() => setTab('history')} className={tab === 'history' ? 'text-green-500' : 'text-slate-500'}>📜</button>
        <button onClick={() => setTab('social')} className={tab === 'social' ? 'text-green-500' : 'text-slate-500'}>🌍</button>
        <button onClick={() => setTab('pay')} className={tab === 'pay' ? 'text-green-500' : 'text-slate-500'}>💳</button>
      </nav>
    </div>
  );
}

export default App;
