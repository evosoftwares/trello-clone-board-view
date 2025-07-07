import React, { Component, ReactNode } from 'react';
import { createLogger } from '@/utils/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`Error caught by boundary ${this.props.name || 'Unknown'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Algo deu errado
          </h2>
          
          <p className="text-gray-600 mb-6 max-w-md">
            Ocorreu um erro inesperado nesta seção da aplicação. 
            {this.props.name && ` Componente: ${this.props.name}`}
          </p>

          <div className="space-y-3">
            <Button 
              onClick={this.handleReload}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              Recarregar Página
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 p-4 bg-gray-100 rounded-lg text-left max-w-2xl">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Detalhes do Erro (Desenvolvimento)
              </summary>
              <pre className="text-xs text-red-600 whitespace-pre-wrap">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
                {this.state.errorInfo?.componentStack && '\n\nComponent Stack:'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;