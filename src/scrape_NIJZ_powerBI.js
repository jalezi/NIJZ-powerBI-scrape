import puppeteer from 'puppeteer';
import getTimestamp from './getTimestamp/index.js';
import getVaccination from './getVaccination/index.js';
import getDelivered from './getDelivered/index.js';
import getAdministered from './getAdministered/index.js';

export default async () => {
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );

  const timestamp = await getTimestamp(page);
  const administered = await getAdministered(page);

  // goto page 2
  await page.$eval('.pbi-glyph-chevronrightmedium', el => el.click());
  await page.waitForSelector('.bodyCells');

  const delivered = await getDelivered(page);

  const vaccination = await getVaccination(administered, delivered);

  await browser.close();
  return {
    timestamp,
    created: Date.now(),
    administered,
    delivered,
    vaccination,
  };
};
