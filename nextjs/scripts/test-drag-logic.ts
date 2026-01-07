import { Project } from "@/data/projects";

// Mock implementation of arrayMove
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}

// Simple test for drag logic (array move)
function testReorder() {
  console.log('Testing Reorder Logic...');
  const initialProjects: Partial<Project>[] = [
    { id: '1', title: 'P1' },
    { id: '2', title: 'P2' },
    { id: '3', title: 'P3' }
  ];

  // Move P1 (index 0) to position of P2 (index 1)
  const moved = arrayMove(initialProjects, 0, 1);
  
  if (moved[0].id === '2' && moved[1].id === '1' && moved[2].id === '3') {
    console.log('✅ Array move logic correct (0 -> 1)');
  } else {
    console.error('❌ Array move logic failed', moved);
  }

  // Move P3 (index 2) to start (index 0)
  const moved2 = arrayMove(initialProjects, 2, 0);
  if (moved2[0].id === '3' && moved2[1].id === '1') {
    console.log('✅ Array move logic correct (2 -> 0)');
  } else {
    console.error('❌ Array move logic failed', moved2);
  }
}

testReorder();
