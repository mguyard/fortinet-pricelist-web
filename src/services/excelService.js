import * as fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

/* load 'fs' for readFile and writeFile support */
XLSX.set_fs(fs);

const DATA_DIR = '/data';

export function listYears() {
    try {
        const years = fs.readdirSync(DATA_DIR)
            .filter(item => fs.statSync(path.join(DATA_DIR, item)).isDirectory())
            .sort((a, b) => b.localeCompare(a)); // Trie les années par ordre décroissant
        // console.log('Years found:', years); // Pour le débogage
        return years;
    } catch (error) {
        console.error('Error listing years:', error);
        return [];
    }
}

export function listQuarters(year) {
    const yearPath = path.join(DATA_DIR, year);
    return fs.readdirSync(yearPath).filter(item => fs.statSync(path.join(yearPath, item)).isDirectory());
}

export function listFiles(year, quarter) {
    const quarterPath = path.join(DATA_DIR, year, quarter);
    try {
        const files = fs.readdirSync(quarterPath)
            .filter(file => file.endsWith('.xlsx'))
            .map(file => {
                const filePath = path.join(quarterPath, file);
                const stats = fs.statSync(filePath);
                // console.log(`File: ${file}, Created At: ${stats.mtime}`); // Pour le débogage
                return {
                    name: file,
                    modifiedAt: stats.mtime // Assurez-vous que c'est un objet Date
                };
            })
            .sort((a, b) => b.modifiedAt - a.modifiedAt); // Trier par date de création décroissante

        return files;
    } catch (error) {
        console.error(`Error listing files for ${year}/${quarter}:`, error);
        return [];
    }
}

export function getFileData(filePath, searchTerm) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['DataSet'];

    // Lire les données à partir de la ligne 15
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const startRow = path.basename(filePath).includes("END USER") ? 0 : 14; // Commencer à la ligne 1 pour les fichiers "END USER" sinon à la ligne 15
    range.s.r = startRow;
    const newRange = XLSX.utils.encode_range(range);

    const data = XLSX.utils.sheet_to_json(sheet, {
        range: newRange,
        header: 1 // Utiliser la première ligne du range comme en-têtes
    });

    // Extraire les en-têtes (première ligne du nouveau range)
    const headers = data.shift();

    // Convertir les données en tableau d'objets
    const formattedData = data.map(row => {
        return headers.reduce((obj, header, index) => {
            obj[header] = row[index];
            return obj;
        }, {});
    });

    if (searchTerm) {
        return formattedData.filter(row => 
            Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }
    return formattedData;
}

export function getFileHeaders(fileName) {
    const filePath = path.join(DATA_DIR, fileName);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['DataSet'];

    const range = XLSX.utils.decode_range(sheet['!ref']);
    const startRow = path.basename(filePath).includes("END USER") ? 0 : 14;
    range.s.r = startRow;
    range.e.r = startRow;
    const headerRange = XLSX.utils.encode_range(range);

    const headers = XLSX.utils.sheet_to_json(sheet, {
        range: headerRange,
        header: 1
    })[0];

    return headers;
}