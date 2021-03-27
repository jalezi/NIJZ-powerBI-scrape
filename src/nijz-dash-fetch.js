// credits Andraž Vrhovec
import fetch from 'node-fetch';

const From = [
  {
    Name: 'c',
    Entity: 'eRCO_podatki',
    Type: 0,
  },
  {
    Name: 'c1',
    Entity: 'Calendar',
    Type: 0,
  },
];

const Select = [
  {
    Aggregation: {
      Expression: {
        Column: {
          Expression: {
            SourceRef: {
              Source: 'c',
            },
          },
          Property: 'Weight',
        },
      },
      Function: 0,
    },
    Name: 'Sum(Core.Weight)',
  },
];

const In = {
  Expressions: [
    {
      Column: {
        Expression: {
          SourceRef: {
            Source: 'c',
          },
        },
        Property: 'Odmerek',
      },
    },
  ],
  Values: [
    [
      {
        Literal: {
          Value: '1L',
        },
      },
    ],
  ],
};

const getFirstCondition = (not = false) =>
  not
    ? {
        Condition: {
          Not: {
            Expression: {
              In,
            },
          },
        },
      }
    : {
        Condition: {
          In,
        },
      };

const firstDataDate = '2020-12-26';

const Condition2 = {
  Condition: {
    Comparison: {
      ComparisonKind: 1,
      Left: {
        Column: {
          Expression: {
            SourceRef: {
              Source: 'c1',
            },
          },
          Property: 'Date',
        },
      },
      Right: {
        DateSpan: {
          Expression: {
            Literal: {
              Value: `datetime'${firstDataDate}T01:00:00'`,
            },
          },
          TimeUnit: 5,
        },
      },
    },
  },
};

const Binding = {
  Primary: {
    Groupings: [
      {
        Projections: [0],
      },
    ],
  },
  DataReduction: {
    DataVolume: 3,
    Primary: {
      Top: {},
    },
  },
  Version: 1,
};

const getPowerBIQuery = (not = false) => {
  return {
    Commands: [
      {
        SemanticQueryDataShapeCommand: {
          Query: {
            Version: 2,
            From,
            Select,
            Where: [getFirstCondition(not), Condition2],
          },
          Binding,
        },
      },
    ],
  };
};
export const q_odmerek1 = getPowerBIQuery(true);
export const q_odmerek2 = getPowerBIQuery(false);

const queryDose1 = buildQuery(q_odmerek1);
const queryDose2 = buildQuery(q_odmerek2);

const getDose1 = createQuery(queryDose1);
const getDose2 = createQuery(queryDose2);

export default { dose1: getDose1, dose2: getDose2 };

function buildQuery(commands) {
  return {
    version: '1.0.0',
    queries: [
      {
        Query: commands,
        CacheKey: JSON.stringify(commands),
        QueryId: '',
        ApplicationContext: {
          DatasetId: '7b40529e-a50e-4dd3-8fe8-997894b4cdaa',
          Sources: [
            {
              ReportId: 'b201281d-b2e7-4470-9f4e-0b3063794c76',
            },
          ],
        },
      },
    ],
    cancelQueries: [],
    modelId: 159824,
  };
}

function createQuery(query) {
  return async () => {
    try {
      const resp = await fetch(
        'https://wabi-west-europe-e-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true',
        {
          // "credentials": "omit",
          headers: {
            // "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:87.0) Gecko/20100101 Firefox/87.0",
            Accept: 'application/json, text/plain, */*',
          },
          referrer: 'https://app.powerbi.com/',
          body: JSON.stringify(query),
          method: 'POST',
          // "mode": "cors"
        }
      );
      const data = await resp.json();
      const dose = data.results[0].result.data.dsr.DS[0].PH[0].DM0[0].M0;
      return { data: dose, status: resp.status };
    } catch (error) {
      return { data: null, status: 500, message: error.message };
    }
  };
}
