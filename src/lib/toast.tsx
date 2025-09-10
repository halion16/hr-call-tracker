import { toast } from 'sonner';
import { CheckCircle, AlertCircle, XCircle, Info, Clock, Phone, Calendar, Trash2, Edit3, UserCheck } from 'lucide-react';
import { ReactNode } from 'react';

interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast personalizzati per le diverse azioni delle call
export const callToasts = {
  // Success messages con icone specifiche
  callScheduled: (employeeName: string, date: string, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-medium">Call programmata!</div>
          <div className="text-sm text-gray-600">
            {employeeName} - {date}
          </div>
        </div>
      </div>,
      {
        duration: 4000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  callCompleted: (employeeName: string, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-medium">Call completata!</div>
          <div className="text-sm text-gray-600">
            {employeeName}
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  callSuspended: (employeeName: string, options?: ToastOptions) => {
    toast.info(
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 text-blue-600" />
        <div>
          <div className="font-medium">Call sospesa</div>
          <div className="text-sm text-gray-600">
            {employeeName}
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  callResumed: (employeeName: string, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <Phone className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-medium">Call riattivata</div>
          <div className="text-sm text-gray-600">
            {employeeName}
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  callDeleted: (employeeName: string, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <Trash2 className="h-5 w-5 text-gray-600" />
        <div>
          <div className="font-medium">Call eliminata</div>
          <div className="text-sm text-gray-600">
            {employeeName}
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  callRescheduled: (employeeName: string, newDate: string, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <Edit3 className="h-5 w-5 text-blue-600" />
        <div>
          <div className="font-medium">Call riprogrammata</div>
          <div className="text-sm text-gray-600">
            {employeeName} - {newDate}
          </div>
        </div>
      </div>,
      {
        duration: 4000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  // Bulk operations
  bulkCallsScheduled: (count: number, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <UserCheck className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-medium">{count} call programmate!</div>
          <div className="text-sm text-gray-600">
            Operazione completata con successo
          </div>
        </div>
      </div>,
      {
        duration: 4000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  bulkCallsSuspended: (count: number, options?: ToastOptions) => {
    toast.info(
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5 text-blue-600" />
        <div>
          <div className="font-medium">{count} call sospese</div>
          <div className="text-sm text-gray-600">
            Puoi riattivarle in qualsiasi momento
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  bulkCallsResumed: (count: number, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <Phone className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-medium">{count} call riattivate</div>
          <div className="text-sm text-gray-600">
            Le call sono ora attive
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  bulkCallsDeleted: (count: number, options?: ToastOptions) => {
    toast.success(
      <div className="flex items-center gap-3">
        <Trash2 className="h-5 w-5 text-gray-600" />
        <div>
          <div className="font-medium">{count} call eliminate</div>
          <div className="text-sm text-gray-600">
            Operazione completata
          </div>
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  // Error messages
  error: (title: string, description?: string, options?: ToastOptions) => {
    toast.error(
      <div className="flex items-center gap-3">
        <XCircle className="h-5 w-5 text-red-600" />
        <div>
          <div className="font-medium">{title}</div>
          {description && (
            <div className="text-sm text-gray-600">
              {description}
            </div>
          )}
        </div>
      </div>,
      {
        duration: 5000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  // Warning messages
  warning: (title: string, description?: string, options?: ToastOptions) => {
    toast.warning(
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <div>
          <div className="font-medium">{title}</div>
          {description && (
            <div className="text-sm text-gray-600">
              {description}
            </div>
          )}
        </div>
      </div>,
      {
        duration: 4000,
        className: 'slide-in',
        ...options,
      }
    );
  },

  // Info messages
  info: (title: string, description?: string, options?: ToastOptions) => {
    toast.info(
      <div className="flex items-center gap-3">
        <Info className="h-5 w-5 text-blue-600" />
        <div>
          <div className="font-medium">{title}</div>
          {description && (
            <div className="text-sm text-gray-600">
              {description}
            </div>
          )}
        </div>
      </div>,
      {
        duration: 3000,
        className: 'slide-in',
        ...options,
      }
    );
  },
};