import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-12 w-12 text-amber-500" />;
      case 'info':
        return <CheckCircle className="h-12 w-12 text-blue-500" />;
      default:
        return <Info className="h-12 w-12 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          title: 'text-red-900',
          message: 'text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          title: 'text-amber-900',
          message: 'text-amber-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          title: 'text-blue-900',
          message: 'text-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          title: 'text-gray-900',
          message: 'text-gray-700'
        };
    }
  };

  const colors = getColors();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center p-6">
        <div className={`mx-auto w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center mb-4 border-2 ${colors.border}`}>
          {getIcon()}
        </div>

        <h3 className={`text-2xl font-bold mb-3 ${colors.title}`}>
          {title}
        </h3>

        <p className={`text-base mb-6 ${colors.message}`}>
          {message}
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={onClose}
            variant="secondary"
            className="px-8 py-2.5"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={`px-8 py-2.5 ${
              type === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : type === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
