import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// 1. CONFIGURACIÓN FIREBASE (-piki)
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
        signInAnonymously().catch(err => console.error("Error Auth:", err));
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
      alert("Error: No se detectó la API Key. Revisa las variables en Vercel.");
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    const promptText = "Analiza los ingredientes de esta imagen. Identifica si tiene edulcorantes calóricos según la NOM-051 de México. Responde únicamente en formato JSON: {\"found\": boolean, \"detectedIngredients\": [string], \"productName\": string}";

    try {
      // REGRESAMOS A v1beta QUE ES LA QUE TIENE EL MODELO FLASH SIEMPRE DISPONIBLE
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { 
                inlineData: { // Volvemos a camelCase sin guion bajo
                  mimeType: mimeType || "image/jpeg", 
                  data: base64Data 
                } 
              }
            ]
          }]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`${data.error.message}`);
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
        <h1 className="text-2xl font-bold text-green-500 italic">Sugar Scanner Pro</h1>
        <div className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/50">
          v1.6 FINAL-RETRY
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full space-y-6">
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 text-center space-y-6">
          <div className="text-6xl">📸</div>
          <h2 className="text-xl font-semibold">Analizador NOM-051</h2>
          <label className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl cursor-pointer shadow-lg">
            {loading ? "PROCESANDO..." : "ESCANEAR AHORA"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>

        {analysisResult && (
          <div className={`p-6 rounded-3xl border ${analysisResult.found ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
            <h3 className="text-lg font-bold mb-1 text-center">{analysisResult.productName || "Producto"}</h3>
            <p className="text-2xl font-black mb-4 text-center">{analysisResult.found ? "⚠️ CONTIENE AZÚCAR" : "✅ SIN AZÚCARES"}</p>
            {analysisResult.detectedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {analysisResult.detectedIngredients.map((ing, i) => (
                  <span key={i} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs border border-red-500/20">{ing}</span>
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
