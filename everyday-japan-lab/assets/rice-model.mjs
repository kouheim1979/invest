export function measureRiceBatch(cupMl) {
  if (typeof cupMl !== 'number' || !Number.isFinite(cupMl) || cupMl < 50 || cupMl > 500) {
    throw new Error('Enter the marked capacity of your cup, from 50 to 500 mL.');
  }
  return { riceMl: 360, waterMl: 400, riceCups: 360 / cupMl, waterCups: 400 / cupMl };
}

export function riceClock(deadline, now) {
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) throw new Error('Invalid timer timestamp.');
  return { remaining: Math.max(0, Math.ceil((deadline - now) / 1000)), overdue: Math.max(0, Math.floor((now - deadline) / 1000)) };
}
