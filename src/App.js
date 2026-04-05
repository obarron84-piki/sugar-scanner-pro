import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// CONFIGURACIÓN FIREBASE (Usa tus credenciales aquí)
const firebaseConfig = {
  apiKey: "TU_API_KEY_FIREBASE",
  authDomain: "sugar-scanner-pro.firebaseapp.com",
  projectId: "sugar-scanner-pro",
  storageBucket: "sugar-scanner-pro.appspot.com",
  messagingSenderId: "305101234567",
  appId: "1:305101234567:web:xxxxxxxxxxxx"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = "sugar-scanner-pro";

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
      handleAnalysis(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalysis = async (base64Data, mimeType) => {
    if (!apiKey) {
      alert("Error: Configura la API Key en Vercel.");
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    const promptText = "Analiza los ingredientes de esta etiqueta. Identifica si tiene edulcorantes calóricos según la NOM-051 de México. Responde estrictamente en formato JSON: {\"found\": boolean, \"detectedIngredients\": [string], \"productName\": string}";

    try {
      // URL corregida con el nombre de modelo oficial y estable
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

      // Limpieza de la respuesta para asegurar que solo procesamos el JSON
      let textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
      
      setAnalysisResult(result);

    } catch (err) {
      console.error("Error:", err);
      alert("Error: El servidor de Google no reconoció el modelo o la imagen. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-green-500">Sugar Scanner Pro</h1>
        <div className="text-xs text-gray-500">v1.1</div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full space-y-6">
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 text-center space-y-6 shadow-2xl">
          <div className="text-6xl animate-pulse">🔍</div>
          <div>
            <h2 className="text-xl font-semibold">Escaneo Inteligente</h2>
            <p className="text-gray-400 text-sm mt-2">Sube la foto de los ingredientes para analizar.</p>
          </div>
          
          <label className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-green-900/20">
            {loading ? "Analizando..." : "📷 Subir Foto"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>

        {analysisResult && (
          <div className={`p-6 rounded-3xl border animate-in fade-in zoom-in duration-300 ${analysisResult.found ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
            <h3 className="text-lg font-bold mb-1">{analysisResult.productName || "Producto"}</h3>
            <p className="text-2xl font-black mb-4">{analysisResult.found ? "⚠️ TIENE EDULCORANTES" : "✅ SIN EDULCORANTES"}</p>
            {analysisResult.detectedIngredients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Detectado:</p>
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
      <footer className="text-center py-4 text-gray-600 text-[10px]">
        Para uso informativo · NOM-051 México
      </footer>
    </div>
  );
}

export default App;
