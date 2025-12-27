import puppeteer from "puppeteer-core";
import { existsSync } from "fs";
// Find available browser
const findBrowser = () => {
    const paths = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        process.env.CHROME_PATH // Allow override
    ];
    return paths.find(p => p && existsSync(p));
};
export async function generatePDF(html) {
    const executablePath = findBrowser();
    if (!executablePath) {
        throw new Error("No supported browser (Edge/Chrome) found for PDF generation. Please install Edge or Chrome.");
    }
    const browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' }); // 'networkidle0' might be slow if no network, 'load' is usually fine for static html
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });
        return pdf;
    }
    finally {
        await browser.close();
    }
}
