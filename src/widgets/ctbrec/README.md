# CTBRec widget

The widget uses CTBRec's HMAC-authenticated `POST /rec` API. The Base64
configuration key is decoded into the original key bytes server-side and used
to sign the exact outgoing JSON body. The key is never sent to the browser.

Example `services.yaml`:

```yaml
- Recorders:
    - CTBRec:
        href: https://ctbrec.example:8080
        description: Recording server
        widget:
          type: ctbrec
          url: https://ctbrec.example:8080
          key: "{{HOMEPAGE_VAR_CTBREC_KEY}}"
          fields:
            - tracked
            - online
            - recording
            - ppQueue
```

`fields` is optional. By default the widget shows `tracked`, `online`,
`recording`, and `ppQueue`. Up to four recognised fields are displayed,
in the order configured. Unknown field names are ignored.

Available fields:

| Field | Label | Data |
| --- | --- | --- |
| `tracked` | Tracked | Number of tracked models |
| `online` | Online | Number of online models |
| `recording` | Recording | Active recording count |
| `ffmpeg` | FFmpeg | Active FFmpeg processes |
| `ppQueue` | PP Queue | Post-processing executor queue depth |
| `ppActive` | PP Active | Active post-processing executor tasks |
| `ppDone` | PP Done | Completed executor tasks |
| `processing` | Processing | Recording entries with POST_PROCESSING status |
| `recovering` | Recovering | Recordings recovering from a stall |
| `hlsMissed` | HLS Missed | Skipped HLS segments in the last hour |
| `speed` | Speed | Download throughput in MB/s |
| `cpu` | CPU | Host CPU usage percentage |
| `freeSpace` | Free Space | Free recording storage |
| `httpUsed` | HTTP Used | HTTP connections in use |
| `status` | Status | Recorder running or paused |
| `uptime` | Uptime | Recorder uptime in hours |
| `paused` | Paused | Suspended models |
| `bookmarked` | Bookmarked | Bookmarked models |
| `totalRecordings` | Recordings | Recording entries |

Only `processing`, `paused`, `bookmarked`, and `totalRecordings`
require an additional `listAll` request. Other fields use the `health`
response, which includes the `workload` counters. Unavailable metrics
display a dash rather than an invented zero.

Use CTBRec's Base64 `key` value verbatim. Set `HOMEPAGE_VAR_CTBREC_KEY`
in Homepage's environment. The key grants full remote recorder access:
restrict access to configuration and environment, and use HTTPS on untrusted
networks.
