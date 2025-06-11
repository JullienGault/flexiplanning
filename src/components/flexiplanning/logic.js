// Fichier: src/components/flexiplanning/logic.js

import { DAYS, SLOTS_CONFIG, AGENTS, ALTERNANTS, ROLES, ROLE_MAP, ROLES_TO_COUNT, FLEXIBLE_ROLES, UNIQUE_ROLES_LIST } from './config';

export const createEmptyPlanning = () => DAYS.reduce((acc, day) => ({ ...acc, [day]: SLOTS_CONFIG[day].reduce((slotAcc, slot) => ({ ...slotAcc, [slot]: AGENTS.reduce((agentAcc, agent) => ({ ...agentAcc, [agent]: ROLES.DEFAULT.value }), {}) }), {}) }), {});

export const shuffleArray = (array) => { 
    const newArray = [...array]; 
    for (let i = newArray.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; 
    } 
    return newArray; 
};

export const calculateWeeklyRoleCounts = (planning) => {
    const allCountedRoleKeys = [...ROLES_TO_COUNT];
    const counts = AGENTS.reduce((acc, agent) => ({ ...acc, [agent]: allCountedRoleKeys.reduce((a, r) => ({ ...a, [r]: 0 }), {}) }), {});
    for (const day of DAYS) {
        for (const slot of SLOTS_CONFIG[day]) {
            for (const agent of AGENTS) {
                const roleValue = planning[day]?.[slot]?.[agent];
                const roleInfo = ROLE_MAP[roleValue];
                if (roleInfo && roleInfo.isCounted) {
                    const countKey = roleInfo.countAs || roleInfo.value;
                    if (counts[agent] && counts[agent][countKey] !== undefined) {
                        counts[agent][countKey]++;
                    }
                }
            }
        }
    }
    return counts;
};

export const getWeeklyActiveAgents = (planning) => {
    if (!planning || Object.keys(planning).length === 0) return AGENTS;
    return AGENTS.filter(agent => {
        if (!ALTERNANTS.includes(agent)) return true;
        return !DAYS.every(day => SLOTS_CONFIG[day].every(slot => [ROLES.ECOLE.value, ROLES.REPOS.value].includes(planning[day]?.[slot]?.[agent])));
    });
};

export function enforceClosingRuleForDay(planning, day, pinnedSlots) {
    const newPlanning = JSON.parse(JSON.stringify(planning));
    const daySlots = SLOTS_CONFIG[day];
    const OPENING_SLOT = daySlots[0];
    const CLOSING_SLOT = daySlots[daySlots.length - 1];
    const availableAgents = AGENTS.filter(agent => {
        const roleForAgent = newPlanning[day][OPENING_SLOT][agent];
        const roleInfo = ROLE_MAP[roleForAgent] || {};
        return !roleInfo.isImmutable;
    });
    const openers = availableAgents.filter(
        agent => newPlanning[day][OPENING_SLOT][agent] === ROLES.OUVERTURE.value
    );
    availableAgents.forEach(agent => {
        const closingSlotIsPinned = pinnedSlots.has(`${day}-${CLOSING_SLOT}-${agent}`);
        if (closingSlotIsPinned) {
            return;
        }
        if (openers.includes(agent)) {
            if (newPlanning[day][CLOSING_SLOT][agent] === ROLES.FERMETURE.value) {
                newPlanning[day][CLOSING_SLOT][agent] = ROLES.DEFAULT.value;
            }
        } else {
            newPlanning[day][CLOSING_SLOT][agent] = ROLES.FERMETURE.value;
        }
    });
    return newPlanning;
}

export function rebalanceWeeklyRoles(planning, pinnedSlots) {
    const newPlanning = JSON.parse(JSON.stringify(planning));
    const activeAgents = getWeeklyActiveAgents(newPlanning);
    if (activeAgents.length <= 1) return newPlanning;
    for (const roleCategory of ROLES_TO_COUNT) {
        let maxIterations = activeAgents.length ** 2; 
        while (maxIterations-- > 0) {
            const weeklyCounts = calculateWeeklyRoleCounts(newPlanning);
            const agentsByRoleCount = activeAgents
                .map(agent => ({ agent, count: weeklyCounts[agent]?.[roleCategory] || 0 }))
                .sort((a, b) => a.count - b.count);
            const underloadedAgent = agentsByRoleCount[0];
            const overloadedAgent = agentsByRoleCount[agentsByRoleCount.length - 1];
            if (!overloadedAgent || !underloadedAgent || overloadedAgent.count <= underloadedAgent.count + 1) {
                break;
            }
            const swap = findSwap(newPlanning, pinnedSlots, roleCategory, overloadedAgent.agent, underloadedAgent.agent);
            if (swap) {
                const { day, slotsToSwap, overloadedAgentRole, underloadedAgentRole } = swap;
                slotsToSwap.forEach(slot => {
                    newPlanning[day][slot][overloadedAgent.agent] = underloadedAgentRole;
                    newPlanning[day][slot][underloadedAgent.agent] = overloadedAgentRole;
                });
            } else {
                break;
            }
        }
    }
    return newPlanning;
}

export function findSwap(planning, pinnedSlots, roleCategory, overloadedAgent, underloadedAgent) {
    const isSlotPinned = (day, slot, agent) => pinnedSlots.has(`${day}-${slot}-${agent}`);
    const relevantRoles = Object.values(ROLES)
        .filter(r => (r.countAs || r.value) === roleCategory)
        .map(r => r.value);
    for (const day of shuffleArray(DAYS)) { 
        for (const slot of shuffleArray(SLOTS_CONFIG[day])) {
            const overloadedAgentRole = planning[day][slot][overloadedAgent];
            if (relevantRoles.includes(overloadedAgentRole)) {
                const underloadedAgentRole = planning[day][slot][underloadedAgent];
                const RDV_SLOT_1 = '14h–16h30';
                const RDV_SLOT_2 = '16h30–19h';
                if (overloadedAgentRole === ROLES.RDV.value && (slot === RDV_SLOT_1 || slot === RDV_SLOT_2)) {
                    const isBlockIntact = planning[day][RDV_SLOT_1][overloadedAgent] === ROLES.RDV.value && planning[day][RDV_SLOT_2][overloadedAgent] === ROLES.RDV.value;
                    const isTargetFlexible = FLEXIBLE_ROLES.includes(planning[day][RDV_SLOT_1][underloadedAgent]) && FLEXIBLE_ROLES.includes(planning[day][RDV_SLOT_2][underloadedAgent]);
                    const isBlockPinned = isSlotPinned(day, RDV_SLOT_1, overloadedAgent) || isSlotPinned(day, RDV_SLOT_2, overloadedAgent) ||
                                          isSlotPinned(day, RDV_SLOT_1, underloadedAgent) || isSlotPinned(day, RDV_SLOT_2, underloadedAgent);
                    if (isBlockIntact && isTargetFlexible && !isBlockPinned) {
                        return { day, slotsToSwap: [RDV_SLOT_1, RDV_SLOT_2], overloadedAgentRole: ROLES.RDV.value, underloadedAgentRole: planning[day][RDV_SLOT_1][underloadedAgent] };
                    }
                    continue; 
                }
                const isUnderloadedFlexible = FLEXIBLE_ROLES.includes(underloadedAgentRole);
                const isSwapPinned = isSlotPinned(day, slot, overloadedAgent) || isSlotPinned(day, slot, underloadedAgent);
                if (isUnderloadedFlexible && !isSwapPinned) {
                    return { day, slotsToSwap: [slot], overloadedAgentRole: overloadedAgentRole, underloadedAgentRole: underloadedAgentRole };
                }
            }
        }
    }
    return null;
}

export function assignRoleToBestCandidate(planning, day, slot, availableAgents, roleToAssign, roleCounts) {
    const roleInfo = ROLE_MAP[roleToAssign];
    if (!roleInfo) return null;
    const countKey = roleInfo.countAs || roleInfo.value;
    let candidates = availableAgents.filter(a => planning[day][slot][a] === ROLES.DEFAULT.value);
    if (roleInfo.isCounted && candidates.length > 0) {
        candidates.sort((a, b) => (roleCounts[a]?.[countKey] || 0) - (roleCounts[b]?.[countKey] || 0));
        if (candidates.length > 1) {
            const minCount = roleCounts[candidates[0]]?.[countKey] || 0;
            let tiedCandidates = [];
            let otherCandidates = [];
            for (const candidate of candidates) {
                if ((roleCounts[candidate]?.[countKey] || 0) === minCount) {
                    tiedCandidates.push(candidate);
                } else {
                    otherCandidates.push(candidate);
                }
            }
            const shuffledTiedCandidates = shuffleArray(tiedCandidates);
            candidates = [...shuffledTiedCandidates, ...otherCandidates];
        }
    } else {
        candidates = shuffleArray(candidates);
    }
    if (candidates.length > 0) {
        const assignee = candidates[0];
        planning[day][slot][assignee] = roleToAssign;
        if (roleInfo.isCounted) {
            if (!roleCounts[assignee]) roleCounts[assignee] = {};
            if (!roleCounts[assignee][countKey]) roleCounts[assignee][countKey] = 0;
            roleCounts[assignee][countKey]++;
        }
        return assignee;
    }
    return null;
}

export function generateRolesForDay(planning, day, roleCounts, selectedRestDays, selectedSchoolDays, selectedFormationDays) {
    const restingAgents = selectedRestDays[day] || [];
    const schoolAgents = selectedSchoolDays[day] || [];
    const formationAgents = selectedFormationDays[day] || [];
    const unavailableAgents = [...new Set([...restingAgents, ...schoolAgents, ...formationAgents])];
    AGENTS.forEach(agent => {
        const isPinnedThisDay = SLOTS_CONFIG[day].some(slot => planning[day][slot][agent] !== ROLES.DEFAULT.value);
        if (isPinnedThisDay) return;
        const unavailability = restingAgents.includes(agent) ? ROLES.REPOS.value : schoolAgents.includes(agent) ? ROLES.ECOLE.value : formationAgents.includes(agent) ? ROLES.FORMATION.value : null;
        if (unavailability) {
            SLOTS_CONFIG[day].forEach(slot => {
                planning[day][slot][agent] = unavailability;
            });
        }
    });
    const availableAgents = AGENTS.filter(agent => !unavailableAgents.includes(agent));
    if (availableAgents.length === 0) return;
    const daySlots = SLOTS_CONFIG[day];
    const OPENING_SLOT = daySlots[0];
    const CLOSING_SLOT = daySlots[daySlots.length - 1];
    const coreSlots = daySlots.slice(1, -1);
    assignRoleToBestCandidate(planning, day, OPENING_SLOT, [...availableAgents], ROLES.OUVERTURE.value, roleCounts);
    const MORNING_RDV_SLOT = '10h-12h30';
    if (daySlots.includes(MORNING_RDV_SLOT)) {
        assignRoleToBestCandidate(planning, day, MORNING_RDV_SLOT, [...availableAgents], ROLES.RDV_MATIN.value, roleCounts);
    }
    const RDV_SLOT_1 = '14h–16h30';
    const RDV_SLOT_2 = '16h30–19h';
    if (daySlots.includes(RDV_SLOT_1) && daySlots.includes(RDV_SLOT_2)) {
        const rdvCandidate = assignRoleToBestCandidate(planning, day, RDV_SLOT_1, [...availableAgents], ROLES.RDV.value, roleCounts);
        if (rdvCandidate) {
            planning[day][RDV_SLOT_2][rdvCandidate] = ROLES.RDV.value;
            const rdvCountKey = ROLE_MAP[ROLES.RDV.value].countAs || ROLES.RDV.value;
            if (roleCounts[rdvCandidate] && roleCounts[rdvCandidate][rdvCountKey]) {
                roleCounts[rdvCandidate][rdvCountKey]++;
            }
        }
    }
    let nomadisAssignedThisDay = [];
    coreSlots.forEach(slot => {
        const agentsForNomadis = availableAgents.filter(a => !nomadisAssignedThisDay.includes(a));
        const nomadisAssignee = assignRoleToBestCandidate(planning, day, slot, [...agentsForNomadis], ROLES.NOMADIS.value, roleCounts);
        if(nomadisAssignee) {
            nomadisAssignedThisDay.push(nomadisAssignee);
        }
    });
    const slotsToFillWithJoker = daySlots.filter(s => s !== OPENING_SLOT && s !== CLOSING_SLOT);
    slotsToFillWithJoker.forEach(slot => {
        availableAgents.forEach(agent => {
            if (planning[day][slot][agent] === ROLES.DEFAULT.value) {
                planning[day][slot][agent] = ROLES.JOKER.value;
            }
        });
    });
}

export const generateFullPlanning = (selectedRestDays, selectedSchoolDays, selectedFormationDays, pinnedSlots, currentPlanning) => {
    let newPlanning = createEmptyPlanning();
    pinnedSlots.forEach(pinKey => {
        const [day, slot, agent] = pinKey.split('-');
        const originalRole = currentPlanning[day]?.[slot]?.[agent]; 
        if (originalRole && newPlanning[day]?.[slot]) {
            newPlanning[day][slot][agent] = originalRole;
        }
    });
    const roleCounts = calculateWeeklyRoleCounts(newPlanning);
    for (const day of DAYS) {
        generateRolesForDay(newPlanning, day, roleCounts, selectedRestDays, selectedSchoolDays, selectedFormationDays);
        newPlanning = enforceClosingRuleForDay(newPlanning, day, pinnedSlots);
    }
    return newPlanning;
};