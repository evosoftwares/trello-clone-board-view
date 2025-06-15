
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

      // Teste 2: Teste de query simples
      const { data: testQuery, error: queryError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      if (queryError) {
        testResults.push(`✗ Erro na query de teste: ${queryError.message}`);
      } else {
        testResults.push('✓ Query de teste bem-sucedida');
      }

      // Teste 3: Verificar autenticação
      const { data: session } = await supabase.auth.getSession();
      testResults.push(session?.session ? '✓ Sessão ativa encontrada' : '⚠ Nenhuma sessão ativa');

      // Teste 4: Teste de conectividade de rede
      try {
        const response = await fetch('https://dgkcpzvcotwmfcmhtrjh.supabase.co/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRna2NwenZjb3R3bWZjbWh0cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTAwNDIsImV4cCI6MjA2NTQ4NjA0Mn0.bIZV7YOYwTtw3rwNlOX8MCei9hmUb3LK62gEVndLhwc'
          }
        });
        testResults.push(response.ok ? '✓ Conectividade de rede OK' : '✗ Problema de conectividade de rede');
      } catch (err) {
        testResults.push(`✗ Erro de rede: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }

    } catch (err: any) {
      testResults.push(`✗ Erro geral: ${err.message || 'Erro desconhecido'}`);
    }

    setResults(testResults);
    setTesting(false);

    toast({
      title: "Teste de conectividade concluído",
      description: `${testResults.filter(r => r.startsWith('✓')).length} de ${testResults.length} testes passaram`
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Teste de Conectividade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runConnectivityTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Testando...' : 'Executar Teste'}
        </Button>

        {results.length > 0 && (
          <div className="text-sm space-y-1">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`${
                  result.startsWith('✓') ? 'text-green-600' : 
                  result.startsWith('⚠') ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectivityTest;
