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
            // console.log('Years received:', years);
            const select = document.getElementById('yearSelect');
            select.innerHTML = '<option value="">Please select a year</option>';
            if (years.length === 0) {
                console.log('No years found');
                const option = document.createElement('option');
                option.textContent = 'No years found';
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
            select.innerHTML = '<option value="">Failed to load years</option>';
        });
}

function loadQuarters(year) {
    if (!year) return;

    fetch(`/api/quarters?year=${encodeURIComponent(year)}`)
        .then(response => response.json())
        .then(quarters => {
            const select = document.getElementById('quarterSelect');
            select.innerHTML = '<option value="">Please select a quarter</option>';
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
            select.innerHTML = '<option value="">Please select a pricelist</option>';
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

async function searchData() {
    const year = document.getElementById('yearSelect').value;
    const quarter = document.getElementById('quarterSelect').value;
    const file = document.getElementById('fileSelect').value;

    if (!year || !quarter || !file) {
        alert('You need to select a year, a quarter, and a pricelist file');
        return Promise.reject('Missing parameters');
    }

    try {
        const response = await fetch(`/api/data?year=${encodeURIComponent(year)}&quarter=${encodeURIComponent(quarter)}&file=${encodeURIComponent(file)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Data is not an array');
        }
        allData = data;
        currentPage = 1;
        updatePagination();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('results').innerHTML = `<p>Failed to load data : ${error.message}</p>`;
    }
}

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
    // console.log(data.length, 'rows to display');
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';

    data.forEach(item => {
        const row = tbody.insertRow();
        const columns = ['Identifier', 'Product Family Group', 'Product', 'Product Type', 'Description #1', 'SKU', 'Price'];
        columns.forEach(column => {
            const cell = row.insertCell();
            if (['SKU', 'Price'].includes(column)) {
                cell.classList.add("nowrap-column");
            }
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
        cell.textContent = 'No results found';
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
                applyFilters();
            });
        } else {
            a.addEventListener('click', (e) => e.preventDefault()); // Prevent link to be clicked
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

    currentPage = 1; // Forcer le passage à la page 1

    applyFilters();
    updateFilterTags();
}

function removeFilter(column, value) {
    // console.log('Removing filter:', column, value);
    if (column === 'Search') {
        activeFilters.search = activeFilters.search.filter(term => term !== value);
    } else {
        delete activeFilters.columns[column];
    }

    // Vérifiez si tous les filtres ont été retirés
    const noFiltersLeft = activeFilters.search.length === 0 && Object.keys(activeFilters.columns).length === 0;
    if (noFiltersLeft) {
        currentPage = 1; // Forcer le passage à la page 1
    }

    applyFilters();
    updateFilterTags();
}

function applyFilters() {
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
    // console.log('DOM fully loaded and parsed');
    loadYears();

    const itemsPerPageSelect = document.getElementById('itemsPerPage');
    itemsPerPageSelect.addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1; // Reset to first page when changing items per page
        applyFilters();
    });

    const searchForm = document.getElementById('searchForm');
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const searchInput = document.getElementById('searchInput').value.trim();
        if (searchInput !== '') {
            addFilter('Search', searchInput);
        }
        document.getElementById('searchInput').value = ''; // Vider le champ de recherche
    });

    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const searchInputValue = searchInput.value.trim();
            if (searchInputValue !== '') {
                addFilter('Search', searchInputValue);
            }
            searchInput.value = ''; // Vider le champ de recherche
        }
    });

    const clearSearchButton = document.getElementById('clearSearchButton');
    clearSearchButton.addEventListener('click', () => {
        searchInput.value = ''; // Vider le champ de recherche
        applyFilters(); // Appliquer les filtres pour mettre à jour l'affichage
    });

    // Ajouter un gestionnaire d'événements pour l'icône d'effacement des filtres
    const clearAllFiltersButton = document.getElementById('clearAllFilters');
    clearAllFiltersButton.addEventListener('click', () => {
        activeFilters.search = [];
        activeFilters.columns = {};
        currentPage = 1; // Forcer le passage à la page 1
        applyFilters();
        updateFilterTags();
    });

    const loadDataButton = document.getElementById('loadDataButton');
    loadDataButton.addEventListener('click', () => {
        const icon = loadDataButton.querySelector('i');
        icon.classList.add('spinner');
        searchData().finally(() => {
            icon.classList.remove('spinner');
        });
    });
});