import { useTranslation } from "next-i18next/pages";

import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import useWidgetAPI from "utils/proxy/use-widget-api";

const fields = ["total", "online", "offline", "unknown", "known"];

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "status");

  if (error) {
    return <Container service={service} error={error} />;
  }

  const values = data && {
    total: data.Total,
    online: data.Online,
    offline: data.Offline,
    unknown: data.Unknown,
    known: data.Known,
  };

  return (
    <Container service={service}>
      {fields.map((field) => (
        <Block
          key={field}
          label={`wyl.${field}`}
          value={
            values && Number.isFinite(values[field])
              ? t("common.number", { value: values[field] })
              : undefined
          }
        />
      ))}
    </Container>
  );
}
