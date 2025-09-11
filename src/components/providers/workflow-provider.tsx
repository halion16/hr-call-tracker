'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { workflowOrchestrator } from '@/lib/workflow-orchestrator';
import { DemoDataInitializer } from '@/lib/demo-data-initializer';

interface WorkflowContextType {
  orchestrator: typeof workflowOrchestrator;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

interface WorkflowProviderProps {
  children: ReactNode;
}

export function WorkflowProvider({ children }: WorkflowProviderProps) {
  useEffect(() => {
    // Initialize workflow orchestrator
    console.log('🤖 Initializing Workflow Orchestrator...');
    
    // Initialize demo data first
    DemoDataInitializer.initializeAllDemoData();
    
    // Start orchestration after a short delay to ensure all components are mounted
    const initTimeout = setTimeout(() => {
      workflowOrchestrator.startOrchestration();
    }, 3000);

    return () => {
      clearTimeout(initTimeout);
      workflowOrchestrator.stopOrchestration();
    };
  }, []);

  return (
    <WorkflowContext.Provider value={{ orchestrator: workflowOrchestrator }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}