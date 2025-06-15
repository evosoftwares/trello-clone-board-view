
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg">
            <img 
              src="/lovable-uploads/a10ac338-4759-417e-b7e5-f346ffac3d60.png" 
              alt="Evo Logo" 
              className="h-12 w-auto"
            />
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm px-8 py-10 rounded-3xl shadow-lg max-w-md mx-auto">
          <h1 className="text-6xl font-bold mb-4 text-slate-800">404</h1>
          <p className="text-xl text-slate-600 mb-6 font-medium">Oops! Página não encontrada</p>
          <a 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
