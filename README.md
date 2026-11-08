<p align="left">
  <img src="docs/images/DorsiTmpBlue.png" width="400"/>
</p>

The **DORSI** network (formerly SORESPO, the SOmewhat REalistic Service
Provider Orchestration network) is a rather realistic looking Service Provider
network. This repository contains a
network automation system based on [StratoWeave](https://github.com/stratoweave/stratoweave).

## Introduction
While DORSI and StratoWeave are closely related, they are two distinct
projects with very different goals:
* **StratoWeave** is a ***platform*** for the development of robust network
orchestration systems based on model-driven declarative transforms. It does the
heavy lifting so you can focus on building automation that makes sense.
* **DORSI** is a **reference implementation** of a StratoWeave system. You
can use it to learn about network automation (development) or use it as a solid
foundation for your own network automation system design.

<p align="center">
  <img src="docs/images/StratoWeaveDorsiCombined.png" alt="The relationship between the StratoWeave automation platform and the DORSI network service implementation" width="800"/>
</p>

## Getting Started

Head over to our [tutorials](https://www.stratoweave.org/tutorials) to get started with
running the DORSI network and/or making your first changes to the code in
minutes!

The default `stable` branch works with the *stable* Acton release, while
development happens on `main`. See [development](docs/development.md) for how
the two branches relate and how to contribute.

## DORSI Services

Today, DORSI delivers an **IP core network**. The Customer Facing Service
(CFS) model is `netinfra` (see `spec/yang/cfs/netinfra.yang`), which describes
the routers, the backbone links between them and the network-wide settings of
the IP core.

The StratoWeave platform is capable of implementing almost any automation
use-case for any domain. Over time, we expect to deliver more services as part
of DORSI. But we will likewise deliver other reference implementations for
many additional use-cases. With these reference implementations we aim to make
service automation with StratoWeave as simple as possible.

### Service Automation Layering

DORSI implements highly abstracted device and service configuration through
layers of automation. DORSI is implemented using two service layers, the
Customer Facing Service (CFS) and the Resource Facing Service (RFS), on top of
the device layer. StratoWeave does not place any limitations on the number of
layers that can be implemented - as few or many as necessary can be used.

```
                        +-------------------------------+
+-----------------------| RESTCONF Northbound Interface |-----------------------+
|                       +-------------------------------+                       |
|               +-----------------------------------------------+               |
|               |    Customer Facing Service (CFS) - Layer 0    |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |    Resource Facing Service (RFS) - Layer 1    |               |
|               +-----------------------------------------------+               |
|               +-----------------------------------------------+               |
|               |                Device - Layer 2               |               |
|               +-----------------------------------------------+               |
|                       +-------------------------------+                       |
+-----------------------|  NETCONF Southbound Interface |-----------------------+
                        +-------------------------------+
```

### Multi-vendor 
DORSI's service stack is designed to be vendor-neutral. At this time the
following vendor & IP transport options are supported:
* [Juniper cRPD](https://www.juniper.net/documentation/product/us/en/crpd/)
  with IS-IS, iBGP, MPLS and LDP
* [Cisco IOS XRd](https://www.cisco.com/site/us/en/products/networking/sdwan-routers/ios-xrd/index.html)
  with IS-IS, iBGP, MPLS and LDP
* [Nokia SR Linux](https://www.nokia.com/ip-networks/service-router-linux-NOS/)
  with IS-IS and iBGP (no lab environment or automated tests cover SR Linux at the moment)

See our [lab documentation](test/README.md#quicklabs) on how run a
lab/development environment for each of these options.
