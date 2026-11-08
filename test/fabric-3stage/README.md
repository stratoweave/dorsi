# Fabric 3-stage

Three-stage Clos fabric: three leaves, each connected to both of the two spines.

All switches run Nokia SR Linux. The fabric is described in `ip-fabric.json`
(`ip-fabric.xml` is the same data in XML), which holds one `fabric` with its
switches and the links between them.

## Links

| Lower switch | Port | Upper switch | Port |
|---|---|---|---|
| leaf1 | `ethernet-1/49` | spine1 | `ethernet-1/1` |
| leaf1 | `ethernet-1/50` | spine2 | `ethernet-1/1` |
| leaf2 | `ethernet-1/49` | spine1 | `ethernet-1/2` |
| leaf2 | `ethernet-1/50` | spine2 | `ethernet-1/2` |
| leaf3 | `ethernet-1/49` | spine1 | `ethernet-1/3` |
| leaf3 | `ethernet-1/50` | spine2 | `ethernet-1/3` |

## Servers

| Server | Profile | Leaf | Port | Server port |
|---|---|---|---|---|
| server1 | dual-homed | leaf1 | `ethernet-1/1` | `eth1` |
| server1 | dual-homed | leaf2 | `ethernet-1/1` | `eth2` |
| server2 | dual-homed | leaf2 | `ethernet-1/2` | `eth1` |
| server2 | dual-homed | leaf3 | `ethernet-1/1` | `eth2` |
| server3 | single-homed | leaf3 | `ethernet-1/2` | `eth1` |

## Status

The topology and data match the `fabric_three_stage` and `fabric_five_stage`
transform tests (`src/dorsi/test_fabric.act`), which check the generated SR Linux
configuration. The lab itself has not been deployed yet, and `make start` is the
only part of the shared `quicklab.mk` that applies to it: its configuration
targets send `netinfra.xml`, which this lab does not have.
