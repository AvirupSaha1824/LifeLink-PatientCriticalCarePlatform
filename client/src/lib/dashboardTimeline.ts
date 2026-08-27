export type CareTaskStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "delayed" | "cancelled";

export type CareTask = {
  referenceCode: string;
  treatmentType: "transfusion" | "chemotherapy";
  treatmentDetail: string;
  status: CareTaskStatus;
  scheduledForAt: Date | string;
};

export function formatDashboardNow(now: Date) {
  return {
    date: new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(now),
    time: new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(now),
  };
}

export function indiaLocalHour(now: Date) {
  const hour = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" })
    .formatToParts(now)
    .find(part => part.type === "hour")?.value;
  return Number(hour ?? "0");
}

export function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function selectCurrentCareTask(tasks: CareTask[]) {
  const priority: Record<CareTaskStatus, number> = {
    in_progress: 0,
    confirmed: 1,
    scheduled: 2,
    delayed: 3,
    completed: 4,
    cancelled: 5,
  };

  return [...tasks].sort((left, right) => {
    const priorityDifference = priority[left.status] - priority[right.status];
    if (priorityDifference !== 0) return priorityDifference;
    return new Date(left.scheduledForAt).getTime() - new Date(right.scheduledForAt).getTime();
  })[0];
}

export function describeCaregiverNetwork(linkStatuses: Array<"invited" | "active" | "paused" | "revoked">) {
  const active = linkStatuses.filter(status => status === "active").length;
  const invited = linkStatuses.filter(status => status === "invited").length;
  return { active, invited, label: `${active} active${invited ? ` · ${invited} invited` : ""}` };
}
