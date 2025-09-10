import React from 'react';
import { ValidationMessage as ValidationMessageType } from '@/lib/validation';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ValidationMessageProps {
  messages: ValidationMessageType[];
  className?: string;
  showIcons?: boolean;
  compact?: boolean;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    className: 'text-red-600 bg-red-50 border-red-200',
    textClassName: 'text-red-800'
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    textClassName: 'text-yellow-800'
  },
  info: {
    icon: Info,
    className: 'text-blue-600 bg-blue-50 border-blue-200',
    textClassName: 'text-blue-800'
  }
};

export function ValidationMessage({ 
  messages, 
  className = '',
  showIcons = true,
  compact = false
}: ValidationMessageProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Group messages by severity
  const groupedMessages = messages.reduce((acc, message) => {
    if (!acc[message.severity]) {
      acc[message.severity] = [];
    }
    acc[message.severity].push(message);
    return acc;
  }, {} as Record<string, ValidationMessageType[]>);

  return (
    <div className={`space-y-1 ${className}`}>
      {(['error', 'warning', 'info'] as const).map(severity => {
        const severityMessages = groupedMessages[severity];
        if (!severityMessages || severityMessages.length === 0) return null;

        const config = severityConfig[severity];
        const Icon = config.icon;

        return (
          <div key={severity}>
            {severityMessages.map((message, index) => (
              <div
                key={`${message.ruleId}-${index}`}
                className={`
                  ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}
                  border rounded-md flex items-start space-x-2
                  ${config.className}
                `}
              >
                {showIcons && (
                  <Icon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} flex-shrink-0 mt-0.5`} />
                )}
                <div className="flex-1">
                  <span className={config.textClassName}>
                    {message.message}
                  </span>
                  {!compact && message.field && (
                    <div className="text-xs opacity-75 mt-1">
                      Campo: {message.field}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

interface FieldValidationMessageProps {
  fieldName: string;
  errors: ValidationMessageType[];
  warnings: ValidationMessageType[];
  info: ValidationMessageType[];
  showAll?: boolean;
  compact?: boolean;
}

export function FieldValidationMessage({
  fieldName,
  errors,
  warnings,
  info,
  showAll = false,
  compact = true
}: FieldValidationMessageProps) {
  const allMessages = [
    ...errors,
    ...(showAll ? warnings : []),
    ...(showAll ? info : [])
  ];

  if (allMessages.length === 0) {
    return null;
  }

  return (
    <div className="mt-1">
      <ValidationMessage 
        messages={allMessages}
        compact={compact}
        showIcons={!compact}
      />
    </div>
  );
}

interface ValidationSummaryProps {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  className?: string;
}

export function ValidationSummary({
  errorCount,
  warningCount,
  infoCount,
  className = ''
}: ValidationSummaryProps) {
  const hasAny = errorCount > 0 || warningCount > 0 || infoCount > 0;
  
  if (!hasAny) {
    return null;
  }

  return (
    <div className={`p-3 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
      <h4 className="text-sm font-medium text-gray-900 mb-2">
        Riepilogo Validazione
      </h4>
      <div className="flex items-center space-x-4 text-sm">
        {errorCount > 0 && (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{errorCount} errore{errorCount > 1 ? 'i' : ''}</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center space-x-1 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{warningCount} avvertimento{warningCount > 1 ? 'i' : ''}</span>
          </div>
        )}
        {infoCount > 0 && (
          <div className="flex items-center space-x-1 text-blue-600">
            <Info className="h-4 w-4" />
            <span>{infoCount} suggerimento{infoCount > 1 ? 'i' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}