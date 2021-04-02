const companyDeliveredFields = [
  'vaccination.pfizer.delivered',
  'vaccination.moderna.delivered',
  'vaccination.az.delivered',
];

export default async (administered, delivered) => {
  const deliveredToDate = Object.entries(delivered[0]).reduce(
    (acc, [key, value]) => {
      companyDeliveredFields.includes(key) && (acc += +value);
      return acc;
    },
    0
  );

  const missingObj = {
    ...delivered[0],
    'vaccination.delivered.todate': deliveredToDate,
    'vaccination.pfizer.delivered.todate': delivered[0][
      'vaccination.pfizer.delivered'
    ]
      ? delivered[0]['vaccination.pfizer.delivered']
      : 0,
    'vaccination.moderna.delivered.todate': delivered[0][
      'vaccination.moderna.delivered'
    ]
      ? delivered[0]['vaccination.moderna.delivered']
      : 0,
    'vaccination.az.delivered.todate': delivered[0]['vaccination.az.delivered']
      ? delivered[0]['vaccination.az.delivered']
      : 0,
  };

  const withDelivered = [missingObj, ...administered].map(itemAdministered => {
    const deliveredOnDate = delivered
      .filter(itemDelivered => itemDelivered.date === itemAdministered.date)
      .reduce(
        (acc, itemDelivered) => {
          const {
            date,
            'vaccination.moderna.delivered': moderna,
            'vaccination.az.delivered': az,
            'vaccination.pfizer.delivered': pfizer,
          } = itemDelivered;
          acc = {
            date,
            'vaccination.pfizer.delivered':
              pfizer || acc['vaccination.pfizer.delivered'],
            'vaccination.moderna.delivered':
              moderna || acc['vaccination.moderna.delivered'],
            'vaccination.az.delivered': az || acc['vaccination.az.delivered'],
          };
          return acc;
        },
        {
          date: '',
          'vaccination.pfizer.delivered': 0,
          'vaccination.moderna.delivered': 0,
          'vaccination.az.delivered': 0,
        }
      );
    return {
      'vaccination.delivered.todate': 0,
      'vaccination.pfizer.delivered': 0,
      'vaccination.pfizer.delivered.todate': 0,
      'vaccination.moderna.delivered': 0,
      'vaccination.moderna.delivered.todate': 0,
      'vaccination.az.delivered': 0,
      'vaccination.az.delivered.todate': 0,
      ...(deliveredOnDate ? deliveredOnDate : {}),
      ...itemAdministered,
    };
  });

  const firstItem = withDelivered[0];
  const rest = withDelivered.slice(1, withDelivered.length);

  const populate = (firstItem, rest, result = []) => {
    const newFirst = rest[0];
    const pfizer = newFirst['vaccination.pfizer.delivered'];
    const moderna = newFirst['vaccination.moderna.delivered'];
    const az = newFirst['vaccination.az.delivered'];
    const total = pfizer + moderna + az;

    newFirst['vaccination.pfizer.delivered.todate'] =
      firstItem['vaccination.pfizer.delivered.todate'] + pfizer;
    newFirst['vaccination.moderna.delivered.todate'] =
      firstItem['vaccination.moderna.delivered.todate'] + moderna;
    newFirst['vaccination.az.delivered.todate'] =
      firstItem['vaccination.az.delivered.todate'] + az;
    newFirst['vaccination.delivered.todate'] =
      firstItem['vaccination.delivered.todate'] + total;

    result.push(newFirst);
    if (rest.length === 1) {
      return result;
    }
    return populate(
      { ...newFirst },
      [...rest.slice(1, rest.length)],
      [...result]
    );
  };

  const vaccination = [firstItem, ...populate(firstItem, rest)];

  return vaccination;
};
