import React, { useState, useEffect } from 'react';
import { 
  Camera, Image as ImageIcon, CheckCircle2, XCircle, RefreshCcw, Loader2, 
  History, Users, CreditCard, LogOut, ShieldAlert, Zap 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';

// CONFIGURACIÓN REAL DE FIREBASE (PROPORCIONADA POR EL USUARIO)
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
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "sugar-scanner-piki";

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [apiKey] = useState(""); // La API Key de Google se configurará en Vercel después

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) checkUserSubscription(u.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const historyRef = collection(db, 'artifacts', appId, 'users', user.uid, 'scans');
    const unsubHistory = onSnapshot(historyRef, (snapshot) => {
      const scans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(scans.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => console.error("History listener error:", err));

    const communityRef = collection(db, 'artifacts', appId, 'public', 'data', 'community_scans');
    const unsubCommunity = onSnapshot(communityRef, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommunityPosts(posts.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => console.error("Community listener error:", err));

    return () => {
      unsubHistory();
      unsubCommunity();
    };
  }, [user]);

  const checkUserSubscription = async (uid) => {
    const userDocRef = doc(db, 'artifacts', appId, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      setSubscriptionStatus(userDoc.data().subscription);
    } else {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      const initialData = {
        uid,
        email: 'Usuario Beta',
        subscription: {
          type: 'trial',
          expiresAt: trialEnd.getTime(),
          isVip: false
        }
      };
      await setDoc(userDocRef, initialData);
      setSubscriptionStatus(initialData.subscription);
    }
  };

  const processImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleAnalysis(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const handleAnalysis = async (base64Data) => {
    if (!subscriptionStatus) return;
    
    if (subscriptionStatus.type === 'trial' && Date.now() > subscriptionStatus.expiresAt) {
      setView('subscription');
      return;
    }

    setLoading(true);
    setAnalysisResult(null);

    const systemPrompt = `Expert in Mexican NOM-051. Analyze ingredients in image. Respond in JSON only: { "found": boolean, "detectedIngredients": [], "productName": "" }`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "Analyze ingredients for caloric sweeteners per NOM-051." }, { inlineData: { mimeType: "image/png", data: base64Data } }]
          }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      setAnalysisResult(result);
      
      if (user) {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'scans'), {
          ...result,
          timestamp: Date.now()
        });
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community_scans'), {
          productName: result.productName || "Desconocido",
          found: result.found,
          userEmail: "Beta Tester",
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      <header className="p-6 border-b border-green-900/20 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-black text-green-500 italic tracking-tighter">SUGAR SCANNER PRO</h1>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
          {subscriptionStatus?.type === 'trial' ? 'Prueba 7 Días' : 'Premium'}
        </p>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6">
        {view === 'home' && !analysisResult && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-green-500/10 rounded-3xl p-8 text-center">
              <Zap className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-4">Escaneo Inteligente</h2>
              <div className="grid grid-cols-2 gap-4">
                <label className="bg-green-500 text-black p-4 rounded-2xl cursor-pointer flex flex-col items-center">
                  <Camera className="mb-1" /> <span className="text-[10px] font-black">CÁMARA</span>
                  <input type="file" className="hidden" accept="image/*" capture="environment" onChange={(e) => processImage(e.target.files[0])} />
                </label>
                <label className="bg-zinc-800 text-white p-4 rounded-2xl cursor-pointer flex flex-col items-center">
                  <ImageIcon className="mb-1 text-green-500" /> <span className="text-[10px] font-black">GALERÍA</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => processImage(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div className="bg-green-950/10 border border-green-500/20 p-4 rounded-2xl flex gap-3 italic">
              <ShieldAlert className="text-green-500 flex-shrink-0" size={16} />
              <p className="text-[10px] text-green-200/60 uppercase leading-relaxed font-bold tracking-tight">
                Información basada en los criterios de la NOM-051. Referencia informativa únicamente.
              </p>
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="animate-in zoom-in-95 duration-300">
            <div className={`rounded-3xl p-8 text-center border ${analysisResult.found ? 'bg-red-950/20 border-red-500/50' : 'bg-green-950/20 border-green-500/50'}`}>
              <h2 className="text-4xl font-black mb-2 uppercase">{analysisResult.found ? '⚠️ No' : '✅ Sí'}</h2>
              <p className="text-sm opacity-80 mb-4">{analysisResult.productName}</p>
              <button onClick={() => setAnalysisResult(null)} className="bg-white text-black px-6 py-2 rounded-full font-black text-xs uppercase">Nuevo Escaneo</button>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-green-500 uppercase tracking-widest">Mi Historial</h2>
            {history.map(scan => (
              <div key={scan.id} className="bg-zinc-900 p-4 rounded-xl flex justify-between items-center border border-white/5">
                <span className="text-xs font-bold uppercase">{scan.productName || "Sin Nombre"}</span>
                {scan.found ? <XCircle className="text-red-500" size={16}/> : <CheckCircle2 className="text-green-500" size={16}/>}
              </div>
            ))}
          </div>
        )}

        {view === 'community' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-green-500 uppercase tracking-widest">Hallazgos Recientes</h2>
            {communityPosts.map(post => (
              <div key={post.id} className="bg-zinc-900 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] text-gray-500 mb-1">{post.userEmail}</p>
                <p className="text-xs font-black uppercase">{post.productName}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full max-w-md bg-zinc-900 border-t border-green-900/30 flex justify-around py-4 z-50 rounded-t-2xl">
        <button onClick={() => setView('home')} className={view === 'home' ? 'text-green-500' : 'text-gray-500'}><Camera /></button>
        <button onClick={() => setView('history')} className={view === 'history' ? 'text-green-500' : 'text-gray-500'}><History /></button>
        <button onClick={() => setView('community')} className={view === 'community' ? 'text-green-500' : 'text-gray-500'}><Users /></button>
        <button onClick={() => setView('subscription')} className={view === 'subscription' ? 'text-green-500' : 'text-gray-500'}><CreditCard /></button>
      </nav>

      {loading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center">
          <Loader2 className="text-green-500 animate-spin mb-4" size={48} />
          <p className="text-green-500 font-black tracking-widest uppercase text-xs">Analizando...</p>
        </div>
      )}
    </div>
  );
};

export default App;
