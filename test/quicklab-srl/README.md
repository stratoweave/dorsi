# Quicklab SRL

This lab contains four core routers. All of the routers run Nokia SR Linux.

The routers form a backbone running IS-IS and iBGP.

## Backbone links

| Router A | Interface | Router B | Interface |
|---|---|---|---|
| ams-core-1 | `ethernet-1/1` | fra-core-1 | `ethernet-1/1` |
| ams-core-1 | `ethernet-1/2` | sto-core-1 | `ethernet-1/1` |
| fra-core-1 | `ethernet-1/2` | sto-core-1 | `ethernet-1/2` |
| fra-core-1 | `ethernet-1/3` | lju-core-1 | `ethernet-1/1` |
| sto-core-1 | `ethernet-1/3` | lju-core-1 | `ethernet-1/2` |
