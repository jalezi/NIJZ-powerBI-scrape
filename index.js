import puppeteer from 'puppeteer';

const scrap_NIJZ_powerBI = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    'https://app.powerbi.com/view?r=eyJrIjoiZTg2ODI4MGYtMTMyMi00YmUyLWExOWEtZTlmYzIxMTI2MDlmIiwidCI6ImFkMjQ1ZGFlLTQ0YTAtNGQ5NC04OTY3LTVjNjk5MGFmYTQ2MyIsImMiOjl9&pageName=ReportSectionf7478503942700dada61',
    { waitUntil: 'networkidle0' }
  );
  const allSVG = await page.$$('svg');
  const text = allSVG.map(
    async svg =>
      await svg.$$eval('title', nodes => nodes.map(node => node.innerHTML))
  );
  const titlesResolved = await Promise.all(text);
  const date = titlesResolved
    .filter(node => node.length === 1)
    .filter(item => {
      const date = item[0].split(' ');
      return date.length === 4;
    })
    .map(item => item[0])[0]
    .split(' ')
    .map(item => item.replace('.', ''));

  const time = date[3].split(':');
  const dateForUTC = [date[2], date[1] - 1, date[0], ...time];
  const timestamp = Date.UTC(...dateForUTC);

  const vacs = titlesResolved
    .filter(node => node.length === 2 && node[1].endsWith('odmerek'))
    .reduce((acc, [value, key]) => {
      key.includes('1') &&
        (acc.administered = { toDate: +value.replace('.', '') });
      key.includes('2') &&
        (acc.administered2nd = { toDate: +value.replace('.', '') });
      return acc;
    }, {});

  // const allVisualModern = await page.$$('visual-modern');
  // console.log(allVisualModern.length);

  await browser.close();
  return { timestamp, created: Date.now(), vaccination: vacs };
};

const data = await scrap_NIJZ_powerBI();
console.log(data);
