export const PROVINCES = ['Barcelona', 'Girona', 'Lleida', 'Tarragona'] as const;

export const DISTANCE_GROUPS = ['0-10', '10-20', '20-30', '30-40', '40-50', '50+'] as const;
export type DistanceGroup = (typeof DISTANCE_GROUPS)[number];

export const TEST_VERIFIED_RACES_NAME = [
    'Trail Cap de Creus 40K',
    'Trail Cap de Creus 30K',
    'Trail Cap de Creus 20K',
    'Xtrail Series Run Mataró 21.5K',
    'Xtrail Series Run Mataró 15.5K',
    'Xtrail Series Run Mataró 9.5K',
    'Xtrail Series Run Mataró 5.5K',
    'Oli Trail 24K',
    'Oli Trail 13K'
]