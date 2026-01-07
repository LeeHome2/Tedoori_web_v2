
const fs = require('fs');
const path = require('path');

const projectsPath = path.join(__dirname, '../src/data/projects.json');
const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

projects.forEach(project => {
    if (!project.galleryImages || project.galleryImages.length === 0) {
        project.galleryImages = [];
        for (let i = 1; i <= 5; i++) {
            const isPortrait = i % 2 === 0;
            const width = isPortrait ? 800 : 1200;
            const height = isPortrait ? 1200 : 800;
            const ext = isPortrait ? 'png' : 'jpg';
            const filename = `sample_${i}_${project.id}.${ext}`;
            
            project.galleryImages.push({
                type: 'image',
                id: `sample-${project.id}-${i}`,
                // Using placehold.co to simulate the image since we can't generate real binary image files
                src: `https://placehold.co/${width}x${height}/${isPortrait ? 'png' : 'jpg'}?text=${filename}`,
                width: width,
                height: height,
                alt: `샘플 이미지 ${i} - ${project.title}`
            });
        }
    }
});

fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), 'utf8');
console.log('Projects updated with sample images.');
