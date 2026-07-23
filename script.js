// ============================================================
//  script.js - Tomato Plant Diseases Portal
// ============================================================

// Mapeamento de categorias para arquivos JSON
const CATEGORIES = {
    fungal:      { label: 'Fungal Diseases',      icon: 'icons/fungal.svg',      file: 'data/fungal.json' },
    bacterial:   { label: 'Bacterial Diseases',   icon: 'icons/bacterial.svg',   file: 'data/bacterial.json' },
    viral:       { label: 'Viral Diseases',       icon: 'icons/viral.svg',       file: 'data/viral.json' },
    nematodes:   { label: 'Nematodes',            icon: 'icons/nematodes.svg',   file: 'data/nematodes.json' },
    physiological: { label: 'Physiological Disorders', icon: 'icons/physiological.svg', file: 'data/physiological.json' },
    postharvest: { label: 'Postharvest Diseases', icon: 'icons/postharvest.svg', file: 'data/postharvest.json' }
};

// Estado
let allDiseases = {};       // { categoryKey: [doenças] }
let currentCategory = null;
let currentDiseaseId = null;

// DOM
const menuContainer = document.getElementById('menuContainer');
const mainContent = document.getElementById('mainContent');
const searchInput = document.getElementById('searchInput');

// ============================================================
//  Carregar todos os JSONs
// ============================================================
async function loadAllData() {
    const promises = Object.entries(CATEGORIES).map(async ([key, cat]) => {
        try {
            const resp = await fetch(cat.file);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            allDiseases[key] = data;  // espera-se um array de doenças
        } catch (err) {
            console.warn(`Erro ao carregar ${cat.file}:`, err);
            allDiseases[key] = [];
        }
    });
    await Promise.all(promises);
    buildMenu();
    // Se houver busca na URL? Podemos carregar a primeira categoria por padrão
    const firstCat = Object.keys(CATEGORIES)[0];
    if (firstCat && allDiseases[firstCat]?.length) {
        showCategory(firstCat);
    } else {
        showHome();
    }
}

// ============================================================
//  Construir menu lateral (com submenus recolhíveis)
// ============================================================
function buildMenu() {
    menuContainer.innerHTML = '';
    for (const [key, cat] of Object.entries(CATEGORIES)) {
        const diseases = allDiseases[key] || [];
        const li = document.createElement('li');

        // Cabeçalho da categoria
        const catDiv = document.createElement('div');
        catDiv.className = 'category';
        catDiv.dataset.category = key;
        catDiv.innerHTML = `
            <span class="icon">${getIconHTML(cat.icon)}</span>
            <span>${cat.label}</span>
            <span class="arrow">▶</span>
        `;
        catDiv.addEventListener('click', () => toggleCategory(key, catDiv));

        // Submenu
        const subUl = document.createElement('ul');
        subUl.className = 'submenu';
        subUl.dataset.category = key;

        diseases.forEach(disease => {
            const item = document.createElement('li');
            item.textContent = disease.scientific_name || disease.name || 'Sem nome';
            item.dataset.diseaseId = disease.id || disease.scientific_name;
            item.dataset.category = key;
            item.addEventListener('click', () => showDisease(key, disease));
            subUl.appendChild(item);
        });

        li.appendChild(catDiv);
        li.appendChild(subUl);
        menuContainer.appendChild(li);
    }

    // Abrir a primeira categoria por padrão
    const firstKey = Object.keys(CATEGORIES)[0];
    if (firstKey) {
        const catDiv = menuContainer.querySelector(`.category[data-category="${firstKey}"]`);
        if (catDiv) toggleCategory(firstKey, catDiv, true);
    }
}

function getIconHTML(iconPath) {
    // Se o arquivo SVG existir, usamos <img>, senão usamos emoji fallback
    return `<img src="${iconPath}" alt="ícone" style="width:24px;height:24px;" onerror="this.style.display='none';">`;
}

function toggleCategory(key, catDiv, forceOpen = false) {
    const subUl = document.querySelector(`.submenu[data-category="${key}"]`);
    if (!subUl) return;
    const isOpen = subUl.classList.contains('open');
    if (forceOpen && isOpen) return;
    if (forceOpen || !isOpen) {
        subUl.classList.add('open');
        catDiv.classList.add('open');
    } else {
        subUl.classList.remove('open');
        catDiv.classList.remove('open');
    }
}

// ============================================================
//  Navegação: mostrar categoria (lista de doenças)
// ============================================================
function showCategory(key) {
    currentCategory = key;
    currentDiseaseId = null;
    const diseases = allDiseases[key] || [];
    const cat = CATEGORIES[key];
    if (!cat) return;

    // Destacar item do menu
    document.querySelectorAll('.submenu li').forEach(li => li.classList.remove('active'));

    let html = `<h2>${cat.label}</h2><ul style="list-style:none; padding:0;">`;
    diseases.forEach(d => {
        html += `<li style="padding:0.5rem 0; border-bottom:1px solid #f1f5f9; cursor:pointer;" 
                       onclick="showDisease('${key}', ${JSON.stringify(d).replace(/"/g, '&quot;')})">
                    <strong>${d.scientific_name || d.name}</strong>
                    ${d.common_name ? `<span style="color:#64748b; font-size:0.9rem;"> · ${d.common_name}</span>` : ''}
                </li>`;
    });
    html += `</ul>`;
    mainContent.innerHTML = html;
}

// ============================================================
//  Mostrar ficha completa de uma doença
// ============================================================
function showDisease(categoryKey, disease) {
    currentCategory = categoryKey;
    currentDiseaseId = disease.id || disease.scientific_name;

    // Destacar no menu
    document.querySelectorAll('.submenu li').forEach(li => li.classList.remove('active'));
    const menuItem = document.querySelector(`.submenu[data-category="${categoryKey}"] li[data-disease-id="${currentDiseaseId}"]`);
    if (menuItem) menuItem.classList.add('active');

    const fields = ['symptoms', 'signs', 'etiology', 'disease_cycle', 'epidemiology', 'management', 'references'];
    const labels = {
        symptoms: 'Symptoms',
        signs: 'Signs',
        etiology: 'Etiology',
        disease_cycle: 'Disease cycle',
        epidemiology: 'Epidemiology',
        management: 'Management',
        references: 'References'
    };

    let html = `<div class="disease-card">
        <h2>${disease.scientific_name || disease.name || 'Doença'}</h2>
        ${disease.common_name ? `<div class="common-name">${disease.common_name}</div>` : ''}
        
        <!-- Imagens -->
        <div class="section">
            <h3>Images</h3>
            <div class="image-gallery">
                ${buildImageGallery(categoryKey, disease)}
            </div>
        </div>`;

    fields.forEach(f => {
        if (disease[f] && disease[f].length > 0) {
            html += `<div class="section"><h3>${labels[f] || f}</h3>`;
            if (Array.isArray(disease[f])) {
                html += `<ul>${disease[f].map(item => `<li>${item}</li>`).join('')}</ul>`;
            } else {
                html += `<p>${disease[f]}</p>`;
            }
            html += `</div>`;
        }
    });

    html += `</div>`;
    mainContent.innerHTML = html;
}

function buildImageGallery(categoryKey, disease) {
    // Supõe que disease.images seja um array com nomes de arquivo (ex: ['alternaria_1.jpg', ...])
    if (!disease.images || !disease.images.length) {
        return '<p style="color:#94a3b8;">No images available.</p>';
    }
    // Caminho base: images/categoria/
    const basePath = `images/${categoryKey}/`;
    return disease.images.map(img => `
        <img src="${basePath}${img}" alt="Imagem" class="thumb" 
             onclick="openLightbox('${basePath}${img}')" 
             onerror="this.style.display='none';">
    `).join('');
}

// ============================================================
//  Lightbox
// ============================================================
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = src;
    lb.classList.add('open');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
}
// Fechar com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// ============================================================
//  Busca
// ============================================================
searchInput.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase().trim();
    if (term === '') {
        // Volta para a categoria atual ou home
        if (currentCategory) showCategory(currentCategory);
        else showHome();
        return;
    }

    // Procurar em todas as doenças
    let results = [];
    for (const [key, diseases] of Object.entries(allDiseases)) {
        diseases.forEach(d => {
            const name = (d.scientific_name || '').toLowerCase();
            const common = (d.common_name || '').toLowerCase();
            if (name.includes(term) || common.includes(term)) {
                results.push({ category: key, disease: d });
            }
        });
    }

    if (results.length === 0) {
        mainContent.innerHTML = `<p style="color:#64748b;">Nenhuma doença encontrada para "<strong>${term}</strong>".</p>`;
        return;
    }

    let html = `<h2>Resultados para "${term}"</h2><ul style="list-style:none; padding:0;">`;
    results.forEach(r => {
        const catLabel = CATEGORIES[r.category]?.label || r.category;
        html += `<li style="padding:0.6rem 0; border-bottom:1px solid #f1f5f9; cursor:pointer;" 
                   onclick="showDisease('${r.category}', ${JSON.stringify(r.disease).replace(/"/g, '&quot;')})">
                    <strong>${r.disease.scientific_name || r.disease.name}</strong>
                    ${r.disease.common_name ? `<span style="color:#64748b;"> · ${r.disease.common_name}</span>` : ''}
                    <span style="font-size:0.8rem; color:#94a3b8; display:block;">${catLabel}</span>
                </li>`;
    });
    html += `</ul>`;
    mainContent.innerHTML = html;
});

// ============================================================
//  Página inicial (home)
// ============================================================
function showHome() {
    mainContent.innerHTML = `
        <div style="max-width:700px; margin: 0 auto; text-align: center; padding: 2rem 0;">
            <h2 style="color:#2e7d32;">🍅 Tomato Plant Diseases</h2>
            <p style="font-size:1.2rem; color:#475569; margin-top:1rem;">
                Selecione uma categoria no menu lateral para explorar as fichas técnicas.
            </p>
            <p style="color:#94a3b8; margin-top:2rem;">
                Utilize a busca para localizar uma doença pelo nome científico ou comum.
            </p>
        </div>
    `;
}

// ============================================================
//  Inicialização
// ============================================================
document.addEventListener('DOMContentLoaded', loadAllData);

// Expor funções globalmente para uso no HTML (onclick)
window.showDisease = showDisease;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;