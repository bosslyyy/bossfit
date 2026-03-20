export type AdminTone = "accent" | "success" | "warning" | "danger" | "neutral";

export interface AdminMember {
  id: string;
  name: string;
  goal: string;
  group: string;
  trainer: string;
  status: "Activo" | "Atención" | "Nuevo";
  attendance: number;
  streak: number;
  lastCheckIn: string;
}

export interface AdminTrainer {
  id: string;
  name: string;
  specialty: string;
  members: number;
  groups: number;
  adherence: number;
  availability: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  focus: string;
  trainer: string;
  schedule: string;
  members: number;
  adherence: number;
}

export interface AdminAssignment {
  id: string;
  memberName: string;
  trainerName: string;
  groupName: string;
  planName: string;
  status: "Estable" | "Pendiente" | "Reasignar";
  nextReview: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  helper: string;
  tone: AdminTone;
}

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/trainers", label: "Entrenadores" },
  { href: "/admin/groups", label: "Grupos" },
  { href: "/admin/assignments", label: "Asignaciones" }
] as const;

export const ADMIN_GYM_SUMMARY = {
  gymName: "BossFit Performance Club",
  location: "San Jose, CR",
  activeMembers: 84,
  activeTrainers: 5,
  activeGroups: 8,
  checkInsToday: 37,
  monthlyRetention: 92,
  flaggedMembers: 6
};

export const ADMIN_METRICS: AdminMetric[] = [
  {
    label: "Cumplimiento semanal",
    value: "81%",
    helper: "+6 pts vs semana pasada",
    tone: "success"
  },
  {
    label: "Check-ins hoy",
    value: "37",
    helper: "19 ya completaron su plan",
    tone: "accent"
  },
  {
    label: "Miembros en riesgo",
    value: "6",
    helper: "Sin actividad en 3 dias o mas",
    tone: "warning"
  },
  {
    label: "Capacidad coaches",
    value: "72%",
    helper: "Espacio para 11 alumnos nuevos",
    tone: "neutral"
  }
];

export const ADMIN_ALERTS = [
  {
    title: "Seguimiento urgente",
    detail: "Andrea, Mateo y Sofia bajaron su racha esta semana.",
    tone: "warning" as const
  },
  {
    title: "Grupo por despegar",
    detail: "Functional AM ya subio a 88% de adherencia con 3 espacios libres.",
    tone: "success" as const
  },
  {
    title: "Carga del staff",
    detail: "Coach Elena tiene 18 alumnos activos; conviene repartir 2 esta semana.",
    tone: "neutral" as const
  }
];

export const ADMIN_RECENT_ACTIVITY = [
  {
    title: "4 miembros nuevos se integraron a Beginners Reset",
    detail: "Asignados entre Coach Luis y Coach Elena.",
    time: "Hace 45 min"
  },
  {
    title: "Se actualizo el plan Summer Cut",
    detail: "El bloque de movilidad ahora queda 3 veces por semana.",
    time: "Hace 2 h"
  },
  {
    title: "14 alumnos completaron sus habitos de hoy",
    detail: "El pico de actividad llego entre 6:00 y 7:30 a.m.",
    time: "Hoy"
  }
];

export const ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "member-01",
    name: "Valeria Rojas",
    goal: "Perdida de grasa",
    group: "Summer Cut",
    trainer: "Coach Luis",
    status: "Activo",
    attendance: 92,
    streak: 14,
    lastCheckIn: "Hoy, 6:40 a.m."
  },
  {
    id: "member-02",
    name: "Mateo Solis",
    goal: "Fuerza base",
    group: "Strength Reset",
    trainer: "Coach Elena",
    status: "Atención",
    attendance: 48,
    streak: 1,
    lastCheckIn: "Hace 3 dias"
  },
  {
    id: "member-03",
    name: "Andrea Campos",
    goal: "Habito y constancia",
    group: "Beginners Reset",
    trainer: "Coach Elena",
    status: "Atención",
    attendance: 55,
    streak: 2,
    lastCheckIn: "Ayer, 8:15 p.m."
  },
  {
    id: "member-04",
    name: "Gabriel Mena",
    goal: "Resistencia",
    group: "Hybrid Noon",
    trainer: "Coach Marco",
    status: "Activo",
    attendance: 87,
    streak: 11,
    lastCheckIn: "Hoy, 12:10 p.m."
  },
  {
    id: "member-05",
    name: "Daniela Vargas",
    goal: "Inicio guiado",
    group: "Beginners Reset",
    trainer: "Coach Luis",
    status: "Nuevo",
    attendance: 100,
    streak: 3,
    lastCheckIn: "Hoy, 7:05 a.m."
  }
];

export const ADMIN_TRAINERS: AdminTrainer[] = [
  {
    id: "trainer-01",
    name: "Coach Luis",
    specialty: "Pérdida de grasa y adherencia",
    members: 16,
    groups: 3,
    adherence: 84,
    availability: "2 cupos nuevos"
  },
  {
    id: "trainer-02",
    name: "Coach Elena",
    specialty: "Fuerza inicial y movilidad",
    members: 18,
    groups: 3,
    adherence: 78,
    availability: "Carga alta"
  },
  {
    id: "trainer-03",
    name: "Coach Marco",
    specialty: "Rendimiento híbrido",
    members: 11,
    groups: 2,
    adherence: 89,
    availability: "4 cupos libres"
  }
];

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: "group-01",
    name: "Beginners Reset",
    focus: "Constancia, tecnica y confianza",
    trainer: "Coach Elena",
    schedule: "Lun / Mie / Vie - 7:00 a.m.",
    members: 14,
    adherence: 74
  },
  {
    id: "group-02",
    name: "Summer Cut",
    focus: "Déficit, cardio y movilidad",
    trainer: "Coach Luis",
    schedule: "Mar / Jue / Sab - 6:00 a.m.",
    members: 12,
    adherence: 88
  },
  {
    id: "group-03",
    name: "Strength Reset",
    focus: "Fuerza base y progresión",
    trainer: "Coach Elena",
    schedule: "Lun / Mie / Vie - 6:30 p.m.",
    members: 10,
    adherence: 69
  },
  {
    id: "group-04",
    name: "Hybrid Noon",
    focus: "Resistencia y core",
    trainer: "Coach Marco",
    schedule: "Lun a Vie - 12:00 m.",
    members: 9,
    adherence: 83
  }
];

export const ADMIN_ASSIGNMENTS: AdminAssignment[] = [
  {
    id: "assign-01",
    memberName: "Valeria Rojas",
    trainerName: "Coach Luis",
    groupName: "Summer Cut",
    planName: "Cut Phase 02",
    status: "Estable",
    nextReview: "Viernes"
  },
  {
    id: "assign-02",
    memberName: "Mateo Solis",
    trainerName: "Coach Elena",
    groupName: "Strength Reset",
    planName: "Strength Base",
    status: "Reasignar",
    nextReview: "Hoy"
  },
  {
    id: "assign-03",
    memberName: "Daniela Vargas",
    trainerName: "Coach Luis",
    groupName: "Beginners Reset",
    planName: "Starter 21D",
    status: "Pendiente",
    nextReview: "Mañana"
  },
  {
    id: "assign-04",
    memberName: "Gabriel Mena",
    trainerName: "Coach Marco",
    groupName: "Hybrid Noon",
    planName: "Hybrid Engine",
    status: "Estable",
    nextReview: "Lunes"
  }
];
