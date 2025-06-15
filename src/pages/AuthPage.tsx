
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/lovable-uploads/a10ac338-4759-417e-b7e5-f346ffac3d60.png" 
              alt="Evo Logo" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema Kanban
          </h1>
          <p className="text-gray-600">
            Gerencie suas tarefas e projetos com eficiência
          </p>
        </div>

        {showSetup ? (
          <div>
            <InitialUsersSetup />
            <div className="text-center mt-4">
              <button
                onClick={() => setShowSetup(false)}
                className="text-blue-600 hover:text-blue-700 text-sm"
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
            
            <div className="text-center mt-4">
              <button
                onClick={() => setShowSetup(true)}
                className="text-gray-500 hover:text-gray-700 text-sm"
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
