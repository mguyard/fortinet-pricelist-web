let allData = []; // Variable globale pour stocker toutes les données
let activeFilters = {
    columns: {}, // Pour les filtres de colonne
    search: []   // Pour les termes de recherche
};
let itemsPerPage = 50;

function loadYears() {
    fetch('/api/years')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(years => {
            console.log('Years received:', years);
            const select = document.getElementById('yearSelect');
            select.innerHTML = '<option value="">Sélectionnez une année</option>';
            if (years.length === 0) {
                console.log('No years found');
                const option = document.createElement('option');
                option.textContent = 'Aucune année disponible';
                select.appendChild(option);
            } else {
                years.sort((a, b) => b - a);
                years.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    select.appendChild(option);
                });
                const mostRecentYear = years[0];
                select.value = mostRecentYear;
                loadQuarters(mostRecentYear);
            }
            select.addEventListener('change', (event) => loadQuarters(event.target.value));
        })
        .catch(error => {
            console.error('Error loading years:', error);
            const select = document.getElementById('yearSelect');
            select.innerHTML = '<option value="">Erreur de chargement des années</option>';
        });
}

function loadQuarters(year) {
    if (!year) return;

    fetch(`/api/quarters?year=${encodeURIComponent(year)}`)
        .then(response => response.json())
        .then(quarters => {
            const select = document.getElementById('quarterSelect');
            select.innerHTML = '<option value="">Sélectionnez un trimestre</option>';
            select.disabled = false;

            quarters.sort((a, b) => {
                const numA = parseInt(a.split('Q')[1]);
                const numB = parseInt(b.split('Q')[1]);
                return numB - numA;
            });

            quarters.forEach(quarter => {
                const option = document.createElement('option');
                option.value = quarter;
                option.textContent = quarter.split(' ')[0];
                select.appendChild(option);
            });

            if (quarters.length > 0) {
                select.value = quarters[0];
                loadFiles(year, quarters[0]);
            }
            select.addEventListener('change', (event) => loadFiles(year, event.target.value));
        })
        .catch(error => {
            console.error('Error loading quarters:', error);
        });
}

function loadFiles(year, quarter) {
    if (!year || !quarter) return;

    fetch(`/api/files?year=${encodeURIComponent(year)}&quarter=${encodeURIComponent(quarter)}`)
        .then(response => response.json())
        .then(files => {
            const select = document.getElementById('fileSelect');
            select.innerHTML = '<option value="">Sélectionnez un fichier</option>';
            select.disabled = false;
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = formatFileName(file.name, year, quarter);
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading files:', error);
        });
}

function formatFileName(fileName, year, quarter) {
    let formattedName = fileName.replace(`${year} ${quarter} `, '').replace('.xlsx', '');
    return formattedName;
}

function searchData() {
    const year = document.getElementById('yearSelect').value;
    const quarter = document.getElementById('quarterSelect').value;
    const file = document.getElementById('fileSelect').value;
    const search = document.getElementById('searchInput').value;

    if (!year || !quarter || !file) {
        alert('Veuillez sélectionner une année, un trimestre et un fichier.');
        return;
    }

    if (search.trim() !== '') {
        addFilter('Search', search.trim());
    }

    fetch(`/api/data?year=${encodeURIComponent(year)}&quarter=${encodeURIComponent(quarter)}&file=${encodeURIComponent(file)}&search=${encodeURIComponent(search)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error('Les données reçues ne sont pas un tableau');
            }
            allData = data;
            currentPage = 1;
            updatePagination();
        })
        .catch(error => {
            console.error('Error searching data:', error);
            document.getElementById('results').innerHTML = `<p>Erreur lors de la recherche des données: ${error.message}</p>`;
        });
}

// function displayResults(data) {
//     // Mettre à jour le tableau avec les données filtrées
//     renderTable(data);
    
//     // Mettre à jour la pagination
//     currentPage = 1; // Réinitialiser à la première page après un changement de filtre
//     updatePagination(data);
    
//     // Mettre à jour les tags de filtre affichés
//     updateFilterTags();
// }

function updatePagination(filteredData = null) {
    const dataToPaginate = filteredData || allData;
    const totalPages = Math.ceil(dataToPaginate.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = dataToPaginate.slice(startIndex, endIndex);

    renderTable(currentPageData);
    renderPaginationControls(totalPages);
    updateFilterTags();
}

function renderTable(data) {
    console.log(data.length, 'rows to display');
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = tbody.insertRow();
        const columns = ['Product Family Group', 'Product', 'Product Type', 'Description #1', 'Price'];
        columns.forEach(column => {
            const cell = row.insertCell();
            cell.textContent = item[column] || '';
            if (column === 'Price') {
                cell.textContent = `$${item[column].toFixed(2)}`;
            }
            if (column !== 'Price') {
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e, column, item[column]);
                });
            }
        });
    });

    if (data.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.textContent = 'Aucun résultat trouvé';
    }
}

function renderPaginationControls(totalPages) {
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';

    function addPageItem(pageNum, text = pageNum, disabled = false) {
        const li = document.createElement('li');
        li.className = `page-item ${pageNum === currentPage ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        if (!disabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = pageNum;
                updatePagination();
            });
        }
        li.appendChild(a);
        paginationElement.appendChild(li);
    }

    // Première page
    addPageItem(1);

    // Pages précédentes
    if (currentPage > 3) {
        addPageItem(null, '...', true);
    }
    for (let i = Math.max(2, currentPage - 2); i < currentPage; i++) {
        addPageItem(i);
    }

    // Page courante
    if (currentPage !== 1 && currentPage !== totalPages) {
        addPageItem(currentPage);
    }

    // Pages suivantes
    for (let i = currentPage + 1; i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        addPageItem(i);
    }
    if (currentPage < totalPages - 3) {
        addPageItem(null, '...', true);
    }

    // Dernière page
    if (totalPages > 1) {
        addPageItem(totalPages);
    }
}

function showContextMenu(event, column, value) {
    event.preventDefault();
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `<div class="context-menu-item">Add filter: ${column} = ${value}</div>`;
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;

    document.body.appendChild(contextMenu);

    const menuItem = contextMenu.querySelector('.context-menu-item');
    menuItem.addEventListener('click', () => {
        addFilter(column, value);
        contextMenu.remove();
    });

    document.addEventListener('click', function closeMenu() {
        contextMenu.remove();
        document.removeEventListener('click', closeMenu);
    });
}

function addFilter(column, value) {
    if (column === 'Search') {
        if (!activeFilters.search.includes(value)) {
            activeFilters.search.push(value);
        }
    } else {
        activeFilters.columns[column] = value;
    }
    applyFilters();
    updateFilterTags();
}

function removeFilter(column, value) {
    console.log('Removing filter:', column, value);
    if (column === 'Search') {
        activeFilters.search = activeFilters.search.filter(term => term !== value);
    } else {
        delete activeFilters.columns[column];
    }
    applyFilters();
    updateFilterTags();
}

function applyFilters() {
    console.log(allData.length, 'rows before filtering');
    const filteredData = allData.filter(item => {
        // Vérifier les filtres de colonne
        const columnFiltersPassed = Object.entries(activeFilters.columns).every(([column, value]) => item[column] === value);

        // Vérifier les termes de recherche
        const searchFiltersPassed = activeFilters.search.length === 0 || activeFilters.search.every(term => 
            Object.values(item).some(itemValue => 
                String(itemValue).toLowerCase().includes(term.toLowerCase())
            )
        );

        // Retourner vrai seulement si les deux filtres passent
        return columnFiltersPassed && searchFiltersPassed;
    });
    console.log(filteredData.length, 'rows after filtering');
    updatePagination(filteredData);
}

function updateFilterTags() {
    const filterTagsContainer = document.getElementById('filterTags');
    filterTagsContainer.innerHTML = '';

    // Afficher les filtres de colonne
    Object.entries(activeFilters.columns).forEach(([column, value]) => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = `${column}: ${value}`;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'x';
        removeButton.onclick = () => removeFilter(column);
        tag.appendChild(removeButton);
        filterTagsContainer.appendChild(tag);
    });

    // Afficher les termes de recherche
    activeFilters.search.forEach(term => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = `Search: ${term}`;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'x';
        removeButton.onclick = () => removeFilter('Search', term);
        tag.appendChild(removeButton);
        filterTagsContainer.appendChild(tag);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    loadYears();

    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1; // Reset to first page when changing items per page
        updatePagination();
    });

    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        searchData();
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchData();
        }
    });

    // Ajoutez cet écouteur pour l'icône "vider"
    const clearSearchButton = document.getElementById('clearSearchButton');
    clearSearchButton.addEventListener('click', () => {
        searchInput.value = ''; // Vider le champ de recherche
        applyFilters(); // Appliquer les filtres pour mettre à jour l'affichage
    });
});