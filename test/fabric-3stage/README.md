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
configuration. The lab has been deployed: all eBGP sessions come up, ECMP and
loopback reachability work. The configuration targets of the shared `quicklab.mk`
(`copy`, `run-and-configure`) send `ip-fabric.xml`, set by `CONFIG`.

## Running it

Without a lab, with mocked switches (no containers needed). Add
`<mock>true</mock>` to every switch of `ip-fabric.xml` in a copy and run:

```sh
out/bin/dorsi --http.port 8089 ip-fabric-mock.xml
```

The Web UI is then on http://localhost:8089 and RESTCONF under `/restconf`.

In the lab, after `WEBUI_PORT=3100 CI=true make start` (pick a free port) and
once the switches have booted:

```sh
make -C ../.. build-linux-aarch64   # or build-linux-x86_64
docker cp ../../out/bin/dorsi dorsi-fabric-3stage-sweave:/dorsi
docker cp ip-fabric.xml dorsi-fabric-3stage-sweave:/ip-fabric.xml
docker exec -d dorsi-fabric-3stage-sweave sh -c '/dorsi ip-fabric.xml > /dorsi.log 2>&1'
```

Five SR Linux nodes need about 9 GB of memory. With less, nodes lose their
dataplane (`xdp_lc_1 has failed`) and cannot be configured.
