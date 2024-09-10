import express from 'express';
import path from 'path';
import * as excelService from '../services/excelService.js';

const router = express.Router();
const DATA_DIR = '/data';

router.get('/years', (req, res) => {
    try {
        const years = excelService.listYears();
        // console.log('Years sent to client:', years); // Pour le débogage
        res.json(years);
    } catch (error) {
        console.error('Error listing years:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/quarters', (req, res) => {
    const { year } = req.query;
    if (!year) {
        return res.status(400).json({ error: 'Year parameter is required' });
    }
    try {
        const quarters = excelService.listQuarters(year);
        res.json(quarters);
    } catch (error) {
        console.error('Error listing quarters:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/files', (req, res) => {
    const { year, quarter } = req.query;
    if (!year || !quarter) {
        return res.status(400).json({ error: 'Year and quarter parameters are required' });
    }
    try {
        const files = excelService.listFiles(year, quarter);
        res.json(files);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/data', (req, res) => {
    const { year, quarter, file, search } = req.query;
    if (!year || !quarter || !file) {
        return res.status(400).json({ error: 'Year, quarter, and file parameters are required' });
    }
    try {
        const filePath = path.join(DATA_DIR, year, quarter, file);
        const data = excelService.getFileData(filePath, search);
        res.json(data);
    } catch (error) {
        console.error('Error getting file data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/headers', (req, res) => {
    const { file } = req.query;
    if (!file) {
        return res.status(400).json({ error: 'File parameter is required' });
    }
    const headers = excelService.getFileHeaders(file);
    res.json(headers);
});

export default router;