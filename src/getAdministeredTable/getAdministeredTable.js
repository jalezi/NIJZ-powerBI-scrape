const toNumber = string => {
  const newString = string.replace('.', '').replace(',', ''); // string.reaplaceAll -> node v15.0
  const dot = newString.indexOf('.');
  const comma = newString.indexOf(',');
  if (dot === -1 && comma === -1) {
    return +newString;
  }
  return toNumber(newString);
};

export default async page => {
  const div = await page.$('div[title="Skupno število cepljenih oseb"]');
  await div.click({ button: 'right' });
  await page.waitForSelector('drop-down-list-item');
  const menuItem = await page.$('drop-down-list-item');
  await menuItem.click();
  await page.waitForSelector('.rowHeaders');
  await page.waitForSelector('.bodyCells');

  let rowHeaders;
  let cells = [];
  let bodyCells = null;
  let c = null;

  rowHeaders = await Promise.all(
    await page.$$eval('.rowHeaders > div > div > div', headers =>
      headers.map(header => header.innerText)
    )
  );
  console.log(rowHeaders);
  bodyCells = await page.$$('.bodyCells > div > div > div');
  c = await Promise.all(
    bodyCells.map(
      async item =>
        await item.$$eval('.pivotTableCellWrap', items =>
          items.map(el => el.innerText)
        )
    )
  );
  cells.push(c.map(item => item.map(text => toNumber(text))));

  await page.$eval('.bodyCells', el => {
    el.scrollTo(0, el.scrollHeight);
  });
  await page.waitForTimeout(500);
  rowHeaders = await Promise.all(
    await page.$$eval('.rowHeaders > div > div > div', headers =>
      headers.map(header => header.innerText)
    )
  );
  console.log(rowHeaders);
  bodyCells = await page.$$('.bodyCells > div > div > div');
  c = await Promise.all(
    bodyCells.map(
      async item =>
        await item.$$eval('.pivotTableCellWrap', items =>
          items.map(el => el.innerText)
        )
    )
  );
  cells.push(c.map(item => item.map(text => toNumber(text))));

  await page.$eval('.bodyCells', el => {
    el.scrollTo(0, el.scrollHeight);
  });
  await page.waitForTimeout(500);

  bodyCells = await page.$$('.bodyCells > div > div > div');
  c = await Promise.all(
    bodyCells.map(
      async item =>
        await item.$$eval('.pivotTableCellWrap', items =>
          items.map(el => el.innerText)
        )
    )
  );
  cells.push(c.map(item => item.map(text => toNumber(text))));

  await page.$eval('.bodyCells', el => {
    el.scrollTo(0, el.scrollHeight);
  });
  await page.waitForTimeout(500);

  bodyCells = await page.$$('.bodyCells > div > div > div');
  c = await Promise.all(
    bodyCells.map(
      async item =>
        await item.$$eval('.pivotTableCellWrap', items =>
          items.map(el => el.innerText)
        )
    )
  );
  cells.push(c.map(item => item.map(text => toNumber(text))));

  const [administered, administered2nd] = cells.reduce(
    (acc, [first, second]) => {
      acc[0] = [...acc[0], ...first];
      acc[1] = [...acc[1], ...second];
      return acc;
    },
    [[], []]
  );

  return {
    administered,
    administered2nd,
  };
};
