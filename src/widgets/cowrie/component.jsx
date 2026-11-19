import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";

import useWidgetAPI from "utils/proxy/use-widget-api";
import withWidgetFields from "utils/widget-fields";

const DEFAULT_FIELDS = ["sessions", "login_attempts", "unique_ips", "commands"];
const KNOWN_FIELDS = ["sessions", "login_attempts", "login_success", "login_failed", "unique_ips", "commands", "downloads"];

export default function Component({ service: configuredService }) {
  const { t } = useTranslation();
  const safeFields = configuredService.widget.fields?.filter((field) => KNOWN_FIELDS.includes(field));
  const service = withWidgetFields(
    { ...configuredService, widget: { ...configuredService.widget, fields: safeFields } },
    DEFAULT_FIELDS,
  );
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "summary");
  if (error || data?.error) return <Container service={service} error={error ?? data.error} />;
  const scope = widget.period === "lifetime" ? "lifetime" : "last24h";
  const metrics = data?.[scope];
  return (
    <Container service={service}>
      {widget.fields.map((field) => (
        <Block
          key={field}
          label={`cowrie.${field}`}
          field={`cowrie.${field}`}
          value={Number.isFinite(metrics?.[field]) ? t("common.number", { value: metrics[field] }) : undefined}
        />
      ))}
    </Container>
  );
}
