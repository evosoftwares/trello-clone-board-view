
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import SignUpForm from '@/components/auth/SignUpForm';
import InitialUsersSetup from '@/components/admin/InitialUsersSetup';

const AuthPage: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to main page
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-8 py-6 rounded-3xl shadow-lg">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium text-slate-700">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-3xl shadow-lg">
              <img 
                src="/lovable-uploads/a10ac338-4759-417e-b7e5-f346ffac3d60.png" 
                alt="Evo Logo" 
                className="h-10 w-auto"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Sistema Kanban
          </h1>
          <p className="text-slate-600 font-medium">
            Gerencie suas tarefas e projetos com eficiência
          </p>
        </div>

        {showSetup ? (
          <div>
            <InitialUsersSetup />
            <div className="text-center mt-6">
              <button
                onClick={() => setShowSetup(false)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium bg-white/50 hover:bg-white/70 px-4 py-2 rounded-full transition-all duration-200"
              >
                ← Voltar para login
              </button>
            </div>
          </div>
        ) : (
          <div>
            {isLoginMode ? (
              <LoginForm onToggleMode={toggleMode} />
            ) : (
              <SignUpForm onToggleMode={toggleMode} />
            )}
            
            <div className="text-center mt-6">
              <button
                onClick={() => setShowSetup(true)}
                className="text-slate-500 hover:text-slate-700 text-sm font-medium bg-white/30 hover:bg-white/50 px-4 py-2 rounded-full transition-all duration-200"
              >
                Configurar usuários iniciais
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
