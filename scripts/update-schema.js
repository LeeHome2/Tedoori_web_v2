
const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const SUPABASE_URL = 'https://iieabdeguunlnvqyhrwm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZWFiZGVndXVubG52cXlocndtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk0OTIyNCwiZXhwIjoyMDgzNTI1MjI0fQ.hMueckIclcCGNpIWT236GCkbqtoPE-ImjelLWApCS6w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function updateSchema() {
    // We cannot execute ALTER TABLE directly via JS client unless we use a stored procedure or SQL editor.
    // But we can try to use rpc if available, or just tell the user to run SQL.
    // However, sometimes just inserting a value into a non-existent column might fail, 
    // but maybe the column exists but cache is stale? 
    // The error "Could not find the 'content' column" strongly suggests it doesn't exist.
    
    // Since I cannot run DDL (ALTER TABLE) directly from here without a specific RPC function,
    // I will try to use the `details` JSON column to store the HTML content temporarily or permanently,
    // OR I will assume the user needs to run the SQL manually.
    // BUT, the user asked me to "fix" it.
    
    // Let's check if we can update the `details` JSONB column instead.
    // The previous migration script tried to update `content` column.
    // If I can't add a column, I should store it in `details->content` or similar.
    // However, the frontend `ProjectDetail.tsx` expects `project.content` (top level) OR we can change frontend to look at `details.content`.
    
    // Let's modify the migration script to save to `details.htmlContent` for now, 
    // AND update the frontend to read from there if top-level `content` is missing.
    // OR, even better, I can try to use the "SQL Editor" via a special tool if I had one, but I don't.
    
    // Wait, I can try to use the 'rpc' if there is a function to run SQL, but unlikely.
    
    // Alternative: Save it into `details` JSON column as `content_html`.
    console.log("Since 'content' column is missing and I cannot alter table schema directly, I will save the HTML content into 'details' JSON column under 'content_html' key.");
    
    console.log('Fetching projects...');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('*');

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    for (const project of projects) {
        let htmlContent = '';
        let needsUpdate = false;
        
        // 1. Migrate existing blocks
        if (project.details?.descriptionBlocks && project.details.descriptionBlocks.length > 0) {
            console.log(`Migrating blocks for: ${project.title}`);
            for (const block of project.details.descriptionBlocks) {
                if (block.type === 'text') {
                    const text = block.content.replace(/\n/g, '<br>');
                    htmlContent += `<p>${text}</p>`;
                } else if (block.type === 'image') {
                    htmlContent += `<img src="${block.content}" alt="Blog Image" style="display: block; margin: 10px auto; max-width: 100%; border-radius: 4px;" />`;
                }
            }
            needsUpdate = true;
        }

        // 2. Inject specific content for "The first"
        if (project.slug === '----the-first' || project.title.includes('Bonghwa Pine Scent Center')) {
             console.log(`Injecting crawled content for: ${project.title}`);
             htmlContent = `
<p><strong>봉화솔향센터｜Bonghwa Pine Scent Center</strong></p>
<p>The first, In progress</p>
<p>위치 : 경상북도 봉화읍 내성리<br>
프로그램 : 목재 친화형 복합문화공간<br>
규모(연면적) : 554.32 ㎡</p>
<p>모여있던 집이 허물어지고 담과 틈으로 구분되던 필지가 하나의 공터가 되었다. 집과 집을 나누던 안쪽의 경계는 온데간데없어도 덩어리의 경계는 뚜렷하다. 서로 조금 차이가 있던 집들의 마당은 하나의 레벨로 평지가 되었다. 그렇게 새로운 크기와 모양을 가진 땅은 조금 이전과 다른 높이로 옆집과 마주한다.봉화군은 전체 면적의 대부분이 임야로 이루어진 고지대 지역이다. 따라서 외부 도시와의 연결은 제한적이며 급격한 개발의 영향을 비교적 덜 받아 자연과 기존 마을 구조가 유지되었다. 이러한 지리적 조건은 도시 성장의 속도를 더디게 했고, 최근에는 인구 감소와 함께 기능을 잃은 공간들이 늘어나고 있다.</p>
<p><strong>본 계획은 길이 스치기만 하던 대지에 만나는 '틈'을 만드는 것에서 출발한다.</strong> 분절된 필지 구조와 닮은 기능을 담은 방들을 나누어 배치함으로써 하나의 큰 건물이 아닌 여러 채가 모인 '마을을 닮은 건축'을 만들고자 하였다. 마을을 향해 열린 경계, 사람을 부르는 구성</p>
<p><strong>단순한 형태의 반복으로 만드는 수평적 확장이라는 구조 전략 안에서,</strong> 건축이 마을과 관계 맺는 방식에 대한 고민의 결과로 장방형의 긴 대지에 두 개의 동을 분리해 배치하고 진입부 일부를 비웠다. 지역을 밝히고, 사람을 모으는 구조</p>
<p><strong>구조 프레임의 반복과 확장을 통해 큰 내부 볼륨을 가진 공간을 형성하여</strong> 행사, 전시, 지역 커뮤니티 모임 등 주민들을 위한 공공건축이 상대적으로 부족한 봉화에 다양한 일상을 수용할 수 있는 공간을 계획하고자 하였다.</p>
`;
            needsUpdate = true;
        }

        if (needsUpdate) {
            const newDetails = {
                ...project.details,
                content_html: htmlContent
            };
            
            const { error: updateError } = await supabase
                .from('projects')
                .update({ details: newDetails })
                .eq('id', project.id);

            if (updateError) {
                console.error(`Failed to update project ${project.id}:`, updateError);
            } else {
                console.log(`Successfully updated content for project ${project.id}`);
            }
        }
    }
}

updateSchema();
