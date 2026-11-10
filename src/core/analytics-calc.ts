import { EncounterSession, SocialStatOverview, UserProfile } from '../types';

export function calculateSocialOverview(
  encounters: EncounterSession[],
  knownUsers: Record<string, UserProfile>,
  currentUserId: string,
  targetDate = new Date()
): SocialStatOverview {
  const targetDateStr = targetDate.toISOString().slice(0, 10);
  const userDurationMap: Record<string, number> = {};
  let todayTotalSeconds = 0;
  let weeklyTotalSeconds = 0;
  let monthlyTotalSeconds = 0;
  let lifetimeTotalSeconds = 0;

  const nowMs = targetDate.getTime();
  const oneWeekAgoMs = nowMs - 7 * 24 * 3600 * 1000;
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 3600 * 1000;

  for (const enc of encounters) {
    const encStartMs = new Date(enc.startedAt).getTime();
    const encDateStr = enc.startedAt.slice(0, 10);
    const partnerId = enc.userAId === currentUserId ? enc.userBId : enc.userAId;
    const dur = enc.durationSeconds;

    lifetimeTotalSeconds += dur;

    if (encStartMs >= thirtyDaysAgoMs) {
      monthlyTotalSeconds += dur;
    }
    if (encStartMs >= oneWeekAgoMs) {
      weeklyTotalSeconds += dur;
    }

    if (encDateStr === targetDateStr) {
      todayTotalSeconds += dur;
      userDurationMap[partnerId] = (userDurationMap[partnerId] || 0) + dur;
    }
  }

  const peopleToday = Object.keys(userDurationMap).length;
  let mostSpentUserId: string | null = null;
  let maxSeconds = 0;

  for (const [uid, secs] of Object.entries(userDurationMap)) {
    if (secs > maxSeconds) {
      maxSeconds = secs;
      mostSpentUserId = uid;
    }
  }

  const mostSpentWithUser = mostSpentUserId
    ? {
        user: Object.values(knownUsers).find((u) => u.id === mostSpentUserId) || {
          id: mostSpentUserId,
          username: 'friend',
          displayName: 'Friend',
          avatarUrl: '',
          publicKey: '',
          bluetoothEnabled: true,
          invisibleMode: false,
          createdAt: '',
        },
        durationSeconds: maxSeconds,
      }
    : undefined;

  return {
    totalSocialTimeTodaySeconds: todayTotalSeconds,
    peopleEncounteredTodayCount: peopleToday,
    mostSpentWithUser,
    weeklyTotalSeconds,
    monthlyTotalSeconds,
    lifetimeTotalSeconds,
    totalEncountersCount: encounters.length,
  };
}

/**
 * Calculates relationship statistics for a specific partner
 */
export function calculateRelationshipStats(
  encounters: EncounterSession[],
  currentUserId: string,
  partnerId: string,
  targetDate = new Date()
) {
  const targetDateStr = targetDate.toISOString().slice(0, 10);
  const nowMs = targetDate.getTime();
  const oneWeekAgoMs = nowMs - 7 * 24 * 3600 * 1000;
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 3600 * 1000;

  const relevant = encounters.filter(
    (e) => (e.userAId === currentUserId && e.userBId === partnerId) ||
           (e.userBId === currentUserId && e.userAId === partnerId)
  );

  let todaySec = 0;
  let weekSec = 0;
  let monthSec = 0;
  let lifetimeSec = 0;
  let longestSec = 0;
  let lastMeeting: string | undefined = undefined;

  for (const enc of relevant) {
    const encStartMs = new Date(enc.startedAt).getTime();
    const dur = enc.durationSeconds;

    lifetimeSec += dur;
    if (dur > longestSec) longestSec = dur;

    if (enc.startedAt.slice(0, 10) === targetDateStr) {
      todaySec += dur;
    }
    if (encStartMs >= oneWeekAgoMs) {
      weekSec += dur;
    }
    if (encStartMs >= thirtyDaysAgoMs) {
      monthSec += dur;
    }

    if (!lastMeeting || new Date(enc.startedAt) > new Date(lastMeeting)) {
      lastMeeting = enc.startedAt;
    }
  }

  const totalMeetings = relevant.length;
  const avgDurationSec = totalMeetings > 0 ? Math.round(lifetimeSec / totalMeetings) : 0;

  return {
    todaySeconds: todaySec,
    weekSeconds: weekSec,
    monthSeconds: monthSec,
    lifetimeSeconds: lifetimeSec,
    totalMeetings,
    averageDurationSeconds: avgDurationSec,
    longestMeetingSeconds: longestSec,
    lastMeeting,
    encounters: relevant,
  };
}

/**
 * Builds a 7-day x 24-hour heatmap matrix of social activity minutes
 */
export function generateActivityHeatmap(
  encounters: EncounterSession[],
  currentUserId: string
): number[][] {
  // 7 rows (Sunday to Saturday, 0 to 6), 24 columns (0 to 23 hours)
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const enc of encounters) {
    if (enc.userAId !== currentUserId && enc.userBId !== currentUserId) continue;
    const start = new Date(enc.startedAt);
    const day = start.getDay();
    const hour = start.getHours();
    const minutes = Math.round(enc.durationSeconds / 60);
    matrix[day][hour] += minutes;
  }

  return matrix;
}
