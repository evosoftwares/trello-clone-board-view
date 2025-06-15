
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ConnectivityTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { toast } = useToast();

  const runConnectivityTest = async () => {
    setTesting(true);
    setResults([]);
    const testResults: string[] = [];

    try {
      // Teste 1: Verificar configuração básica
      testResults.push('✓ Cliente Supabase inicializado');

      // Teste 2: Teste de conectividade básica
      try {
        const startTime = Date.now();
        const response = await fetch('https://dgkcpzvcotwmfcmhtrjh.supabase.co/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRna2NwenZjb3R3bWZjbWh0cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTAwNDIsImV4cCI6MjA2NTQ4NjA0Mn0.bIZV7YOYwTtw3rwNlOX8MCei9hmUb3LK62gEVndLhwc'
          },
          signal: AbortSignal.timeout(5000) // 5 segundos timeout
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (response.ok) {
          testResults.push(`✓ Conectividade de rede OK (${responseTime}ms)`);
        } else {
          testResults.push(`⚠ Conectividade limitada (Status: ${response.status})`);
        }
      } catch (err: any) {
        if (err.name === 'TimeoutError') {
          testResults.push('✗ Timeout de conexão (>5s)');
        } else {
          testResults.push(`✗ Erro de rede: ${err.message}`);
        }
      }

      // Teste 3: Query simples com timeout
      try {
        const { data: testQuery, error: queryError } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true });

        if (queryError) {
          testResults.push(`✗ Erro na query: ${queryError.message}`);
        } else {
          testResults.push('✓ Query de teste bem-sucedida');
        }
      } catch (err: any) {
        testResults.push(`✗ Erro na query: ${err.message}`);
      }

      // Teste 4: Verificar autenticação
      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          testResults.push(`⚠ Erro ao verificar sessão: ${sessionError.message}`);
        } else {
          testResults.push(session?.session ? '✓ Sessão ativa encontrada' : '⚠ Nenhuma sessão ativa');
        }
      } catch (err: any) {
        testResults.push(`✗ Erro de autenticação: ${err.message}`);
      }

      // Teste 5: Verificar RLS (Row Level Security)
      try {
        const { data: rlsTest, error: rlsError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (rlsError) {
          if (rlsError.code === '42501') {
            testResults.push('⚠ RLS ativo (esperado para usuários não autenticados)');
          } else {
            testResults.push(`✗ Erro RLS: ${rlsError.message}`);
          }
        } else {
          testResults.push('✓ Acesso à tabela profiles OK');
        }
      } catch (err: any) {
        testResults.push(`✗ Erro no teste RLS: ${err.message}`);
      }

    } catch (err: any) {
      testResults.push(`✗ Erro geral: ${err.message || 'Erro desconhecido'}`);
    }

    setResults(testResults);
    setTesting(false);

    const successCount = testResults.filter(r => r.startsWith('✓')).length;
    const totalCount = testResults.length;
    
    toast({
      title: "Teste de conectividade concluído",
      description: `${successCount} de ${totalCount} testes passaram`,
      variant: successCount === totalCount ? "default" : "destructive"
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-3xl">
      <CardHeader>
        <CardTitle className="text-slate-800">Teste de Conectividade</CardTitle>
        <p className="text-sm text-slate-600">Verificar conexão com o Supabase</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runConnectivityTest} 
          disabled={testing}
          className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 font-medium"
        >
          {testing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Testando...
            </div>
          ) : (
            'Executar Teste'
          )}
        </Button>

        {results.length > 0 && (
          <div className="text-sm space-y-2 bg-slate-50/50 p-4 rounded-2xl">
            <h4 className="font-medium text-slate-700 mb-2">Resultados:</h4>
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-2 ${
                  result.startsWith('✓') ? 'text-green-600' : 
                  result.startsWith('⚠') ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                <span className="font-mono text-xs">{result}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectivityTest;
