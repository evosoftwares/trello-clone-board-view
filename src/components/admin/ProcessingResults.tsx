
import React from 'react';

interface ProcessingResultsProps {
  results: string[];
  errors: string[];
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({ results, errors }) => {
  return (
    <>
      {results.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-green-600 mb-2">Resultados:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {results.map((result, index) => (
              <li key={index}>✓ {result}</li>
            ))}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-sm">
          <p className="font-medium text-red-600 mb-2">Erros:</p>
          <ul className="space-y-1 text-sm text-red-500">
            {errors.map((error, index) => (
              <li key={index}>✗ {error}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default ProcessingResults;
