// Fichier: src/components/flexiplanning/reducer.js

import { createEmptyPlanning, generateFullPlanning, rebalanceWeeklyRoles } from './logic.js';

export const initialState = {
    planning: createEmptyPlanning(),
    selectedRestDays: {},
    selectedSchoolDays: {},
    selectedFormationDays: {},
};

export function planningReducer(state, action) {
    switch (action.type) {
        case 'UPDATE_ALL': {
            return {
                ...state,
                planning: action.payload.planning,
                selectedRestDays: action.payload.selectedRestDays,
                selectedSchoolDays: action.payload.selectedSchoolDays,
                selectedFormationDays: action.payload.selectedFormationDays,
            }
        }
        case 'MANUAL_UPDATE': {
            return { ...state, planning: action.payload };
        }
        case 'GENERATE_FULL': {
            const newFullPlanning = generateFullPlanning(
                state.selectedRestDays, 
                state.selectedSchoolDays, 
                state.selectedFormationDays,
                action.payload.pinnedSlots,
                state.planning
            );
            const balancedPlanning = rebalanceWeeklyRoles(newFullPlanning, action.payload.pinnedSlots);
            return { ...state, planning: balancedPlanning };
        }
        case 'RESET': {
            return initialState;
        }
        default:
            return state;
    }
}