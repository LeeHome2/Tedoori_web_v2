import fs from 'fs';
import path from 'path';
import { Project } from '@/data/projects';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'projects.json');

export const getProjects = (): Project[] => {
  try {
    const fileContent = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading projects data:', error);
    return [];
  }
};

export const saveProjects = (projects: Project[]): boolean => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(projects, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving projects data:', error);
    return false;
  }
};
