import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

// CONFIGURACIÓN FIREBASE (Mantén la tuya que ya funciona)
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
      alert("Error: No se encontró la API Key de Gemini en Vercel.");
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    // Instrucción simplificada para máxima compatibilidad
    const promptText = "Analiza la imagen de la etiqueta de ingredientes. Busca edulcorantes calóricos según la NOM-051. Responde solo en formato JSON: {\"found\": boolean, \"detectedIngredients\": [string], \"productName\": string}";

    try {
      // URL de alta compatibilidad para gemini-1.5-flash
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
        throw new Error(data.error.message || "Error de la API de Google");
      }

      // Extraer y limpiar el JSON de la respuesta
      let textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
      
      setAnalysisResult(result);

      // Guardar en Firebase
      if (user) {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), {
          ...result,
          timestamp: Date.now()
        });
      }

    } catch (err) {
      console.error("Error detallado:", err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-green-500">Sugar Scanner Pro</h1>
        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">👤</div>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 text-center space-y-4">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-semibold">Escaneo Inteligente</h2>
          <p className="text-gray-400 text-sm">Sube una foto de la tabla de ingredientes para detectar azúcares ocultos.</p>
          
          <label className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl cursor-pointer transition">
            {loading ? "Analizando..." : "📷 Subir Foto"}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>

        {analysisResult && (
          <div className={`p-6 rounded-3xl border ${analysisResult.found ? 'bg-red-900/20 border-red-500' : 'bg-green-900/20 border-green-500'}`}>
            <h3 className="text-lg font-bold mb-2">{analysisResult.productName || "Producto analizado"}</h3>
            <p className="text-2xl mb-4">{analysisResult.found ? "⚠️ Contiene edulcorantes" : "✅ Libre de edulcorantes"}</p>
            {analysisResult.detectedIngredients.length > 0 && (
              <ul className="list-disc list-inside text-sm text-gray-300">
                {analysisResult.detectedIngredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
