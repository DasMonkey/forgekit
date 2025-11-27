import React from 'react';
import { Upload } from 'lucide-react';
import { ToolSubmenu, ToolSubmenuOption } from './ToolSubmenu';

interface UploadSubmenuProps {
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onUploadImage: () => void;
}

export const UploadSubmenu: React.FC<UploadSubmenuProps> = ({
  visible,
  position,
  onClose,
  onUploadImage,
}) => {
  const options: ToolSubmenuOption[] = [
    {
      id: 'upload-image',
      label: 'Upload Image',
      icon: Upload,
      onClick: onUploadImage,
    },
  ];

  return (
    <ToolSubmenu
      visible={visible}
      position={position}
      options={options}
      onClose={onClose}
      title="Add to Canvas"
    />
  );
};
