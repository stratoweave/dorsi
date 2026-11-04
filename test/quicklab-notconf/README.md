# Quicklab NOTCONF

This lab contains four core routers. Two of the routers (ams-core-1, fra-core-1)
are simulated Cisco IOS XRd, the other two (sto-core-1, lju-core-1) are
simulated Juniper cRPD. That is what StratoWeave will think when it connects to
these devices, which are actually NOTCONF devices simulating the northbound
interfaces (YANG models) of those vendors.

NOTCONF has neither a dataplane nor a management plane, so there are no actual
links between the routers in this lab. The backbone links below exist only as
DORSI configuration input.

## Backbone links

| Router A | Interface | Router B | Interface |
|---|---|---|---|
| ams-core-1 | `Gi0/0/0/0` | fra-core-1 | `Gi0/0/0/0` |
| ams-core-1 | `Gi0/0/0/1` | sto-core-1 | `eth1` |
| fra-core-1 | `Gi0/0/0/1` | sto-core-1 | `eth2` |
| fra-core-1 | `Gi0/0/0/2` | lju-core-1 | `eth1` |
| sto-core-1 | `eth3` | lju-core-1 | `eth2` |
