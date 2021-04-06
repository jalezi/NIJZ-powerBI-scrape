import puppeteer from 'puppeteer';
import getTimestamp from './getTimestamp/index.js';
import getVaccination from './getVaccination/index.js';
import getDelivered from './getDelivered/index.js';
import getAdministered from './getAdministered/index.js';

export default async () => {
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();
  console.log('Made page!');
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );
  console.log('NIJZ Power BI loaded!');

  const timestamp = await getTimestamp(page);
  console.log('Got timestamp!');
  if (timestamp instanceof Error) {
    console.log('Timestamp error!');
    return timestamp;
  }

  const administered = await getAdministered(page);
  console.log('Got administered!');

  // goto page 2
  await page.$eval('.pbi-glyph-chevronrightmedium', el => el.click());
  console.log('Clicked on next page!');
  await page.waitForSelector('.bodyCells');
  console.log('2nd page available!');

  const delivered = await getDelivered(page);
  console.log('Got delivered!');

  const vaccination = await getVaccination(administered, delivered);
  console.log('Got vaccination!');

  await browser.close();
  return {
    timestamp,
    created: Date.now(),
    administered,
    delivered,
    vaccination,
  };
};
