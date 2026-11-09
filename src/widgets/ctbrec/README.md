# CTBRec widget

The widget uses CTBRec's existing HMAC-authenticated `POST /rec` API. The
configured key is used server-side to sign the exact JSON request body; it is
never sent to the CTBRec server or browser as a raw key.

Example `services.yaml`:

```yaml
- Recorders:
    - CTBRec:
        href: http://ctbrec:8080
        description: Recording server
        widget:
          type: ctbrec
          url: http://ctbrec:8080
          key: "{{HOMEPAGE_VAR_CTBREC_KEY}}"
```

Use the recorder client's configured `key` value verbatim, not the WebUI
password. Set `HOMEPAGE_VAR_CTBREC_KEY` in Homepage's environment.

The widget displays active recordings, recovering recordings, missed HLS
segments over the previous hour, and throughput. It requires a CTBRec version
that exposes `workload` in the `health` response.

The key grants full remote recorder access. Restrict access to Homepage's
configuration and environment, use HTTPS on untrusted networks, and do not
expose this key in client-side configuration.
