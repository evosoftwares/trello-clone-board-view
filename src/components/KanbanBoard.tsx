
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TeamMember from './TeamMember';
import KanbanColumn from './KanbanColumn';
import Confetti from 'react-confetti';
import { User, Plus } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  assignee?: string;
  statusImageFilenames?: string[];
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

const KanbanBoard = () => {
  const [runConfetti, setRunConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Define o tamanho inicial
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [teamMembers] = useState([
    { id: '1', name: 'Marcelo', taskCount: 0, avatar: '👨‍💻' },
    { id: '2', name: 'Babi', taskCount: 0, avatar: '👩‍💻' },
    { id: '3', name: 'Victor', taskCount: 0, avatar: '👨‍💼' },
    { id: '4', name: 'Gabriel', taskCount: 0, avatar: '👨‍🎨' },
  ]);

  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'backlog',
      title: 'Backlog',
      tasks: [
        {
          id: 'task-1',
          title: 'Configurar ambiente de desenvolvimento',
          description: 'Instalar todas as dependências e configurar o Docker.',
          tags: ['setup', 'devops', 'config'],
          assignee: 'Marcelo',
          statusImageFilenames: ['bug.svg', 'historia.svg'], // Usando nomes corretos
        },
        {
          id: 'task-2',
          title: 'Criar layout inicial da UI',
          description: 'Desenvolver os componentes básicos da interface do usuário.',
          tags: ['ui', 'frontend'],
          statusImageFilenames: ['subtarefa.svg'], // Usando nome correto
        },
      ],
    },
    {
      id: 'trabalhando',
      title: 'Trabalhando',
      tasks: [
        {
          id: 'task-3',
          title: 'Implementar autenticação de usuário',
          description: 'Usar OAuth2 com Google e Github.',
          tags: ['auth', 'backend', 'security'],
          assignee: 'Babi',
          statusImageFilenames: ['epic.svg', 'tarefas.svg'], // Usando nomes corretos
        },
      ],
    },
    { id: 'revisao', title: 'Revisão Devs', tasks: [] },
    {
      id: 'concluido',
      title: 'Concluído',
      tasks: [] },
  ]);

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = columns.find(col => col.id === source.droppableId);
    const finish = columns.find(col => col.id === destination.droppableId);

    if (!start || !finish) return;

    if (start === finish) {
      const newTasks = Array.from(start.tasks);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);

      const newColumn = { ...start, tasks: newTasks };
      const newColumns = columns.map(col => col.id === newColumn.id ? newColumn : col);
      setColumns(newColumns);
      return;
    }

    const startTasks = Array.from(start.tasks);
    const [removed] = startTasks.splice(source.index, 1);
    const newStart = { ...start, tasks: startTasks };

    const finishTasks = Array.from(finish.tasks);
    finishTasks.splice(destination.index, 0, removed);
    const newFinish = { ...finish, tasks: finishTasks };

    const newColumns = columns.map(col => {
      if (col.id === newStart.id) return newStart;
      if (col.id === newFinish.id) return newFinish;
      return col;
    });

    setColumns(newColumns);

    // Disparar confetes se a tarefa for movida para a coluna "Concluído"
    // e não estava antes na coluna "Concluído"
    if (finish.id === 'concluido' && source.droppableId !== destination.droppableId) {
      setRunConfetti(true);
    }
  };

  const addTask = (columnId: string, title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description: 'Adicione uma descrição para esta tarefa...',
      tags: ['nova tarefa'],
      statusImageFilenames: ['tarefas.svg'], // Imagem padrão correta para novas tarefas
    };
    const newColumns = columns.map(col => 
      col.id === columnId 
        ? { ...col, tasks: [...col.tasks, newTask] }
        : col
    );

    setColumns(newColumns);
  };

  return (
    <>
      {runConfetti && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 9999
        }}>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.25}
            onConfettiComplete={() => setRunConfetti(false)}
          />
        </div>,
        document.body
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Logo and Button */}
          <div className="flex items-center justify-between mb-1">
            <img src="/imagens/logo.svg" alt="Logo" className="w-32 h-32" />
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm py-2 px-6 rounded-full transition-colors duration-200">
              Protocolos
            </button>
          </div>

          {/* Team Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {teamMembers.map((member) => (
                <TeamMember key={member.id} member={member} />
              ))}
            </div>
          </div>

          {/* Kanban Columns */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {columns.map((column) => (
                  <KanbanColumn 
                    key={column.id} 
                    column={column} 
                    onAddTask={addTask}
                  />
                ))}
              </div>
            </div>
          </DragDropContext>
        </div>
      </div>
    </>
  );
};

export default KanbanBoard;
