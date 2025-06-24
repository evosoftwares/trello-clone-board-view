
import React, { useState, useMemo } from 'react';
import { Tag as TagType, TaskTag } from '@/types/database';
import { TagItem } from './TagItem';
import { createLogger } from '@/utils/logger';
import { useSecurityCheck } from '@/hooks/useSecurityCheck';
import { Plus, Search, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SecurityAlert } from '@/components/ui/security-alert';

interface TagSelectorProps {
  taskId: string;
  allTags: TagType[];
  taskTags: TaskTag[];
  onAddTagToTask: (taskId: string, tagId: string) => Promise<void>;
  onRemoveTagFromTask: (taskId: string, tagId: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<void>;
  onUpdateTag: (tagId: string, name: string, color: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  trigger?: React.ReactNode;
}

const logger = createLogger('TagSelector');

export const TagSelector: React.FC<TagSelectorProps> = ({
  taskId,
  allTags,
  taskTags,
  onAddTagToTask,
  onRemoveTagFromTask,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  trigger
}) => {
  const { 
    isSecurityAlertOpen, 
    showSecurityAlert, 
    hideSecurityAlert, 
    confirmedCallback,
    securityTitle,
    securityDescription
  } = useSecurityCheck();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isCreating, setIsCreating] = useState(false);
  const [recentTags, setRecentTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentTags');
    return saved ? JSON.parse(saved) : [];
  });

  // Get current task tags
  const currentTaskTagIds = taskTags
    .filter(tt => tt.task_id === taskId)
    .map(tt => tt.tag_id);

  // Filter and sort tags
  const { availableTags, recentAvailableTags } = useMemo(() => {
    const filtered = allTags.filter(tag => 
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const recent = filtered.filter(tag => recentTags.includes(tag.id));
    const others = filtered.filter(tag => !recentTags.includes(tag.id));

    return {
      availableTags: others,
      recentAvailableTags: recent
    };
  }, [allTags, searchTerm, recentTags]);

  const handleToggleTag = async (tagId: string) => {
    const isSelected = currentTaskTagIds.includes(tagId);
    
    try {
      if (isSelected) {
        await onRemoveTagFromTask(taskId, tagId);
      } else {
        await onAddTagToTask(taskId, tagId);
        // Add to recent tags
        const updatedRecent = [tagId, ...recentTags.filter(id => id !== tagId)].slice(0, 5);
        setRecentTags(updatedRecent);
        localStorage.setItem('recentTags', JSON.stringify(updatedRecent));
      }
    } catch (error) {
      logger.error('Error toggling tag', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      logger.warn('Cannot create tag with empty name');
      return;
    }

    const performCreate = async () => {
      logger.info('Creating tag', { name: newTagName.trim(), color: newTagColor });
      setIsCreating(true);
      
      try {
        await onCreateTag(newTagName.trim(), newTagColor);
        logger.info('Tag created successfully');
        setNewTagName('');
        setNewTagColor('#3B82F6');
        setShowCreateForm(false);
      } catch (error) {
        logger.error('Failed to create tag', error);
      } finally {
        setIsCreating(false);
      }
    };

    showSecurityAlert(
      performCreate,
      'Confirmar Criação',
      'Digite a senha para confirmar a criação da etiqueta:'
    );
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-8 rounded-lg">
      <Tag className="w-4 h-4 mr-1" />
      Etiquetas
    </Button>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-0" align="start">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <Tag className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Etiquetas</h3>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar etiquetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 rounded-xl border-gray-200"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {/* Recent Tags */}
          {recentAvailableTags.length > 0 && (
            <div className="p-4 border-b border-gray-50">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Recentes
              </h4>
              <div className="space-y-2">
                {recentAvailableTags.map(tag => (
                  <TagItem
                    key={tag.id}
                    tag={tag}
                    onUpdate={onUpdateTag}
                    onDelete={onDeleteTag}
                    isSelected={currentTaskTagIds.includes(tag.id)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Tags */}
          {availableTags.length > 0 && (
            <div className="p-4">
              {recentAvailableTags.length > 0 && (
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Todas
                </h4>
              )}
              <div className="space-y-2">
                {availableTags.map(tag => (
                  <TagItem
                    key={tag.id}
                    tag={tag}
                    onUpdate={onUpdateTag}
                    onDelete={onDeleteTag}
                    isSelected={currentTaskTagIds.includes(tag.id)}
                    onToggle={handleToggleTag}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {availableTags.length === 0 && recentAvailableTags.length === 0 && searchTerm && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Nenhuma etiqueta encontrada</p>
            </div>
          )}
        </div>

        {/* Create New Tag */}
        <div className="p-4 border-t border-gray-100">
          {showCreateForm ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-8 h-8 rounded border-none cursor-pointer"
                />
                <Input
                  placeholder="Nome da etiqueta..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 h-9 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTag();
                    if (e.key === 'Escape') setShowCreateForm(false);
                  }}
                  autoFocus
                  disabled={isCreating}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateTag}
                  className="flex-1 h-8 rounded-xl"
                  disabled={isCreating || !newTagName.trim()}
                >
                  {isCreating ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                    setNewTagColor('#3B82F6');
                  }}
                  className="flex-1 h-8 rounded-xl"
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 rounded-xl border-dashed border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar nova etiqueta
            </Button>
          )}
        </div>
      </PopoverContent>
      
      <SecurityAlert
        open={isSecurityAlertOpen}
        onOpenChange={hideSecurityAlert}
        onConfirm={confirmedCallback || (() => {})}
        title={securityTitle}
        description={securityDescription}
      />
    </Popover>
  );
};
