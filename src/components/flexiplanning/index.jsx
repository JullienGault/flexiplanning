// Fichier: src/components/flexiplanning/index.jsx

import React, { useState, useReducer, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bed, GraduationCap, BookMarked, Pin, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { DAYS, AGENTS, SLOTS_CONFIG, ROLES, ROLE_MAP, ROLES_TO_COUNT, FLEXIBLE_ROLES, UNIQUE_ROLES_LIST } from './config.js';
import { calculateWeeklyRoleCounts, getWeeklyActiveAgents, enforceClosingRuleForDay, rebalanceWeeklyRoles } from './logic.js';
import { planningReducer, initialState } from './reducer.js';
import DayTable from './components/DayTable.jsx';
import SummaryTable from './components/SummaryTable.jsx';
import UnavailableAgentPill from './components/UnavailableAgentPill.jsx';

export default function Flexiplanning() {
    const [state, dispatch] = useReducer(planningReducer, initialState);
    const { planning, selectedRestDays, selectedSchoolDays, selectedFormationDays } = state;
    const [pinnedSlots, setPinnedSlots] = useState(new Set());
    const [dayStateSnapshots, setDayStateSnapshots] = useState({});
    const [activeDay, setActiveDay] = useState(DAYS[0]);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isPlanningGenerated, setIsPlanningGenerated] = useState(false);
    const [isNomadisConflictModalOpen, setIsNomadisConflictModalOpen] = useState(false);
    const [nomadisConflictData, setNomadisConflictData] = useState(null);
    const [isRdvConflictModalOpen, setIsRdvConflictModalOpen] = useState(false);
    const [rdvConflictData, setRdvConflictData] = useState(null);
    const [isUnavailabilityConflictModalOpen, setIsUnavailabilityConflictModalOpen] = useState(false);
    const [unavailabilityConflictMessage, setUnavailabilityConflictMessage] = useState("");
    const [isPinConflictModalOpen, setIsPinConflictModalOpen] = useState(false);
    const [pinConflictData, setPinConflictData] = useState(null);

    const generationInfo = useMemo(() => {
        const now = new Date();
        const version = `V${now.getFullYear().toString().slice(-2)}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
        const time = `${now.getHours().toString().padStart(2, '0')}h${now.getMinutes().toString().padStart(2, '0')}`;
        return `Version ${version} (générée le ${now.toLocaleDateString('fr-FR')} à ${time})`;
    }, [isPlanningGenerated]);

    const handleTogglePin = useCallback((day, slot, agent) => {
        setPinnedSlots(prev => {
            const newPinnedSlots = new Set(prev);
            const pinKey = `${day}-${slot}-${agent}`;
            if (newPinnedSlots.has(pinKey)) {
                newPinnedSlots.delete(pinKey);
            } else {
                newPinnedSlots.add(pinKey);
            }
            return newPinnedSlots;
        });
    }, []);

    const applyRoleChange = useCallback((day, agent, slot, newRole, originalRole) => {
        let newPlanning = JSON.parse(JSON.stringify(planning));
        const originalRoleInfo = ROLE_MAP[originalRole];
        const RDV_SLOT_1 = '14h–16h30';
        const RDV_SLOT_2 = '16h30–19h';
        const daySlots = SLOTS_CONFIG[day];
        const isRdvDay = daySlots.includes(RDV_SLOT_1) && daySlots.includes(RDV_SLOT_2);
        if (isRdvDay && (newRole === ROLES.RDV.value || originalRole === ROLES.RDV.value) && (slot === RDV_SLOT_1 || slot === RDV_SLOT_2)) {
            if (newRole === ROLES.RDV.value) {
                const currentRdvAgent = AGENTS.find(a => a !== agent && newPlanning[day][RDV_SLOT_1][a] === ROLES.RDV.value);
                if (currentRdvAgent) {
                    newPlanning[day][RDV_SLOT_1][currentRdvAgent] = ROLES.JOKER.value;
                    newPlanning[day][RDV_SLOT_2][currentRdvAgent] = ROLES.JOKER.value;
                }
                newPlanning[day][RDV_SLOT_1][agent] = ROLES.RDV.value;
                newPlanning[day][RDV_SLOT_2][agent] = ROLES.RDV.value;
            } else {
                newPlanning[day][RDV_SLOT_1][agent] = newRole;
                newPlanning[day][RDV_SLOT_2][agent] = newRole;
            }
        } else {
            newPlanning[day][slot][agent] = newRole;
            if (UNIQUE_ROLES_LIST.includes(newRole)) {
                const holderToSwap = AGENTS.find(a => a !== agent && newPlanning[day][slot][a] === newRole);
                if (holderToSwap) {
                    newPlanning[day][slot][holderToSwap] = originalRole;
                }
            }
        }
        const pinKey = `${day}-${slot}-${agent}`;
        const newPinnedSlots = new Set(pinnedSlots);
        newPinnedSlots.add(pinKey);
        setPinnedSlots(newPinnedSlots);
        const isOriginalRoleNowVacant = !AGENTS.some(a => newPlanning[day][slot][a] === originalRole);
        if (originalRoleInfo && (UNIQUE_ROLES_LIST.includes(originalRole) || originalRole === ROLES.RDV.value) && isOriginalRoleNowVacant) {
            const unavailableForDay = (selectedRestDays[day] || []).concat(selectedSchoolDays[day] || [], selectedFormationDays[day] || []);
            const availableAgents = AGENTS.filter(a => a !== agent && !unavailableForDay.includes(a) && FLEXIBLE_ROLES.includes(newPlanning[day][slot][a]) && !newPinnedSlots.has(`${day}-${slot}-${a}`));
            if (availableAgents.length > 0) {
                const roleCounts = calculateWeeklyRoleCounts(newPlanning);
                const countKey = originalRoleInfo.countAs || originalRoleInfo.value;
                const replacement = availableAgents.sort((a, b) => (roleCounts[a]?.[countKey] || 0) - (roleCounts[b]?.[countKey] || 0))[0];
                if (originalRole === ROLES.RDV.value) {
                     const isReplacementFlexibleOnBoth = FLEXIBLE_ROLES.includes(newPlanning[day][RDV_SLOT_1][replacement]) && FLEXIBLE_ROLES.includes(newPlanning[day][RDV_SLOT_2][replacement]);
                    if(isReplacementFlexibleOnBoth){
                        newPlanning[day][RDV_SLOT_1][replacement] = ROLES.RDV.value;
                        newPlanning[day][RDV_SLOT_2][replacement] = ROLES.RDV.value;
                    }
                } else {
                    newPlanning[day][slot][replacement] = originalRole;
                }
            }
        }
        let finalPlanning = enforceClosingRuleForDay(newPlanning, day, newPinnedSlots);
        finalPlanning = rebalanceWeeklyRoles(finalPlanning, newPinnedSlots);
        dispatch({ type: 'MANUAL_UPDATE', payload: finalPlanning });
    }, [planning, pinnedSlots, setPinnedSlots, selectedRestDays, selectedSchoolDays, selectedFormationDays]);

    const handleConfirmNomadisConflict = () => { /* ... collez ici le code de la fonction ... */ };
    const handleConfirmRdvConflict = () => { /* ... collez ici le code de la fonction ... */ };
    const handleManualChange = useCallback((day, agent, slot, newRole) => { /* ... collez ici le code de la fonction ... */ }, [planning, applyRoleChange]);
    const runReset = () => { /* ... collez ici le code de la fonction ... */ };
    const runGenerateFull = () => { /* ... collez ici le code de la fonction ... */ };
    const handleGenerateFullClick = () => { /* ... collez ici le code de la fonction ... */ };
    const handleToggleUnavailability = useCallback((day, agent, type) => { /* ... collez ici le code de la fonction ... */ }, [state, planning, pinnedSlots, setPinnedSlots, dayStateSnapshots, isPlanningGenerated]);

    const activeAgents = useMemo(() => getWeeklyActiveAgents(planning), [planning]);
    const roleCounts = useMemo(() => calculateWeeklyRoleCounts(planning), [planning]);
    const roleImbalances = useMemo(() => {
        const imbalances = {};
        if (activeAgents.length <= 1) return imbalances;
        ROLES_TO_COUNT.forEach(role => {
            const countsPerAgent = activeAgents.map(agent => roleCounts[agent]?.[role] || 0);
            const minCount = Math.min(...countsPerAgent);
            const maxCount = Math.max(...countsPerAgent);
            if (maxCount - minCount >= 2) {
                imbalances[role] = { min: minCount, max: maxCount };
            }
        });
        return imbalances;
    }, [roleCounts, activeAgents]);

    return (
        <TooltipProvider delayDuration={300}>
            <div className="max-w-full mx-auto p-4 sm:p-6 bg-slate-50 space-y-6">
                <header className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">📅 Flexiplanning- Orange Store Cognac</h1>
                        <p className="text-xs text-slate-500 mt-1">{generationInfo}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => setIsResetModalOpen(true)}>Réinitialiser</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleGenerateFullClick}>Générer le Planning</Button>
                    </div>
                </header>
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-grow">
                        <Tabs value={activeDay} onValueChange={setActiveDay} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
                                {DAYS.map(day => {
                                    const unavailabilities = [
                                        ...(selectedRestDays[day] || []).map(agent => ({ agent, type: 'Rest' })),
                                        ...(selectedSchoolDays[day] || []).map(agent => ({ agent, type: 'School' })),
                                        ...(selectedFormationDays[day] || []).map(agent => ({ agent, type: 'Formation' }))
                                    ];
                                    return (
                                        <TabsTrigger key={day} value={day} className="h-full py-2">
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <span className="text-sm font-medium">{day}</span>
                                                {unavailabilities.length > 0 && (
                                                    <div className="flex items-center justify-center flex-wrap gap-1.5">
                                                        {unavailabilities.map(unavailability => (
                                                            <UnavailableAgentPill 
                                                                key={`${unavailability.agent}-${unavailability.type}`} 
                                                                unavailability={unavailability} 
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                            {DAYS.map(day => (
                                <TabsContent key={day} value={day}>
                                    <DayTable 
                                        day={day} 
                                        planningForDay={planning[day]}
                                        pinnedSlots={pinnedSlots} 
                                        onTogglePin={handleTogglePin}
                                        selectedRestDaysForDay={selectedRestDays[day] || []}
                                        selectedSchoolDaysForDay={selectedSchoolDays[day] || []}
                                        selectedFormationDaysForDay={selectedFormationDays[day] || []}
                                        onToggleUnavailability={handleToggleUnavailability}
                                        onManualChange={handleManualChange}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                    <div className="lg:w-96 flex-shrink-0">
                        <SummaryTable agents={AGENTS} activeAgents={activeAgents} roleCounts={roleCounts} roleImbalances={roleImbalances} />
                    </div>
                </div>
            </div>
            {/* Collez ici tout le JSX pour les AlertDialogs */}
        </TooltipProvider>
    );
}