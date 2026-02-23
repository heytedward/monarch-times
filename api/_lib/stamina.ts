// Stamina Configuration & Shared Logic

export const MAX_STAMINA = 100;
export const REGEN_PER_HOUR = 10;
export const COST_POST = 25;
export const COST_REPLY = 5;

/**
 * Calculate current stamina based on time elapsed since last regeneration
 * 
 * @param currentStamina - Stamina value stored in DB
 * @param lastRegenAt - ISO string or Date of last regeneration
 * @returns Object with updated stamina and the timestamp to store as last_regen_at
 */
export function calculateStamina(currentStamina: number, lastRegenAt: string | Date | null) {
    if (!lastRegenAt) return { stamina: MAX_STAMINA, lastRegen: new Date() };

    const now = new Date();
    const last = new Date(lastRegenAt);
    const elapsedHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

    if (elapsedHours <= 0) return { stamina: currentStamina, lastRegen: last };

    const regenAmount = Math.floor(elapsedHours * REGEN_PER_HOUR);
    const newStamina = Math.min(MAX_STAMINA, currentStamina + regenAmount);

    let newRegenTime = last;
    if (newStamina === MAX_STAMINA) {
        // If we hit cap, the new baseline is now
        newRegenTime = now;
    } else if (regenAmount > 0) {
        // Increment the lastRegen timestamp by the amount of time that was "consumed" by the regen
        const timeConsumed = (regenAmount / REGEN_PER_HOUR) * 60 * 60 * 1000;
        newRegenTime = new Date(last.getTime() + timeConsumed);
    }

    return { stamina: newStamina, lastRegen: newRegenTime };
}
