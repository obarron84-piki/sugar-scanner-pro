import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// 1. CONFIGURACIÓN FIREBASE ACTUALIZADA (-piki)
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        signInAnonymously(auth).catch(err => console.error("Error Auth:", err));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      executeAnalysis(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const executeAnalysis = async (base64Data, mimeType) => {
    if (!apiKey) {
      alert("Error: Configura la API Key en Vercel (REACT_APP_GEMINI_API_KEY)");
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    const promptText = "Analiza los ingredientes en esta imagen. Identifica si contiene edulcorantes calóricos según la NOM-051 de México. Responde exclusivamente en formato JSON: {\"found\": boolean, \"detectedIngredients\": [string], \"productName\": string}";

    try {
      // Usamos v1beta para máxima compatibilidad con análisis de imágenes
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Data } }
            ]
          }]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      
      setAnalysisResult(result);

      if (user) {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), {
          ...result,
          timestamp: Date.now()
        });
      }

    } catch (err) {
      console.error("Error:", err);
      alert("Error de análisis: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-green-500">Sugar Scanner Pro</h1>
        <div className="text-[10px] text-gray-600 bg-gray-900 px-2 py-1 rounded">v1.3 Final</div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full space-y-6">
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 text-center space-y-6 shadow-2xl">
          <div className="text-6xl animate-pulse">🔍</div>
          <div>
            <h2 className="text-xl font-semibold">Análisis de Etiquetas</h2>
            <p className="text-gray-400 text-sm mt-2">Toma una foto clara de los ingredientes.</p>
          </div>
          
          <label className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-green-900/20">
            {loading ? "Analizando..." : "📷 Escanear Producto"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>

        {analysisResult && (
          <div className={`p-6 rounded-3xl border animate-in fade-in zoom-in duration-300 ${analysisResult.found ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
            <h3 className="text-lg font-bold mb-1 text-center">{analysisResult.productName || "Resultado"}</h3>
            <p className="text-2xl font-black mb-4 text-center">{analysisResult.found ? "⚠️ TIENE AZÚCARES" : "✅ LIBRE DE AZÚCARES"}</p>
            
            {analysisResult.detectedIngredients.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ingredientes detectados:</p>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.detectedIngredients.map((ing, i) => (
                    <span key={i} className="bg-red-500/20 text-red-200 px-3 py-1 rounded-full text-xs border border-red-500/30">{ing}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-gray-600 text-[10px]">
        NOM-051 México · Consulta Nutricional
      </footer>
    </div>
  );
}

export default App;
