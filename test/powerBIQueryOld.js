const q_odmerek2 = {
  Commands: [
    {
      SemanticQueryDataShapeCommand: {
        Query: {
          Version: 2,
          From: [
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
          ],
          Select: [
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
          ],
          Where: [
            {
              Condition: {
                Not: {
                  Expression: {
                    In: {
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
                    },
                  },
                },
              },
            },
            {
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
                          Value: "datetime'2020-12-26T01:00:00'",
                        },
                      },
                      TimeUnit: 5,
                    },
                  },
                },
              },
            },
          ],
        },
        Binding: {
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
        },
      },
    },
  ],
};

const q_odmerek1 = {
  Commands: [
    {
      SemanticQueryDataShapeCommand: {
        Query: {
          Version: 2,
          From: [
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
          ],
          Select: [
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
          ],
          Where: [
            {
              Condition: {
                In: {
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
                },
              },
            },
            {
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
                          Value: "datetime'2020-12-26T01:00:00'",
                        },
                      },
                      TimeUnit: 5,
                    },
                  },
                },
              },
            },
          ],
        },
        Binding: {
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
        },
      },
    },
  ],
};

export const old = { q_odmerek1, q_odmerek2 };
