import {
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  FlameIcon,
  LightbulbIcon,
  ShieldIcon,
  SirenIcon,
  TrafficConeIcon,
  Trash2Icon,
  UsersIcon,
  Volume2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react-native";

import type { ReportCategory } from "@/services/appwrite";

export type ReportVisualStyle = {
  label: string;
  color: string;
  Icon: LucideIcon;
};

export const REPORT_CATEGORY_MARKER_STYLES: Record<ReportCategory, ReportVisualStyle> = {
  security: { label: "SEGURIDAD", color: "#00B7FF", Icon: UsersIcon },
  traffic: { label: "TRÁNSITO", color: "#C91F32", Icon: CircleAlertIcon },
  infrastructure: { label: "INFRAESTRUCTURA", color: "#E2A712", Icon: TrafficConeIcon },
  lighting: { label: "PROBLEMA DE LUZ", color: "#F5C648", Icon: LightbulbIcon },
  waste: { label: "BASURA", color: "#4EBB68", Icon: Trash2Icon },
  fire: { label: "INCENDIO", color: "#FF6A3D", Icon: FlameIcon },
  noise: { label: "RUIDOS", color: "#8D6ADE", Icon: Volume2Icon },
  accident: { label: "ACCIDENTE", color: "#A44A4A", Icon: SirenIcon },
  event: { label: "EVENTO", color: "#2FC2A6", Icon: CalendarClockIcon },
};

export const REPORT_STATUS_STYLES: Record<string, ReportVisualStyle> = {
  active: { label: "ACTIVO", color: "#F5C648", Icon: CircleAlertIcon },
  solved: { label: "SOLUCIONADO", color: "#4EBB68", Icon: CheckIcon },
  false: { label: "FALSO", color: "#C91F32", Icon: XIcon },
};

export function getReportMarkerStyle(category: ReportCategory): ReportVisualStyle {
  return REPORT_CATEGORY_MARKER_STYLES[category] ?? {
    label: category.toUpperCase(),
    color: "#00B7FF",
    Icon: ShieldIcon,
  };
}

export function getReportStatusStyle(status: string): ReportVisualStyle {
  return REPORT_STATUS_STYLES[status] ?? {
    label: status.toUpperCase(),
    color: "#8FA7BD",
    Icon: ShieldIcon,
  };
}
