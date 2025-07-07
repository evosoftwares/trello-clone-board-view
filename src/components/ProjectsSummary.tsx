import React from 'react';
import { useProjectsSummary } from '@/hooks/useProjectsSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const ProjectsSummary = () => {
  const { projectsSummary, loading, error } = useProjectsSummary();

  if (loading) {
    return (
      <div className="flex-shrink-0 space-y-3 lg:space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load projects summary: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (projectsSummary.length === 0) {
    return null; 
  }

  return (
    <div className="flex-shrink-0 space-y-3 lg:space-y-4">
      <h2 className="text-base lg:text-lg font-semibold text-gray-800 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        Resumo dos Projetos ({projectsSummary.length})
      </h2>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
        {projectsSummary.map((project) => (
          <div key={project.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:border-blue-300 transition-all duration-200 cursor-pointer">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between">
                <div className="overflow-hidden">
                  <p className="font-medium text-gray-800 truncate" title={project.name}>{project.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{project.client_name || 'Interno'}</p>
                </div>
                <div className="flex items-center space-x-2 ml-2 shrink-0">
                  <div className="min-w-8 h-8 px-2 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">{project.totalFunctionPoints}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">FPs</span>
                </div>
              </div>
              
              <div className="flex-grow flex flex-col justify-end mt-3">
                <div className="text-xs text-gray-500 mb-1 text-right">
                  {Math.round(project.completionPercentage)}%
                </div>
                <Progress value={project.completionPercentage} className="w-full h-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsSummary; 