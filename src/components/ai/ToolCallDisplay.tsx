// @ts-nocheck
import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ToolCallDisplayProps {
  toolResult: any;
}

export default function ToolCallDisplay({ toolResult }: ToolCallDisplayProps) {
  // Базов дисплей за резултати от tools
  const isSuccess = toolResult?.result?.success;

  return (
    <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-700 mt-2 flex flex-col gap-1 border border-gray-100">
      <div className="flex items-center gap-1 font-medium">
        {isSuccess ? (
          <CheckCircle2 size={14} className="text-green-600" />
        ) : (
          <AlertCircle size={14} className="text-amber-500" />
        )}
        <span>Действие: {toolResult.toolName}</span>
      </div>
      
      {toolResult.result?.message && (
        <div className="pl-5 text-gray-500 italic">
          {toolResult.result.message}
        </div>
      )}
    </div>
  );
}
