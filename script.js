// ============================================================
//  script.js - Tomato Plant Diseases Portal (com subcategorias)
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

// Quais categorias têm subcategorias? (para tratamento especial)
const CATEGORIES_WITH_SUB = ['physiological'];

// Estado
let allDiseases = {};       // { categoryKey: [doenças] }
let currentCategory = null;
let currentSubcategory = null;  // para quando estiver em uma subcategoria
let currentDiseaseId = null;

const menuContainer = document.getElementById('menuContainer');
const mainContent = document.getElementById('mainContent');
const searchInput = document.getElementById('searchInput');

// ============================================================
//  Carregar dados
// ============================================================
async function loadAllData() {
    const promises = Object.entries(CATEGORIES).map(async ([key, cat]) => {
        try {
            const resp = await fetch(cat.file);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            allDiseases[key] = data;
        } catch (err) {
            console.warn(`Erro ao carregar ${cat.file}:`, err);
            allDiseases[key] = [];
        }
    });
    await Promise.all(promises);
    buildMenu();
    // Abrir a primeira categoria por padrão (sem subcategorias)
    const firstKey = Object.keys(CATEGORIES)[0];
    if (firstKey && allDiseases[firstKey]?.length) {
        showCategory(firstKey);
    } else {
        showHome();
    }
}

// ============================================================
//  Construir menu com suporte a subcategorias
// ============================================================
function buildMenu() {
    menuContainer.innerHTML = '';
    for (const [key, cat] of Object.entries(CATEGORIES)) {
        const diseases = allDiseases[key] || [];
        const li = document.createElement('li');

        // Cabeçalho da categoria principal
        const catDiv = document.createElement('div');
        catDiv.className = 'category';
        catDiv.dataset.category = key;
        catDiv.innerHTML = `
            <span class="icon">${getIconHTML(cat.icon)}</span>
            <span>${cat.label}</span>
            <span class="arrow">▶</span>
        `;
        catDiv.addEventListener('click', () => toggleCategory(key, catDiv));

        // Submenu (primeiro nível)
        const subUl = document.createElement('ul');
        subUl.className = 'submenu';
        subUl.dataset.category = key;

        if (CATEGORIES_WITH_SUB.includes(key)) {
            // ---- Categoria com subcategorias ----
            // Agrupar doenças por subcategory
            const groups = {};
            diseases.forEach(d => {
                const sub = d.subcategory || 'Outros';
                if (!groups[sub]) groups[sub] = [];
                groups[sub].push(d);
            });

            for (const [subName, subDiseases] of Object.entries(groups)) {
                const subLi = document.createElement('li');
                // Cabeçalho da subcategoria
                const subCatDiv = document.createElement('div');
                subCatDiv.className = 'category subcategory'; // classe adicional para estilo
                subCatDiv.dataset.subcategory = subName;
                subCatDiv.dataset.category = key;
                subCatDiv.innerHTML = `
                    <span style="margin-left: 1.2rem;">📂</span>
                    <span>${subName}</span>
                    <span class="arrow">▶</span>
                `;
                subCatDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSubcategory(key, subName, subCatDiv);
                });

                // Submenu de doenças (segundo nível)
                const subSubUl = document.createElement('ul');
                subSubUl.className = 'submenu sub-submenu';
                subSubUl.dataset.subcategory = subName;
                subSubUl.dataset.category = key;

                subDiseases.forEach(disease => {
                    const item = document.createElement('li');
                    item.textContent = disease.scientific_name || disease.name || 'Sem nome';
                    item.dataset.diseaseId = disease.id || disease.scientific_name;
                    item.dataset.category = key;
                    item.dataset.subcategory = subName;
                    item.addEventListener('click', () => showDisease(key, disease, subName));
                    subSubUl.appendChild(item);
                });

                subLi.appendChild(subCatDiv);
                subLi.appendChild(subSubUl);
                subUl.appendChild(subLi);
            }
        } else {
            // ---- Categoria sem subcategorias (comportamento original) ----
            diseases.forEach(disease => {
                const item = document.createElement('li');
                item.textContent = disease.scientific_name || disease.name || 'Sem nome';
                item.dataset.diseaseId = disease.id || disease.scientific_name;
                item.dataset.category = key;
                item.addEventListener('click', () => showDisease(key, disease, null));
                subUl.appendChild(item);
            });
        }

        li.appendChild(catDiv);
        li.appendChild(subUl);
        menuContainer.appendChild(li);
    }

    // Abrir a primeira categoria (e sua primeira subcategoria, se houver)
    const firstKey = Object.keys(CATEGORIES)[0];
    if (firstKey) {
        const catDiv = menuContainer.querySelector(`.category[data-category="${firstKey}"]`);
        if (catDiv) {
            toggleCategory(firstKey, catDiv, true);
            // Se for physiological, abrir também a primeira subcategoria
            if (CATEGORIES_WITH_SUB.includes(firstKey)) {
                const firstSub = menuContainer.querySelector(`.subcategory[data-category="${firstKey}"]`);
                if (firstSub) {
                    toggleSubcategory(firstKey, firstSub.dataset.subcategory, firstSub, true);
                }
            }
        }
    }
}

// ============================================================
//  Funções de toggle para categorias e subcategorias
// ============================================================
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

function toggleSubcategory(categoryKey, subName, subCatDiv, forceOpen = false) {
    const subSubUl = document.querySelector(`.sub-submenu[data-category="${categoryKey}"][data-subcategory="${subName}"]`);
    if (!subSubUl) return;
    const isOpen = subSubUl.classList.contains('open');
    if (forceOpen && isOpen) return;
    if (forceOpen || !isOpen) {
        subSubUl.classList.add('open');
        subCatDiv.classList.add('open');
    } else {
        subSubUl.classList.remove('open');
        subCatDiv.classList.remove('open');
    }
}

// ============================================================
//  Navegação: mostrar subcategoria (lista de doenças)
// ============================================================
function showSubcategory(categoryKey, subName) {
    currentCategory = categoryKey;
    currentSubcategory = subName;
    currentDiseaseId = null;

    const diseases = allDiseases[categoryKey] || [];
    const filtered = diseases.filter(d => d.subcategory === subName);
    const catLabel = CATEGORIES[categoryKey]?.label || categoryKey;

    // Destacar itens do menu
    document.querySelectorAll('.submenu li, .sub-submenu li').forEach(li => li.classList.remove('active'));

    let html = `<h2>${catLabel} · ${subName}</h2><ul style="list-style:none; padding:0;">`;
    filtered.forEach(d => {
        html += `<li style="padding:0.5rem 0; border-bottom:1px solid #f1f5f9; cursor:pointer;" 
                       onclick="showDisease('${categoryKey}', ${JSON.stringify(d).replace(/"/g, '&quot;')}, '${subName}')">
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
function showDisease(categoryKey, disease, subcategoryName = null) {
    currentCategory = categoryKey;
    currentSubcategory = subcategoryName;
    currentDiseaseId = disease.id || disease.scientific_name;

    // Destacar no menu
    document.querySelectorAll('.submenu li, .sub-submenu li').forEach(li => li.classList.remove('active'));
    let selector = `.sub-submenu[data-category="${categoryKey}"] li[data-disease-id="${currentDiseaseId}"]`;
    if (!subcategoryName) {
        // se não tem subcategoria, buscar no primeiro nível
        selector = `.submenu[data-category="${categoryKey}"] li[data-disease-id="${currentDiseaseId}"]`;
    }
    const menuItem = document.querySelector(selector);
    if (menuItem) menuItem.classList.add('active');

    // Montar ficha (mesmo código de antes)
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

// ============================================================
//  Funções auxiliares (galeria, ícones, lightbox, busca)
// ============================================================
function buildImageGallery(categoryKey, disease) {
    if (!disease.images || !disease.images.length) {
        return '<p style="color:#94a3b8;">No images available.</p>';
    }
    const basePath = `images/${categoryKey}/`;
    return disease.images.map(img => `
        <img src="${basePath}${img}" alt="Imagem" class="thumb" 
             onclick="openLightbox('${basePath}${img}')" 
             onerror="this.style.display='none';">
    `).join('');
}

function getIconHTML(iconPath) {
    return `<img src="${iconPath}" alt="ícone" style="width:24px;height:24px;" onerror="this.style.display='none';">`;
}

// Lightbox
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = src;
    lb.classList.add('open');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// Busca (mantida igual)
searchInput.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase().trim();
    if (term === '') {
        if (currentCategory) {
            if (currentSubcategory) showSubcategory(currentCategory, currentSubcategory);
            else showCategory(currentCategory);
        } else showHome();
        return;
    }

    let results = [];
    for (const [key, diseases] of Object.entries(allDiseases)) {
        diseases.forEach(d => {
            const name = (d.scientific_name || '').toLowerCase();
            const common = (d.common_name || '').toLowerCase();
            if (name.includes(term) || common.includes(term)) {
                results.push({ category: key, disease: d, sub: d.subcategory || null });
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
                   onclick="showDisease('${r.category}', ${JSON.stringify(r.disease).replace(/"/g, '&quot;')}, '${r.sub || ''}')">
                    <strong>${r.disease.scientific_name || r.disease.name}</strong>
                    ${r.disease.common_name ? `<span style="color:#64748b;"> · ${r.disease.common_name}</span>` : ''}
                    <span style="font-size:0.8rem; color:#94a3b8; display:block;">${catLabel}${r.sub ? ' · ' + r.sub : ''}</span>
                </li>`;
    });
    html += `</ul>`;
    mainContent.innerHTML = html;
});

// Home
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

// Mostrar categoria (sem subcategoria)
function showCategory(key) {
    currentCategory = key;
    currentSubcategory = null;
    currentDiseaseId = null;
    const diseases = allDiseases[key] || [];
    const cat = CATEGORIES[key];
    if (!cat) return;

    document.querySelectorAll('.submenu li, .sub-submenu li').forEach(li => li.classList.remove('active'));

    let html = `<h2>${cat.label}</h2><ul style="list-style:none; padding:0;">`;
    diseases.forEach(d => {
        html += `<li style="padding:0.5rem 0; border-bottom:1px solid #f1f5f9; cursor:pointer;" 
                       onclick="showDisease('${key}', ${JSON.stringify(d).replace(/"/g, '&quot;')}, null)">
                    <strong>${d.scientific_name || d.name}</strong>
                    ${d.common_name ? `<span style="color:#64748b; font-size:0.9rem;"> · ${d.common_name}</span>` : ''}
                </li>`;
    });
    html += `</ul>`;
    mainContent.innerHTML = html;
}

// Expor funções globalmente
window.showDisease = showDisease;
window.showSubcategory = showSubcategory;
window.showCategory = showCategory;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

// Inicialização
document.addEventListener('DOMContentLoaded', loadAllData);