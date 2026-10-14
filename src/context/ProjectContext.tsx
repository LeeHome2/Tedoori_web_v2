"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Project } from '@/data/projects';
import { useAdmin } from './AdminContext';

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (project: Project, originalId?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projects: Project[]) => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearError: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
  initialProjects?: Project[];
}

export function ProjectProvider({ children, initialProjects = [] }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState(false); // Start with false if we have initial data
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAdmin();
  const refreshVersion = useRef(0);
  const pendingUpdates = useRef(0);
  const updateVersions = useRef(new Map<string, number>());

  // Undo/Redo history
  const [history, setHistory] = useState<Project[][]>([initialProjects]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const clearError = () => setError(null);

  const fetchProjects = useCallback(async () => {
    if (pendingUpdates.current > 0) return;
    const version = ++refreshVersion.current;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      if (version !== refreshVersion.current || pendingUpdates.current > 0) return;
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
      if (version === refreshVersion.current) setError('Failed to load projects');
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (initialProjects.length === 0) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to create project');
        }
        
        const savedProject = await res.json();
        
        // Update state with the real project data (including generated slug/link)
        const finalProjects = [savedProject, ...projects];
        setProjects(finalProjects);
        addToHistory(finalProjects);
        
    } catch (e: unknown) {
        setProjects(previousProjects);
        setError(e instanceof Error ? e.message : 'Failed to create project');
    }
  };

  const updateProject = async (project: Project, originalId?: string) => {
    const targetId = originalId || project.id;
    const previousProject = projects.find(p => p.id === targetId);
    const version = (updateVersions.current.get(targetId) || 0) + 1;
    updateVersions.current.set(targetId, version);
    pendingUpdates.current++;
    refreshVersion.current++;
    setLoading(false);
    setError(null);
    const optimisticProject = { ...project, link: `/projet/${project.id}` };
    setProjects(prev => prev.map(p => p.id === targetId ? optimisticProject : p));

    try {
        const body = originalId ? { ...project, originalId } : project;
        const res = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update project');
        }
        const updatedProject = await res.json();
        if (updateVersions.current.get(targetId) !== version) return;
        setProjects(prev => prev.map(p =>
          p.id === targetId || p.id === project.id ? updatedProject : p
        ));
        addToHistory(projects.map(p => p.id === targetId ? updatedProject : p));
    } catch (e) {
        if (updateVersions.current.get(targetId) === version) {
          setProjects(prev => prev.map(p =>
            previousProject && (p.id === targetId || p.id === project.id) ? previousProject : p
          ));
          setError(e instanceof Error ? e.message : 'Failed to update project');
        }
        throw e;
    } finally {
        pendingUpdates.current--;
        refreshVersion.current++;
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
