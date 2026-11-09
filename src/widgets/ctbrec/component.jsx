import Block from "components/services/widget/block";
import Container from "components/services/widget/container";

import useWidgetAPI from "utils/proxy/use-widget-api";

const DEFAULT_FIELDS = ["tracked", "online", "recording", "ppQueue"];
const LABELS = {
  tracked: "Tracked",
  online: "Online",
  recording: "Recording",
  ffmpeg: "FFmpeg",
  ppQueue: "PP Queue",
  ppActive: "PP Active",
  ppDone: "PP Done",
  processing: "Processing",
  recovering: "Recovering",
  hlsMissed: "HLS Missed",
  speed: "Speed",
  cpu: "CPU",
  freeSpace: "Free Space",
  httpUsed: "HTTP Used",
  status: "Status",
  uptime: "Uptime",
  paused: "Paused",
  bookmarked: "Bookmarked",
  totalRecordings: "Recordings",
};

const number = (value) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined);
const count = (value) => (Array.isArray(value) ? value.length : number(value));
const firstNumber = (object, ...keys) => keys.map((key) => number(object?.[key])).find((value) => value !== undefined);
const bytes = (value) => (number(value) === undefined ? undefined : `${(value / 1e9).toFixed(1)} GB`);

function fieldValue(field, health, summary) {
  const pp = health?.postProcessing;
  const recordings = summary?.recordings;
  switch (field) {
    case "tracked": return number(health?.trackedModels);
    case "online": return number(health?.onlineModels);
    case "recording": return number(health?.activeRecordings);
    case "ffmpeg": return number(health?.activeFfmpegProcesses);
    case "ppQueue": return firstNumber(pp, "queueSize", "queuedTasks", "queueDepth", "queueCount");
    case "ppActive": return firstNumber(pp, "activeCount", "activeTasks", "active");
    case "ppDone": return firstNumber(pp, "completedTaskCount", "completedTasks", "completedCount");
    case "processing": return Array.isArray(recordings) ? recordings.filter((r) => r.status === "POST_PROCESSING").length : undefined;
    case "recovering": return number(health?.workload?.recoveringRecordings);
    case "hlsMissed": return number(health?.workload?.missedHlsSegmentsLastHour);
    case "speed": {
      const size = number(health?.throughputBytes);
      const duration = number(health?.throughputTimeframeMillis);
      return size !== undefined && duration > 0 ? `${((size * 1000) / duration / 1e6).toFixed(1)} MB/s` : undefined;
    }
    case "cpu": return number(health?.hostCpuUsagePercent) === undefined ? undefined : `${health.hostCpuUsagePercent.toFixed(1)}%`;
    case "freeSpace": return bytes(firstNumber(health?.disk, "freeBytes", "spaceFree", "usableBytes"));
    case "httpUsed": return firstNumber(health?.httpPool, "inUse", "inUseConnections", "activeConnections");
    case "status": return typeof health?.recorderRunning === "boolean" ? (health.recorderRunning ? "Running" : "Paused") : undefined;
    case "uptime": {
      const start = Date.parse(health?.recorderStartedAt);
      const end = Date.parse(health?.capturedAt);
      return Number.isFinite(start) && Number.isFinite(end) && end >= start ? `${Math.floor((end - start) / 3600000)}h` : undefined;
    }
    case "paused": return Array.isArray(summary?.models) ? summary.models.filter((m) => m.suspended).length : undefined;
    case "bookmarked": return Array.isArray(summary?.models) ? summary.models.filter((m) => m.bookmarked ?? m.markedForLater).length : undefined;
    case "totalRecordings": return count(recordings);
    default: return undefined;
  }
}

export default function Component({ service }) {
  const { widget } = service;
  const configured = Array.isArray(widget?.fields) ? widget.fields.filter((field) => LABELS[field]) : DEFAULT_FIELDS;
  const fields = configured.length ? configured.slice(0, 4) : DEFAULT_FIELDS;
  const needsSummary = fields.some((field) => ["processing", "paused", "bookmarked", "totalRecordings"].includes(field));
  const { data: health, error: healthError } = useWidgetAPI(widget, "health");
  const { data: summary, error: summaryError } = useWidgetAPI(widget, needsSummary ? "summary" : "");

  if (healthError || summaryError) {
    return <Container service={service} error={healthError ?? summaryError} />;
  }

  return (
    <Container service={service}>
      {fields.map((field) => (
        <Block key={field} field={`ctbrec.${field}`} label={LABELS[field]} value={fieldValue(field, health, summary)} />
      ))}
    </Container>
  );
}
