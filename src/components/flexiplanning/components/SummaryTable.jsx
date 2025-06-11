import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bed, AlertTriangle } from 'lucide-react';
import { ROLES_TO_COUNT } from '../config';

export default React.memo(function SummaryTable({ agents, activeAgents, roleCounts, roleImbalances }) {
    return (
        <Card>
            <CardHeader><CardTitle className="text-2xl font-semibold text-slate-700">📊 Récapitulatif Hebdomadaire</CardTitle></CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-base">Conseiller</TableHead>
                                {ROLES_TO_COUNT.map(key => (<TableHead key={key} className="text-center text-base">{key}</TableHead>))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agents.map(agent => {
                                const isAgentActive = activeAgents.includes(agent);
                                return (
                                    <TableRow key={agent}>
                                        <TableCell className="font-medium text-lg">{agent}</TableCell>
                                        {isAgentActive ? (
                                            ROLES_TO_COUNT.map(key => {
                                                const count = roleCounts[agent]?.[key] || 0;
                                                const isImbalancedRole = roleImbalances[key];
                                                const isMinImbalanced = isImbalancedRole && count === roleImbalances[key].min;
                                                const isMaxImbalanced = isImbalancedRole && count === roleImbalances[key].max;
                                                const cellClassName = `text-center font-mono text-lg transition-colors ${isMinImbalanced ? 'bg-red-100 text-red-900' : ''} ${isMaxImbalanced ? 'bg-yellow-100 text-yellow-900' : ''}`;
                                                const tooltipContent = isMinImbalanced ? `Cet agent a le moins de tâches '${key}'.` : isMaxImbalanced ? `Cet agent a le plus de tâches '${key}'.` : null;

                                                return (
                                                    <TableCell key={key} className={cellClassName}>
                                                        {tooltipContent ? (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><span className="w-full h-full inline-block p-2 rounded-md">{count}</span></TooltipTrigger>
                                                                <TooltipContent className="bg-slate-700 text-white"><p className="flex items-center"><AlertTriangle className="h-4 w-4 mr-2" />{tooltipContent}</p></TooltipContent>
                                                            </Tooltip>
                                                        ) : count}
                                                    </TableCell>
                                                );
                                            })
                                        ) : (
                                            <TableCell colSpan={ROLES_TO_COUNT.length} className="text-center italic text-slate-500 bg-slate-50">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Bed className="h-4 w-4" />
                                                    <span>En école / repos toute la semaine</span>
                                                </div>
                                            </TableCell>
                                        )}
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