
import React, { useState } from 'react';
import { Tag as TagType } from '@/types/database';
import { Edit, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSecurityCheck } from '@/hooks/useSecurityCheck';
import { SecurityAlert } from '@/components/ui/security-alert';

interface TagItemProps {
  tag: TagType;
  onUpdate: (tagId: string, name: string, color: string) => Promise<void>;
  onDelete: (tagId: string) => Promise<void>;
  isSelected?: boolean;
  onToggle?: (tagId: string) => void;
  showActions?: boolean;
}

export const TagItem: React.FC<TagItemProps> = ({
  tag,
  onUpdate,
  onDelete,
  isSelected = false,
  onToggle,
  showActions = false
}) => {
  const { 
    isSecurityAlertOpen, 
    showSecurityAlert, 
    hideSecurityAlert, 
    confirmedCallback,
    securityTitle,
    securityDescription
  } = useSecurityCheck();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color);

  const handleSave = async () => {
    if (!editName.trim()) return;

    const performUpdate = async () => {
      await onUpdate(tag.id, editName.trim(), editColor);
      setIsEditing(false);
    };

    showSecurityAlert(
      performUpdate,
      'Confirmar Edição',
      'Digite a senha para confirmar a edição da etiqueta:'
    );
  };

  const handleCancel = () => {
    setEditName(tag.name);
    setEditColor(tag.color);
    setIsEditing(false);
  };

  const handleDelete = () => {
    const performDelete = async () => {
      await onDelete(tag.id);
    };

    showSecurityAlert(
      performDelete,
      'Confirmar Exclusão',
      'Digite a senha para confirmar a exclusão da etiqueta:'
    );
  };

  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E', '#64748B', '#374151', '#1F2937'
  ];

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
        <input
          type="color"
          value={editColor}
          onChange={(e) => setEditColor(e.target.value)}
          className="w-6 h-6 rounded border-none cursor-pointer"
        />
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-600 hover:bg-gray-50"
          onClick={handleCancel}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'bg-blue-50 border-blue-200 shadow-sm' 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => onToggle?.(tag.id)}
    >
      <div 
        className="w-4 h-4 rounded-full border border-gray-200"
        style={{ backgroundColor: tag.color }}
      />
      <span className="flex-1 text-sm font-medium text-gray-700 truncate">
        {tag.name}
      </span>
      
      {showActions && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      {isSelected && (
        <Check className="w-4 h-4 text-blue-600" />
      )}
      
      <SecurityAlert
        open={isSecurityAlertOpen}
        onOpenChange={hideSecurityAlert}
        onConfirm={confirmedCallback || (() => {})}
        title={securityTitle}
        description={securityDescription}
      />
    </div>
  );
};
