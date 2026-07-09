import React from 'react';
import { motion } from 'motion/react';
import { 
  Terminal, 
  Code, 
  Cpu, 
  ArrowRight, 
  Shield, 
  Zap, 
  Layers, 
  Globe 
} from 'lucide-react';

interface LandingPageProps {
  onStartChat: () => void;
  appLang: string;
}

const getLandingTranslations = (lang: string) => {
  const l = (lang || '').toLowerCase();
  
  if (l.includes('indonesia')) {
    return {
      headline: "Asisten AI Pemikiran Mendalam untuk Kode Nyata Anda.",
      subHeadline: "Selamat datang di DAVECORE. Platform kecerdasan buatan revolusioner dengan logika, pragmatisme, dan pola pikir mendalam seperti manusia programmer berpengalaman. Membantu Anda merancang kode nyata secara instan.",
      startChatBtn: "Mulai Chat",
      learnFeatures: "Pelajari Fitur",
      featuresTitle: "Keunggulan Utama",
      featuresSub: "Fitur Eksklusif DAVECORE AI",
      featuresDesc: "Tingkatkan standar pengembangan software Anda ke level tertinggi dengan fitur cerdas kami.",
      featureLabels: ["Utama", "Premium", "Premium"],
      features: [
        {
          title: "Otak Programmer Senior",
          desc: "Membantu Anda memecahkan algoritma rumit, optimasi query basis data, hingga penataan arsitektur kode berskala besar dengan logika matang."
        },
        {
          title: "Security Audit & Audit Kode",
          desc: "Mendeteksi celah keamanan berbahaya, mencegah injeksi data SQL, XSS, serta kebocoran memori secara instan sebelum masuk produksi."
        },
        {
          title: "Optimasi Kinerja Kilat",
          desc: "Mengidentifikasi bottleneck, merekomendasikan teknik caching, restrukturisasi asinkronus, serta meningkatkan efisiensi eksekusi memori program."
        },
        {
          title: "Kode Riil Multi-Bahasa",
          desc: "Fasih menulis kode bersih siap pakai dalam TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS, dan berbagai bahasa modern lainnya."
        },
        {
          title: "Arsitektur Desain Bersih",
          desc: "Kepatuhan ketat terhadap prinsip clean code SOLID, MVC, DRY (Don't Repeat Yourself), meningkatkan modularitas agar kode mudah dipelihara."
        },
        {
          title: "Dukungan Integrasi API",
          desc: "Memudahkan rancangan integrasi RESTful API, GraphQL, serta OAuth otentikasi eksternal dengan cara yang paling aman dan mutakhir."
        }
      ]
    };
  }

  if (l.includes('jav') || l.includes('jawa')) {
    return {
      headline: "Asisten AI Pikiran Jero kanggo Kode Nyata Sampeyan.",
      subHeadline: "Sugeng rawuh ing DAVECORE. Platform kecerdasan buatan revolusioner kanthi logika, pragmatisme, lan pola pikir jero kaya programmer senior sing berpengalaman. Ngewangi sampeyan nggawe kode nyata kanthi instan.",
      startChatBtn: "Mulai Chat",
      learnFeatures: "Sinau Fitur",
      featuresTitle: "Kaluwihan Utama",
      featuresSub: "Fitur Eksklusif DAVECORE AI",
      featuresDesc: "Ningkatake standar pangembangan piranti alus sampeyan menyang level paling dhuwur kanthi fitur cerdas kita.",
      featureLabels: ["Utama", "Premium", "Premium"],
      features: [
        {
          title: "Utak Programmer Senior",
          desc: "Ngewangi sampeyan ngrampungake algoritma rumit, optimasi query basis data, lan tata arsitektur kode skala gedhe kanthi logika mateng."
        },
        {
          title: "Audit Keamanan & Kode",
          desc: "Mendeteksi celah keamanan sing mbebayani, nyegah injeksi SQL, XSS, lan kebocoran memori kanthi instan sakdurunge produksi."
        },
        {
          title: "Optimasi Kinerja Kilat",
          desc: "Ngenali bottleneck, menehi rekomendasi teknik caching, lan nambah efisiensi memori program."
        },
        {
          title: "Kode Nyata Multi-Basa",
          desc: "Lancar nulis kode resik ing TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS, lan liyane."
        },
        {
          title: "Desain Arsitektur Resik",
          desc: "Matutake prinsip clean code SOLID, MVC, DRY (Don't Repeat Yourself), nambah modularitas supaya kode gampang diopeni."
        },
        {
          title: "Dhukungan Integrasi API",
          desc: "Nggampangake rancangan integrasi RESTful API, GraphQL, lan otentikasi OAuth kanthi aman lan mutakhir."
        }
      ]
    };
  }

  if (l.includes('sunda')) {
    return {
      headline: "Asisten AI Pipikiran Jero kanggo Kode Nyata Anjeun.",
      subHeadline: "Wilujeng sumping di DAVECORE. Platform kecerdasan buatan revolusioner kalayan logika, pragmatisme, sareng pola pikir jero sapertos programmer senior anu berpengalaman. Ngabantosan anjeun ngadamel kode nyata sacara instan.",
      startChatBtn: "Mulai Obrolan",
      learnFeatures: "Diajar Fitur",
      featuresTitle: "Kaunggulan Utama",
      featuresSub: "Fitur Éksklusif DAVECORE AI",
      featuresDesc: "Ningkatkeun standar pamekaran parangkat lunak anjeun ka tingkat anu pangluhurna kalayan fitur pinter kami.",
      featureLabels: ["Utama", "Premium", "Premium"],
      features: [
        {
          title: "Otak Programmer Senior",
          desc: "Ngabantosan anjeun ngaréngsékeun algoritma rumit, optimasi query basis data, sareng tata arsitektur kode skala ageung kalayan logika asak."
        },
        {
          title: "Audit Kaamanan & Kode",
          desc: "Mendatakeun celah kaamanan anu bahaya, nyegah injeksi SQL, XSS, sareng kabocoran mémori sacara instan sateuacan produksi."
        },
        {
          title: "Optimasi Kinerja Gancang",
          desc: "Ngawanohkeun bottleneck, nyarankeun téknik caching, sareng ningkatkeun éfisiénsi mémori program."
        },
        {
          title: "Kode Nyata Multi-Basa",
          desc: "Lancer nulis kode beresih dina TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS."
        },
        {
          title: "Desain Arsitektur Beresih",
          desc: "Kepatuhan ketat kana prinsip clean code SOLID, MVC, DRY (Don't Repeat Yourself), ningkatkeun modularitas supados kode gampil dipiara."
        },
        {
          title: "Pangrojong Integrasi API",
          desc: "Ngagampilkeun rancangan integrasi RESTful API, GraphQL, sareng otentikasi OAuth kalayan aman sareng mutakhir."
        }
      ]
    };
  }

  if (l.includes('espanol') || l.includes('español') || l.includes('spanish')) {
    return {
      headline: "Asistente de IA de Pensamiento Profundo para tu Código Real.",
      subHeadline: "Bienvenido a DAVECORE. Una plataforma de inteligencia artificial revolucionaria con la lógica, el pragmatismo y la mentalidad profunda de un programador senior experimentado. Le ayuda a diseñar código real de forma instantánea.",
      startChatBtn: "Iniciar Chat",
      learnFeatures: "Ver Funciones",
      featuresTitle: "Ventajas Principales",
      featuresSub: "Funciones Exclusivas de DAVECORE AI",
      featuresDesc: "Eleve el desarrollo de su software al nivel más alto con nuestras funciones inteligentes.",
      featureLabels: ["Principal", "Premium", "Premium"],
      features: [
        {
          title: "Cerebro de Programador Senior",
          desc: "Le ayuda a resolver algoritmos complejos, optimizar consultas de bases de datos y estructurar arquitecturas de código a gran escala con lógica madura."
        },
        {
          title: "Auditoría de Código y Seguridad",
          desc: "Detecta vulnerabilidades peligrosas, previene la inyección de SQL, XSS y fugas de memoria al instante antes de ir a producción."
        },
        {
          title: "Optimización de Rendimiento",
          desc: "Identifica cuellos de botella, recomienda técnicas de almacenamiento en caché y aumenta la eficiencia general del programa."
        },
        {
          title: "Código Real Multiidioma",
          desc: "Escribe código limpio listo para usar en TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS y más."
        },
        {
          title: "Arquitectura de Diseño Limpio",
          desc: "Cumplimiento estricto de los principios de código limpio SOLID, MVC y DRY, mejorando la modularidad para facilitar el mantenimiento."
        },
        {
          title: "Soporte de Integración de API",
          desc: "Facilita el diseño de integraciones de API RESTful, GraphQL y autenticación OAuth externa de la manera más segura y moderna."
        }
      ]
    };
  }

  if (l.includes('francais') || l.includes('français') || l.includes('french')) {
    return {
      headline: "Assistant IA à Réflexion Profonde pour Votre Code Réel.",
      subHeadline: "Bienvenue sur DAVECORE. Une plateforme d'intelligence artificielle révolutionnaire dotée de la logique, du pragmatisme et de l'esprit profond d'un développeur senior expérimenté. Vous aide à concevoir du code réel instantanément.",
      startChatBtn: "Démarrer le Chat",
      learnFeatures: "Découvrir les Fonctionnalités",
      featuresTitle: "Avantages Clés",
      featuresSub: "Fonctionnalités Exclusives DAVECORE AI",
      featuresDesc: "Élevez le développement de vos logiciels au plus haut niveau grâce à nos fonctionnalités intelligentes.",
      featureLabels: ["Principal", "Premium", "Premium"],
      features: [
        {
          title: "Cerveau de Développeur Senior",
          desc: "Vous aide à résoudre des algorithmes complexes, à optimiser les requêtes de base de données et à structurer des architectures à grande échelle avec logique."
        },
        {
          title: "Audit de Sécurité & de Code",
          desc: "Détecte les vulnérabilités dangereuses, empêche l'injection SQL, le XSS et les fuites de mémoire instantanément avant la mise en production."
        },
        {
          title: "Optimisation Ultra-Rapide",
          desc: "Identifie les goulots d'étranglement, recommande des techniques de mise en cache et améliore l'efficacité globale du programme."
        },
        {
          title: "Code Réel Multi-Langages",
          desc: "Écrit du code propre prêt à l'emploi en TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS, etc."
        },
        {
          title: "Architecture de Conception Propre",
          desc: "Respect strict des principes de clean code SOLID, MVC, DRY, améliorant la modularité pour un entretien plus facile."
        },
        {
          title: "Intégration d'API",
          desc: "Facilite la conception d'intégrations d'API RESTful, GraphQL et de l'authentification OAuth externe sécurisée."
        }
      ]
    };
  }

  if (l.includes('deutsch') || l.includes('german')) {
    return {
      headline: "Deep-Thinking KI-Assistent für Ihren echten Code.",
      subHeadline: "Willkommen bei DAVECORE. Eine revolutionäre KI-Plattform mit der Logik, dem Pragmatismus und der Denkweise eines erfahrenen Senior-Programmierers. Hilft Ihnen, echten Code sofort zu entwerfen.",
      startChatBtn: "Chat Starten",
      learnFeatures: "Funktionen Erfahren",
      featuresTitle: "Hauptvorteile",
      featuresSub: "Exklusive Features von DAVECORE AI",
      featuresDesc: "Bringen Sie Ihre Softwareentwicklung mit unseren intelligenten Funktionen auf das höchste Niveau.",
      featureLabels: ["Standard", "Premium", "Premium"],
      features: [
        {
          title: "Senior-Entwickler Verstand",
          desc: "Hilft Ihnen bei der Lösung komplexer Algorithmen, der Optimierung von Datenbankabfragen und der Strukturierung großer Architekturen."
        },
        {
          title: "Sicherheits- & Code-Audit",
          desc: "Erkennt gefährliche Sicherheitslücken, verhindert SQL-Injektionen, XSS und Speicherlecks sofort vor dem Produktionsstart."
        },
        {
          title: "Blitzschnelle Optimierung",
          desc: "Identifiziert Engpässe, empfiehlt Caching-Techniken und erhöht die Effizienz der Programmausführung."
        },
        {
          title: "Echter Multi-Language-Code",
          desc: "Schreibt sauberen Code in TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS und mehr."
        },
        {
          title: "Saubere Design-Architektur",
          desc: "Strikte Einhaltung von SOLID-, MVC- und DRY-Clean-Code-Prinzipien zur Verbesserung der Wartbarkeit."
        },
        {
          title: "API-Integrationsunterstützung",
          desc: "Erleichtert das Design von RESTful APIs, GraphQL und sicherer externer OAuth-Authentifizierung."
        }
      ]
    };
  }

  if (l.includes('nihon') || l.includes('japan')) {
    return {
      headline: "リアルなコードのための深考型AIアシスタント。",
      subHeadline: "DAVECOREへようこそ。経験豊富なシニアプログラマーのような論理、現実主義、そして深い思考力を備えた革新的な人工知能プラットフォームです。リアルなコードを瞬時に設計するのを支援します。",
      startChatBtn: "チャットを開始",
      learnFeatures: "機能を見る",
      featuresTitle: "主な強み",
      featuresSub: "DAVECORE AIの限定機能",
      featuresDesc: "当社のスマートな機能により、ソフトウェア開発の基準を最高レベルに引き上げます。",
      featureLabels: ["メイン", "プレミアム", "プレミアム"],
      features: [
        {
          title: "シニア開発者の思考",
          desc: "複雑なアルゴリズムの解決、データベースクエリの最適化、大規模なコードアーキテクチャの設計を、成熟した論理で支援します。"
        },
        {
          title: "セキュリティ＆コード監査",
          desc: "危険なセキュリティ脆弱性を検出し、SQLインジェクション、XSS、メモリリークを本番稼働前に即座に防ぎます。"
        },
        {
          title: "超高速最適化",
          desc: "ボトルネックを特定し、キャッシュ技術や非同期構造を推奨してプログラムの実行効率を向上させます。"
        },
        {
          title: "マルチ言語リアルコード",
          desc: "TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSSなどで実用的でクリーンなコードを記述します。"
        },
        {
          title: "クリーンな設計構造",
          desc: "SOLID, MVC, DRY原則を厳格に遵守し、メンテナンスを容易にするためのモジュール性を向上させます。"
        },
        {
          title: "API統合サポート",
          desc: "RESTful API、GraphQL、安全な外部OAuth認証の設計と統合を容易にします。"
        }
      ]
    };
  }

  // Default to English
  return {
    headline: "Deep-Thinking AI Assistant for Your Real Code.",
    subHeadline: "Welcome to DAVECORE. A revolutionary artificial intelligence platform with the logic, pragmatism, and deep mindset of an experienced senior programmer. Helping you design real, production-ready code instantly.",
    startChatBtn: "Start Chat",
    learnFeatures: "Learn Features",
    featuresTitle: "Key Advantages",
    featuresSub: "Exclusive DAVECORE AI Features",
    featuresDesc: "Elevate your software development standard to the highest level with our intelligent features.",
    featureLabels: ["Core", "Premium", "Premium"],
    features: [
      {
        title: "Senior Programmer Mind",
        desc: "Helping you solve complex algorithms, optimize database queries, and structure large-scale code architectures with mature logic."
      },
      {
        title: "Security & Code Audit",
        desc: "Detecting dangerous security vulnerabilities, preventing SQL injection, XSS, and memory leaks instantly before production."
      },
      {
        title: "Lightning Optimization",
        desc: "Identifying bottlenecks, recommending caching techniques, asynchronous restructuring, and enhancing execution efficiency."
      },
      {
        title: "Multi-Language Real Code",
        desc: "Fluent in writing clean, ready-to-use code in TypeScript, React, Node.js, Python, Go, Rust, SQL, HTML/CSS, and more."
      },
      {
        title: "Clean Design Architecture",
        desc: "Strict compliance with SOLID, MVC, and DRY clean code principles, enhancing modularity for easier code maintenance."
      },
      {
        title: "API Integration Support",
        desc: "Facilitating the design of RESTful APIs, GraphQL, and secure external OAuth authentications in the most modern ways."
      }
    ]
  };
};

export function LandingPage({ onStartChat, appLang }: LandingPageProps) {
  const trans = getLandingTranslations(appLang);
  const words = trans.headline.split(" ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] via-[#F4F2EC] to-[#EAE7DC] text-[#1F1F1E] flex flex-col relative overflow-x-hidden overflow-y-auto scroll-smooth">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-[#1F1F1E]">DAVECORE</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onStartChat}
            className="hidden md:flex items-center gap-1.5 px-6 py-2.5 bg-[#1F1F1E] text-white rounded-[200px] text-sm font-medium hover:bg-black transition-all shadow-sm"
          >
            Start Chat <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col justify-center items-center text-center z-10 py-16 md:py-24">
        <div className="mb-4" />

        <motion.h1 
          className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-[#1F1F1E] max-w-4xl leading-[1.2] md:leading-[1.1] mb-6 flex flex-wrap justify-center gap-x-2 gap-y-1 md:gap-x-4"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              }
            }
          }}
          initial="hidden"
          animate="visible"
        >
          {words.map((word, idx) => {
            const cleaned = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
            const isBlue = cleaned === "kode" || cleaned === "nyata" || cleaned === "real" || cleaned === "コード" || cleaned === "リアルな";
            return (
              <motion.span
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { duration: 0.4, ease: "easeOut" } 
                  }
                }}
                className={isBlue ? "text-blue-600" : ""}
              >
                {word}
              </motion.span>
            );
          })}
        </motion.h1>

        <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mb-12 leading-relaxed font-sans px-4">
          {trans.subHeadline}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-24 w-full justify-center px-4 max-w-md sm:max-w-xl">
          <button 
            onClick={onStartChat}
            className="px-6 py-3.5 bg-[#1F1F1E] text-white rounded-[200px] text-base font-semibold hover:bg-black transition-all shadow-lg hover:shadow-black/10 flex items-center justify-center gap-2 group flex-1 cursor-pointer"
          >
            {trans.startChatBtn} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <a
            href="#features"
            className="px-6 py-3.5 bg-white/85 border border-gray-200 hover:bg-white text-gray-800 rounded-[200px] text-base font-semibold transition-all shadow-sm flex items-center justify-center gap-2 flex-1"
          >
            {trans.learnFeatures}
          </a>
        </div>

        {/* Fitur Premium & Utama */}
        <section id="features" className="w-full pt-16 border-t border-gray-200/60 text-left max-w-5xl mx-auto mb-12 scroll-mt-24">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600">{trans.featuresTitle}</span>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mt-2 text-[#1F1F1E]">
              {trans.featuresSub}
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto mt-2 text-sm">
              {trans.featuresDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trans.features.map((feat, idx) => {
              const Icon = idx === 0 ? Cpu :
                           idx === 1 ? Shield :
                           idx === 2 ? Zap :
                           idx === 3 ? Code :
                           idx === 4 ? Layers : Globe;
              
              const badgeBg = idx === 0 ? "bg-blue-100 text-blue-800" :
                              idx === 1 ? "bg-amber-100 text-amber-800" :
                              idx === 2 ? "bg-purple-100 text-purple-800" : "";
              
              const iconColor = idx === 0 ? "text-blue-600 bg-blue-50" :
                                idx === 1 ? "text-amber-600 bg-amber-50" :
                                idx === 2 ? "text-purple-600 bg-purple-50" :
                                idx === 3 ? "text-green-600 bg-green-50" :
                                idx === 4 ? "text-pink-600 bg-pink-50" : "text-teal-600 bg-teal-50";

              return (
                <div key={idx} className="bg-white/60 backdrop-blur-sm border border-gray-200/60 p-6 rounded-2xl hover:bg-white transition-all shadow-sm hover:shadow-md relative overflow-hidden group">
                  {idx < 3 && (
                    <div className={`absolute top-3 right-3 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeBg}`}>
                      {trans.featureLabels[idx]}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold mb-2 text-[#1F1F1E]">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
