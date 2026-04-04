const categoryDepartmentMap = {
  sanitation: 'sanitation_department',
  public_works: 'public_works_department',
  transportation: 'transportation_department',
  parks_recreation: 'parks_recreation_department',
  water_sewer: 'water_sewer_department',
  other: 'general_grievance_cell',
};

const locationHints = {
  water_sewer_department: /(drain|drainage|sewer|water\s*line|pipeline|leakage|manhole)/i,
  transportation_department: /(traffic|signal|junction|crossing|road|highway|bus\s*stop)/i,
  public_works_department: /(streetlight|electric\s*pole|footpath|bridge|pavement|pothole)/i,
  sanitation_department: /(garbage|trash|waste|bin|dump|unclean|sanitation)/i,
  parks_recreation_department: /(park|playground|garden|sports\s*ground)/i,
};

const getUrgencyMatchScore = (severity) => {
  switch (severity) {
    case 'critical':
      return 20;
    case 'high':
      return 15;
    case 'medium':
      return 8;
    default:
      return 4;
  }
};

export const resolveDepartmentRouting = (reportInput) => {
  const category = reportInput?.category || 'other';
  const severity = reportInput?.severity || 'medium';
  const locationName = reportInput?.location?.name || '';

  const categoryDepartment = categoryDepartmentMap[category] || 'general_grievance_cell';
  let resolvedDepartment = categoryDepartment;

  let categoryMatchScore = categoryDepartment === 'general_grievance_cell' ? 20 : 60;
  let locationMatchScore = 0;

  for (const [department, regex] of Object.entries(locationHints)) {
    if (regex.test(locationName)) {
      if (department === categoryDepartment) {
        locationMatchScore = 25;
        resolvedDepartment = department;
      } else {
        locationMatchScore = Math.max(locationMatchScore, 10);
      }
      break;
    }
  }

  const urgencyMatchScore = getUrgencyMatchScore(severity);
  const confidence = Math.min(100, categoryMatchScore + locationMatchScore + urgencyMatchScore);

  const routingReason = [
    `Category ${category} mapped to ${resolvedDepartment}`,
    locationMatchScore > 0 ? `Location hint matched (${locationName})` : 'No explicit location hint match',
    `Severity ${severity} contributed urgency score ${urgencyMatchScore}`,
    `Routing confidence ${confidence}`,
  ].join('. ');

  return {
    department: resolvedDepartment,
    routingReason,
    routingMetadata: {
      categoryMatchScore,
      locationMatchScore,
      urgencyMatchScore,
      autoRouted: true,
      routedAt: new Date(),
    },
  };
};
