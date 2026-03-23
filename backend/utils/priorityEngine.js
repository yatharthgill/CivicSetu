import Report from '../models/Report.js';

const OPEN_STATUSES = ['reported', 'acknowledged', 'in_progress'];

const severityBaseScore = {
  low: 10,
  medium: 22,
  high: 36,
  critical: 50,
};

const ackSlaHours = {
  low: 72,
  medium: 48,
  high: 24,
  critical: 8,
};

const resolveSlaHours = {
  low: 336,      // 14 days
  medium: 168,   // 7 days
  high: 72,      // 3 days
  critical: 24,
};

const riskKeywordRegex = /(accident|injur|injury|fire|flood|collapse|live\s*wire|electric|sewer\s*overflow|blocked\s*drain|unsafe|school|hospital)/i;

const toHours = (date) => {
  if (!date) return 0;
  return Math.max(0, (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
};

const getUrgencyScore = (report) => {
  const ageHours = toHours(report.createdAt);
  const ageScore = Math.min(15, Math.floor(ageHours / 6));
  const keywordScore = riskKeywordRegex.test(report.description || '') ? 8 : 0;
  return Math.min(25, ageScore + keywordScore);
};

const getSlaRiskScore = (report) => {
  if (['resolved', 'closed', 'rejected'].includes(report.status)) return 0;

  const severity = report.severity || 'medium';
  const ackTarget = ackSlaHours[severity] || ackSlaHours.medium;
  const resolveTarget = resolveSlaHours[severity] || resolveSlaHours.medium;

  if (report.status === 'reported') {
    const elapsed = toHours(report.createdAt);
    const ratio = elapsed / ackTarget;
    const base = Math.min(22, Math.round(ratio * 12));
    const breachBonus = ratio > 1 ? 8 : 0;
    return Math.min(30, base + breachBonus);
  }

  const ackStart = report.firstAcknowledgedAt || report.createdAt;
  const elapsed = toHours(ackStart);
  const ratio = elapsed / resolveTarget;
  const base = Math.min(22, Math.round(ratio * 15));
  const breachBonus = ratio > 1 ? 8 : 0;
  return Math.min(30, base + breachBonus);
};

const getPriorityLevel = (score) => {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

const getVolumeScore = async (report) => {
  const coords = report?.location?.coordinates;

  if (!Array.isArray(coords) || coords.length !== 2) {
    return 0;
  }

  const lookbackDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    // Using find().limit() is safer than countDocuments() for some Mongo versions with $near.
    const nearbyDocs = await Report.find({
      _id: { $ne: report._id },
      category: report.category,
      status: { $in: OPEN_STATUSES },
      createdAt: { $gte: lookbackDate },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coords,
          },
          $maxDistance: 2000,
        },
      },
    })
      .select('_id')
      .limit(15)
      .lean();

    const nearbyCount = Array.isArray(nearbyDocs) ? nearbyDocs.length : 0;
    return Math.min(25, nearbyCount * 4);
  } catch (error) {
    console.error('Priority volume scoring failed:', error.message);
    return 0;
  }
};

export const calculatePriorityForReport = async (report) => {
  const severity = report.severity || 'medium';
  const severityScore = severityBaseScore[severity] || severityBaseScore.medium;
  const urgencyScore = getUrgencyScore(report);
  const slaRiskScore = getSlaRiskScore(report);
  const volumeScore = await getVolumeScore(report);

  const totalScore = Math.min(100, severityScore + urgencyScore + slaRiskScore + volumeScore);
  const priorityLevel = getPriorityLevel(totalScore);

  return {
    priorityScore: totalScore,
    priorityLevel,
    priorityFactors: {
      severityBase: severityScore,
      urgency: urgencyScore,
      slaRisk: slaRiskScore,
      volume: volumeScore,
      lastCalculatedAt: new Date(),
    },
  };
};

export const applyPriorityForReport = async (report) => {
  let calculated;

  try {
    calculated = await calculatePriorityForReport(report);
  } catch (error) {
    console.error('Priority calculation failed, falling back to safe defaults:', error.message);
    const severity = report.severity || 'medium';
    const fallbackSeverity = severityBaseScore[severity] || severityBaseScore.medium;

    calculated = {
      priorityScore: Math.min(100, fallbackSeverity),
      priorityLevel: getPriorityLevel(fallbackSeverity),
      priorityFactors: {
        severityBase: fallbackSeverity,
        urgency: 0,
        slaRisk: 0,
        volume: 0,
        lastCalculatedAt: new Date(),
      },
    };
  }

  report.priorityScore = calculated.priorityScore;
  report.priorityLevel = calculated.priorityLevel;
  report.priorityFactors = calculated.priorityFactors;

  return calculated;
};
