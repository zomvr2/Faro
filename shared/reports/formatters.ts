function formatLongSpanishDate(date: Date, includeYear: boolean): string {
  const day = new Intl.DateTimeFormat("es-CL", { day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(date);
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  if (!includeYear) {
    return `${day} de ${capitalizedMonth}`;
  }

  const year = new Intl.DateTimeFormat("es-CL", { year: "numeric" }).format(date);
  return `${day} de ${capitalizedMonth} de ${year}`;
}

export function formatFeedRelativeDate(dateValue: string): string {
  const timestamp = Date.parse(dateValue);

  if (Number.isNaN(timestamp)) {
    return "Fecha desconocida";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return "Hace instantes";
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  if (days < 7) {
    return `Hace ${days} d`;
  }

  return formatLongSpanishDate(new Date(timestamp), false);
}

export function formatReportDate(isoDate: string): string {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) {
    return "sin fecha";
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "hace unos segundos";
  }

  if (diffMins < 60) {
    return `hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
  }

  if (diffHours < 24) {
    return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  }

  if (diffDays < 7) {
    return `Hace ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
  }

  return formatLongSpanishDate(new Date(timestamp), true);
}
