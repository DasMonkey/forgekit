import React from 'react';
import { Pencil, Pen } from 'lucide-react';
import { ToolSubmenu, ToolSubmenuOption } from './ToolSubmenu';

export type PencilMode = 'pencil' | 'pen';

interface PencilSubmenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelectMode: (mode: PencilMode) => void;
}

export const PencilSubmenu: React.FC<PencilSubmenuProps> = ({
  visible,
  position,
  onClose,
  onSelectMode,
}) => {
  const options: ToolSubmenuOption[] = [
    {
      id: 'pencil',
      label: 'Pencil',
      icon: Pencil,
      shortcut: 'Shift + P',
      onClick: () => onSelectMode('pencil'),
    },
    {
      id: 'pen',
      label: 'Pen',
      icon: Pen,
      shortcut: 'P',
      onClick: () => onSelectMode('pen'),
    },
  ];

  return (
    <ToolSubmenu
      visible={visible}
      position={position}
      options={options}
      onClose={onClose}
    />
  );
};
