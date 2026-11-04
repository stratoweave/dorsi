# Quicklab

This lab contains four core routers. Two of them (ams-core-1, fra-core-1) are
Cisco IOS XRd, the other two (sto-core-1, lju-core-1) are Juniper cRPD.

The routers form a backbone running IS-IS, iBGP, MPLS and LDP.

## Backbone links

| Router A | Interface | Router B | Interface |
|---|---|---|---|
| ams-core-1 | `Gi0/0/0/0` | fra-core-1 | `Gi0/0/0/0` |
| ams-core-1 | `Gi0/0/0/1` | sto-core-1 | `eth1` |
| fra-core-1 | `Gi0/0/0/1` | sto-core-1 | `eth2` |
| fra-core-1 | `Gi0/0/0/2` | lju-core-1 | `eth1` |
| sto-core-1 | `eth3` | lju-core-1 | `eth2` |
