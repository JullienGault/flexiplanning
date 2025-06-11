// Fichier: src/components/flexiplanning/config.js

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const AGENTS = ['Tom', 'Jullien', 'Enzo', 'Kenza', 'Manu', 'Guewen', 'Marie', 'Louna'];
export const ALTERNANTS = ['Louna', 'Enzo'];

export const SLOTS_CONFIG = {
    'Lundi':    ['Ouverture (13h30-14h)', '14h–16h30', '16h30–19h', 'Fermeture (19h)'],
    'Mardi':    ['Ouverture (9h30–10h)', '10h-12h30', '14h–16h30', '16h30–19h', 'Fermeture (19h)'],
    'Mercredi': ['Ouverture (9h30–10h)', '10h-12h30', '14h–16h30', '16h30–19h', 'Fermeture (19h)'],
    'Jeudi':    ['Ouverture (9h30–10h)', '10h-12h30', '14h–16h30', '16h30–19h', 'Fermeture (19h)'],
    'Vendredi': ['Ouverture (9h30–10h)', '10h-12h30', '14h–16h30', '16h30–19h', 'Fermeture (19h)'],
    'Samedi':   ['Ouverture (9h30–10h)', '10h-12h30', '14h–16h30', '16h30–19h', 'Fermeture (19h)'],
};

export const ROLES = {
    DEFAULT:   { value: '–', isCounted: false, isFlexible: true, isImmutable: false, className: 'bg-slate-100 text-slate-800' },
    RDV_MATIN: { value: 'RDV Matin', isCounted: true, countAs: 'RDV', isFlexible: false, isImmutable: false, className: 'bg-sky-500 text-white' },
    RDV:       { value: 'RDV Apres Midi', isCounted: true, countAs: 'RDV', isFlexible: false, isImmutable: false, className: 'bg-sky-500 text-white' },
    NOMADIS:   { value: 'Nomadis', isCounted: true, isFlexible: false, isImmutable: false, className: 'bg-teal-500 text-white' },
    JOKER:     { value: 'Joker', isCounted: false, isFlexible: true, isImmutable: false, className: 'bg-amber-300 text-amber-900' },
    REPOS:     { value: 'Repos', isCounted: false, isFlexible: false, isImmutable: true, className: 'bg-slate-300 text-slate-700' },
    ECOLE:     { value: 'École', isCounted: false, isFlexible: false, isImmutable: true, className: 'bg-orange-500 text-white' },
    FORMATION: { value: 'Formation', isCounted: false, isFlexible: false, isImmutable: true, className: 'bg-amber-800 text-white' },
    OUVERTURE: { value: 'Ouverture', isCounted: true, isFlexible: false, isImmutable: false, className: 'bg-red-600 text-white' },
    FERMETURE: { value: 'Fermeture', isCounted: false, isFlexible: false, isImmutable: false, className: 'bg-red-600 text-white' },
};

export const ROLE_MAP = Object.fromEntries(Object.values(ROLES).map(r => [r.value, r]));
export const ROLE_VALUES = Object.values(ROLES).map(r => r.value);
export const ROLES_TO_COUNT = ['RDV', 'Nomadis', 'Ouverture'];
export const FLEXIBLE_ROLES = Object.values(ROLES).filter(r => r.isFlexible).map(r => r.value);
export const UNIQUE_ROLES_LIST = [ROLES.NOMADIS.value, ROLES.FERMETURE.value, ROLES.RDV_MATIN.value];

export const getRoleOptionsForSlot = (slot) => {
    if (slot.includes('Ouverture')) return [ROLES.OUVERTURE.value, ROLES.DEFAULT.value];
    if (slot.includes('Fermeture')) return [ROLES.FERMETURE.value, ROLES.DEFAULT.value];
    return ROLE_VALUES;
};