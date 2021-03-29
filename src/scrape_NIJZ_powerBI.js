import puppeteer from 'puppeteer';
import getDelivered from './getDelivered/index.js';
import getAdministered, { getTimestamp } from './getAdministered/index.js';

const scrap_NIJZ_powerBI = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );

  const administered = await getAdministered(page);
  const timestamp = await getTimestamp(page);

  const nextPage = await page.$(
    '#embedWrapperID > div.logoBarWrapper > logo-bar > div > div > div > logo-bar-navigation > span > a:nth-child(3) > i'
  );

  await nextPage.click();
  await page.waitForSelector('.bodyCells');

  const delivered = await getDelivered(page);

  await browser.close();
  return {
    timestamp,
    created: Date.now(),
    administered,
    delivered,
  };
};

export default scrap_NIJZ_powerBI;
