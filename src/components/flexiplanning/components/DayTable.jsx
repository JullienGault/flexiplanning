import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bed, GraduationCap, BookMarked, Pin } from 'lucide-react';
import { AGENTS, ALTERNANTS, SLOTS_CONFIG, ROLES, ROLE_MAP, getRoleOptionsForSlot } from '../config';

const getUnavailableRowStyle = (isResting, isAtSchool, isFormation) => {
    if (!isResting && !isAtSchool && !isFormation) return {};
    const color = isResting ? 'rgba(203, 213, 225, 0.4)' : isAtSchool ? 'rgba(249, 115, 22, 0.3)' : 'rgba(146, 64, 14, 0.3)';
    return { background: `repeating-linear-gradient(-45deg, transparent, transparent 10px, ${color} 10px, ${color} 12px)` };
};

export default React.memo(function DayTable({ day, planningForDay, pinnedSlots, onTogglePin, selectedRestDaysForDay, selectedSchoolDaysForDay, selectedFormationDaysForDay, onToggleUnavailability, onManualChange }) {
    return (
        <Card className="mt-2">
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-48 sticky left-0 bg-white dark:bg-slate-900 z-10 text-base">Conseiller</TableHead>
                                {SLOTS_CONFIG[day].map(slot => (<TableHead key={slot} className="text-center min-w-[150px] text-base">{slot}</TableHead>))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {AGENTS.map(agent => {
                                const isResting = selectedRestDaysForDay.includes(agent);
                                const isAtSchool = selectedSchoolDaysForDay.includes(agent);
                                const isFormation = selectedFormationDaysForDay.includes(agent);
                                const isUnavailableForDay = isResting || isAtSchool || isFormation;
                                return (
                                    <TableRow key={agent} style={getUnavailableRowStyle(isResting, isAtSchool, isFormation)}>
                                        <TableCell className="font-medium text-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-10">
                                            <div className="flex justify-between items-center h-full">
                                                <span className="font-bold text-lg">{agent}</span>
                                                <div className="flex items-center gap-1">
                                                    <Tooltip><TooltipTrigger asChild><Button variant={isFormation ? "default" : "ghost"} size="icon" className={`h-8 w-8 ${isFormation ? 'bg-amber-800 hover:bg-amber-900' : ''}`} onClick={() => onToggleUnavailability(day, agent, 'FormationDay')}><BookMarked className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Mettre en formation</p></TooltipContent></Tooltip>
                                                    {ALTERNANTS.includes(agent) && (<Tooltip><TooltipTrigger asChild><Button variant={isAtSchool ? "default" : "ghost"} size="icon" className={`h-8 w-8 ${isAtSchool ? 'bg-orange-500 hover:bg-orange-600' : ''}`} onClick={() => onToggleUnavailability(day, agent, 'SchoolDay')}><GraduationCap className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Mettre en école</p></TooltipContent></Tooltip>)}
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${isResting ? 'bg-slate-500 text-white hover:bg-slate-600' : ''}`} onClick={() => onToggleUnavailability(day, agent, 'RestDay')}><Bed className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Mettre en repos</p></TooltipContent></Tooltip>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {SLOTS_CONFIG[day].map(slot => {
                                            const role = planningForDay?.[slot]?.[agent] ?? ROLES.DEFAULT.value;
                                            const roleInfo = ROLE_MAP[role] || ROLE_MAP.DEFAULT;
                                            const isPinned = pinnedSlots.has(`${day}-${slot}-${agent}`);
                                            return (
                                                <TableCell key={slot} className="p-1 align-middle">
                                                    {isUnavailableForDay ? (
                                                        <div className={`w-full h-12 flex items-center justify-center p-2 rounded-md text-center font-semibold ${roleInfo.className}`}>
                                                            {role === ROLES.ECOLE.value && <GraduationCap className="h-5 w-5 mr-1.5 shrink-0" />}
                                                            {role === ROLES.REPOS.value && <Bed className="h-5 w-5 mr-1.5 shrink-0" />}
                                                            {role === ROLES.FORMATION.value && <BookMarked className="h-5 w-5 mr-1.5 shrink-0" />}
                                                            <span>{role}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="relative group">
                                                            <Tooltip><TooltipTrigger asChild><button onClick={() => onTogglePin(day, slot, agent)} className={`absolute top-1.5 left-1.5 z-20 p-0.5 rounded-full transition-opacity ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:bg-slate-400/20`} aria-label="Toggle pin"><Pin className={`h-3.5 w-3.5 ${isPinned ? 'text-black fill-black' : 'text-black fill-none'}`} /></button></TooltipTrigger><TooltipContent><p>{isPinned ? 'Créneau épinglé. Cliquez pour désépingler.' : 'Cliquez pour épingler ce créneau.'}</p></TooltipContent></Tooltip>
                                                            <select value={role} onChange={e => onManualChange(day, agent, slot, e.target.value)} className={`w-full h-12 p-2 rounded-md border-0 text-center font-semibold transition-colors appearance-none ${roleInfo.className}`}>
                                                                {getRoleOptionsForSlot(slot).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
});