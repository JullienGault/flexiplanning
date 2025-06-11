import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function UnavailableAgentPill({ unavailability }) {
    const { agent, type } = unavailability;

    const STYLE_MAP = {
        Rest: { className: 'bg-slate-300 text-slate-700', tooltip: `${agent} est en repos` },
        School: { className: 'bg-orange-400 text-white', tooltip: `${agent} est en école` },
        Formation: { className: 'bg-amber-600 text-white', tooltip: `${agent} est en formation` },
    };

    const displayStyle = STYLE_MAP[type];
    if (!displayStyle) return null;

    const displayInitial = agent.substring(0, 3);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={`flex items-center justify-center h-5 w-auto rounded-full text-xs font-bold px-1.5 ${displayStyle.className}`}>
                    {displayInitial}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{displayStyle.tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
};
