"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Project } from '@/data/projects';
import { useAdmin } from './AdminContext';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projects: Project[]) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAdmin();
  
  // Undo/Redo history
  const [history, setHistory] = useState<Project[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const clearError = () => setError(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      // Initialize history
      if (historyIndex === -1) {
          setHistory([data]);
          setHistoryIndex(0);
      }
    } catch (error) {
      console.error('Failed to fetch projects', error);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const addToHistory = (newProjects: Project[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newProjects);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const undo = useCallback(async () => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          const prevProjects = history[newIndex];
          setProjects(prevProjects);
          
          // Sync with server (Auto-save)
          if (isAdmin) {
              try {
                  await fetch('/api/projects', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(prevProjects),
                  });
              } catch (e) {
                  setError('Undo failed: Could not sync with server');
              }
          }
      }
  }, [history, historyIndex, isAdmin]);

  const redo = useCallback(async () => {
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          const nextProjects = history[newIndex];
          setProjects(nextProjects);

           // Sync with server
           if (isAdmin) {
            try {
                await fetch('/api/projects', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nextProjects),
                });
            } catch (e) {
                setError('Redo failed: Could not sync with server');
            }
        }
      }
  }, [history, historyIndex, isAdmin]);

  const addProject = async (project: Project) => {
    const previousProjects = [...projects];
    // Optimistic update with temp data (potentially missing slug)
    // We add it to state so UI feels fast, but we need to replace it with server response
    const tempProjects = [project, ...projects];
    setProjects(tempProjects);
    
    // Don't add temp state to history yet to avoid bad states in undo stack
    // Or we could, but let's wait for confirmation

    try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        });
        
        if (!res.ok) throw new Error('Failed to create project');
        
        const savedProject = await res.json();
        
        // Update state with the real project data (including generated slug/link)
        const finalProjects = [savedProject, ...projects];
        setProjects(finalProjects);
        addToHistory(finalProjects);
        
    } catch (e) {
        setProjects(previousProjects);
        setError('Failed to create project');
    }
  };

  const updateProject = async (project: Project) => {
    const previousProjects = [...projects];
    const newProjects = projects.map(p => p.id === project.id ? project : p);
    setProjects(newProjects);
    addToHistory(newProjects);

    try {
        const res = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        });
        if (!res.ok) throw new Error('Failed to update project');
    } catch (e) {
        setProjects(previousProjects);
        setError('Failed to update project');
    }
  };

  const deleteProject = async (id: string) => {
    const previousProjects = [...projects];
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    addToHistory(newProjects);

    try {
        const res = await fetch(`/api/projects?id=${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete project');
    } catch (e) {
        setProjects(previousProjects);
        setError('Failed to delete project');
        // Optional: Pop history to sync
    }
  };

  const reorderProjects = async (newProjects: Project[]) => {
      const previousProjects = [...projects];
      setProjects(newProjects);
      addToHistory(newProjects);
      
      try {
          const res = await fetch('/api/projects', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProjects),
          });
          if (!res.ok) throw new Error('Failed to reorder projects');
      } catch (e) {
          setProjects(previousProjects);
          setError('Failed to save order');
      }
  }

  return (
    <ProjectContext.Provider value={{ 
        projects, 
        loading, 
        error,
        refreshProjects: fetchProjects, 
        addProject, 
        updateProject, 
        deleteProject, 
        reorderProjects, 
        undo, 
        redo, 
        canUndo: historyIndex > 0, 
        canRedo: historyIndex < history.length - 1, 
        clearError 
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
