import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// CONFIGURACIÓN FIREBASE (Mantén la tuya que ya funciona)
const firebaseConfig = {
  apiKey: "AIzaSyAsOVe0tGXGUOUAnYE65N6RVLIIeqndAiQ",
  authDomain: "sugar-scanner-piki.firebaseapp.com",
  projectId: "sugar-scanner-piki",
  storageBucket: "sugar-scanner-piki.firebasestorage.app",
  messagingSenderId: "874023944542",
  appId: "1:874023944542:web:0d787daaf584113dc0cfcf",
  measurementId: "G-B6B79BZ4P9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = "sugar-scanner-piki";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); } 
      else { signInAnonymously(auth).catch(console.error); }
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      executeAnalysis(reader.result.split(',')[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  const executeAnalysis = async (base64Data, mimeType) => {
    if (!apiKey) { alert("Error: No hay API Key."); return; }
    setLoading(true);
    setAnalysisResult(null);

    try {
      // Usamos el endpoint más básico posible para evitar el 404
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user", // Agregamos el rol explícitamente
            parts: [
              { text: "Analiza ingredientes NOM-051 México. Responde solo JSON: {\"found\": boolean, \"detectedIngredients\": [string], \"productName\": string}" },
              { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      // Si aquí sale error, el mensaje nos dirá si es la API Key o el Modelo
      if (data.error) {
        throw new Error(`${data.error.code}: ${data.error.message}`);
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      setAnalysisResult(JSON.parse(jsonMatch ? jsonMatch[0] : rawText));

    } catch (err) {
      // Este alert es clave: si dice "403" es permiso, si dice "429" es cuota
      alert("Detalle del error: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-green-500">Sugar Scanner Pro</h1>
        <div className="text-[10px] text-orange-400 bg-orange-900/30 px-2 py-1 rounded border border-orange-500/50">
          v1.7 (AI STUDIO KEY)
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full space-y-6">
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 text-center space-y-6 shadow-2xl">
          <div className="text-6xl">📸</div>
          <h2 className="text-xl font-semibold">Análisis NOM-051</h2>
          <label className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl cursor-pointer shadow-lg active:scale-95 transition-all">
            {loading ? "PROCESANDO..." : "ESCANEAR ETIQUETA"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>

        {analysisResult && (
          <div className={`p-6 rounded-3xl border ${analysisResult.found ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
            <h3 className="text-lg font-bold mb-1 text-center">{analysisResult.productName}</h3>
            <p className="text-2xl font-black mb-4 text-center">{analysisResult.found ? "⚠️ TIENE AZÚCAR" : "✅ LIBRE DE AZÚCAR"}</p>
            {analysisResult.detectedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center border-t border-white/10 pt-4">
                {analysisResult.detectedIngredients.map((ing, i) => (
                  <span key={i} className="bg-red-500/20 text-red-200 px-3 py-1 rounded-full text-xs border border-red-500/30">{ing}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
