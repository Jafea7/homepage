import Block from "components/services/widget/block";
import Container from "components/services/widget/container";

import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { widget } = service;
  const { data: health, error: healthError } = useWidgetAPI(widget, "health");
  const { data: summary, error: summaryError } = useWidgetAPI(widget, "summary");

  if (healthError || summaryError) {
    return <Container service={service} error={healthError ?? summaryError} />;
  }

  const active = Array.isArray(summary?.currentlyRecording) ? summary.currentlyRecording.length : undefined;
  const recovering = health?.workload?.recoveringRecordings;
  const missed = health?.workload?.missedHlsSegmentsLastHour;
  const throughput = summary?.throughput;

  return (
    <Container service={service}>
      <Block label="Recording" value={active} />
      <Block label="Recovering" value={recovering} />
      <Block label="Missed HLS (1h)" value={missed} />
      <Block
        label="Throughput"
        value={typeof throughput === "number" && throughput >= 0 ? `${(throughput / 1000000).toFixed(1)} MB/s` : undefined}
      />
    </Container>
  );
}
