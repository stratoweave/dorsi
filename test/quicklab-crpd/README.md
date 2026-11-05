# Quicklab cRPD

This lab contains four core routers. All of the routers run Juniper cRPD.

The routers form a backbone running IS-IS, iBGP, MPLS and LDP.

## Backbone links

| Router A | Interface | Router B | Interface |
|---|---|---|---|
| ams-core-1 | `eth1` | fra-core-1 | `eth1` |
| ams-core-1 | `eth2` | sto-core-1 | `eth1` |
| fra-core-1 | `eth2` | sto-core-1 | `eth2` |
| fra-core-1 | `eth3` | lju-core-1 | `eth1` |
| sto-core-1 | `eth3` | lju-core-1 | `eth2` |
