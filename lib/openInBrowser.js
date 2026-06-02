import browser from './browser.js';

export default async function openInBrowser(sourceResult) {
    await browser.open(sourceResult.html);
    return sourceResult;
}
