---
title: WatchYourLAN
description: WatchYourLAN Widget Configuration
---

Learn more about [WatchYourLAN](https://github.com/aceberg/WatchYourLAN).

Allowed fields: `["total", "online", "offline", "unknown", "known"]`.
The default four fields are total, online, offline, and unknown.

This widget reads the unauthenticated `/api/status/` endpoint. WatchYourLAN does not provide built-in authentication, so restrict network access to the service.

```yaml
widget:
  type: wyl
  url: http://ip:8840
  fields:
    - total
    - online
    - offline
    - unknown
```
