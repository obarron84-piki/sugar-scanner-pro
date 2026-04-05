import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// Mantenemos tu config de Firebase que ya funciona
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
  const [activeTab, setActiveTab] = useState('scanner');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); loadHistory(u.uid); } 
      else { signInAnonymously(auth); }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async (uid) => {
    const q = query(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', uid, 'scans'), orderBy('timestamp', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    setHistory(querySnapshot.docs.map(doc => doc.data()));
  };

  const executeAnalysis = async (base64Data, mimeType) => {
    setLoading(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Analiza ingredientes NOM-051 México. Responde solo JSON: {\"found\": boolean, \"detectedIngredients\": [string], \"productName\": string}" }, { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }] }]
        })
      });
      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const result = JSON.parse(rawText.match(/\{[\s\S]*\}/)[0]);
      
      if (user) {
        await addDoc(collection(db, 'artifacts', 'sugar-scanner-piki', 'users', user.uid, 'scans'), { ...result, timestamp: Date.now() });
        loadHistory(user.uid);
      }
      alert(result.found ? "⚠️ Contiene Azúcar" : "✅ Libre de Azúcar");
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 font-sans">
      {/* HEADER */}
      <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-black sticky top-0 z-10">
        <h1 className="text-xl font-bold text-green-500">Sugar Scanner</h1>
        <span className="text-[10px] bg-gray-800 px-2 py-1 rounded text-gray-400">v2.0 PRO</span>
      </header>

      {/* CONTENIDO SEGÚN TABS */}
      <main className="p-6 max-w-md mx-auto">
        {activeTab === 'scanner' && (
          <div className="space-y-6 text-center">
            <div className="bg-gray-900 p-10 rounded-3xl border border-gray-800 shadow-xl">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-xl font-bold mb-4">Analizador NOM-051</h2>
              <label className="block w-full bg-green-600 p-4 rounded-2xl font-bold cursor-pointer active:scale-95 transition-transform">
                {loading ? "PROCESANDO..." : "ESCANEAR ETIQUETA"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const reader = new FileReader();
                  reader.onloadend = () => executeAnalysis(reader.result.split(',')[1], e.target.files[0].type);
                  reader.readAsDataURL(e.target.files[0]);
                }} />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Historial Reciente</h2>
            {history.map((item, i) => (
              <div key={i} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-bold">{item.productName || "Producto"}</p>
                  <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
                <span className={item.found ? "text-red-500" : "text-green-500"}>
                  {item.found ? "⚠️ Azúcar" : "✅ Limpio"}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'social' && (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🌍</div>
            <h2 className="text-xl font-bold">Comunidad</h2>
            <p className="text-gray-400 mt-2">Próximamente: Comparte tus hallazgos con otros usuarios y pacientes de Luisa.</p>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="bg-blue-900/20 border border-blue-500/50 p-6 rounded-3xl text-center">
            <div className="text-5xl mb-4">💳</div>
            <h2 className="text-xl font-bold text-blue-400">Acceso Premium</h2>
            <p className="text-sm text-gray-300 mt-2 mb-6">Desbloquea escaneos ilimitados y asesoría directa.</p>
            <button className="w-full bg-blue-600 p-4 rounded-2xl font-bold opacity-50 cursor-not-allowed">
              PAGAR CON MERCADO PAGO
            </button>
            <p className="text-[10px] text-gray-500 mt-4">Integración en proceso...</p>
          </div>
        )}
      </main>

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-gray-950 border-t border-gray-800 flex justify-around p-3 backdrop-blur-lg">
        <button onClick={() => setActiveTab('scanner')} className={`flex flex-col items-center ${activeTab === 'scanner' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-xl">🔍</span><span className="text-[10px]">Escanear</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center ${activeTab === 'history' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-xl">📜</span><span className="text-[10px]">Historial</span>
        </button>
        <button onClick={() => setActiveTab('social')} className={`flex flex-col items-center ${activeTab === 'social' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-xl">👥</span><span className="text-[10px]">Social</span>
        </button>
        <button onClick={() => setActiveTab('payment')} className={`flex flex-col items-center ${activeTab === 'payment' ? 'text-green-500' : 'text-gray-500'}`}>
          <span className="text-xl">💎</span><span className="text-[10px]">Premium</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
