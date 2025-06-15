
import React, { useState, useRef } from 'react';
import { MessageCircle, Send, Trash2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTaskComments } from '@/hooks/useTaskComments';
import { Profile } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TaskCommentsProps {
  taskId: string;
  allProfiles: Profile[];
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, allProfiles }) => {
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { comments, profiles, loading, addComment, deleteComment } = useTaskComments(taskId);
  const { user } = useAuth();

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewComment(value);
    setCursorPosition(cursorPos);

    // Detectar menção (@)
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  const insertMention = (profile: Profile) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const textAfterCursor = newComment.substring(cursorPosition);
    
    // Encontrar o início da menção (@)
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    const beforeMention = textBeforeCursor.substring(0, mentionStart);
    const mention = `@${profile.name} `;
    
    const newText = beforeMention + mention + textAfterCursor;
    setNewComment(newText);
    setShowMentions(false);
    
    // Focar o textarea e posicionar cursor
    setTimeout(() => {
      const newPosition = beforeMention.length + mention.length;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Extrair usuários mencionados
    const mentionedUsernames = newComment.match(/@(\w+)/g) || [];
    const mentionedUsers = mentionedUsernames
      .map(username => {
        const name = username.substring(1); // Remove @
        return allProfiles.find(p => p.name.toLowerCase() === name.toLowerCase())?.id;
      })
      .filter(Boolean) as string[];

    await addComment(newComment, mentionedUsers);
    setNewComment('');
  };

  const filteredProfiles = allProfiles.filter(profile =>
    profile.name.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const renderCommentContent = (content: string) => {
    // Substituir menções por spans destacados
    return content.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        const mentionedProfile = allProfiles.find(p => 
          p.name.toLowerCase() === username.toLowerCase()
        );
        
        if (mentionedProfile) {
          return (
            <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <MessageCircle className="w-6 h-6 mx-auto mb-2 animate-pulse" />
        Carregando comentários...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">
          Comentários ({comments.length})
        </h3>
      </div>

      {/* Lista de comentários */}
      <div className="space-y-4 max-h-60 overflow-y-auto">
        {comments.map((comment) => {
          const commentProfile = profiles.find(p => p.id === comment.user_id);
          const isOwner = user?.id === comment.user_id;
          
          return (
            <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-sm font-medium">
                  {commentProfile?.name.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">
                      {commentProfile?.name || 'Usuário'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <div className="text-sm text-gray-700 break-words">
                  {renderCommentContent(comment.content)}
                </div>
              </div>
            </div>
          );
        })}
        
        {comments.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum comentário ainda</p>
            <p className="text-xs mt-1">Seja o primeiro a comentar!</p>
          </div>
        )}
      </div>

      {/* Formulário de novo comentário */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            placeholder="Escreva um comentário... Use @ para mencionar usuários"
            className="resize-none border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          
          {/* Lista de menções */}
          {showMentions && filteredProfiles.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
              {filteredProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                  onClick={() => insertMention(profile)}
                >
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-medium">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{profile.name}</div>
                    <div className="text-xs text-gray-500">@{profile.name.toLowerCase()}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AtSign className="w-3 h-3" />
            <span>Use @ para mencionar usuários</span>
          </div>
          
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim()}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Send className="w-4 h-4 mr-1" />
            Comentar
          </Button>
        </div>
      </form>
    </div>
  );
};
