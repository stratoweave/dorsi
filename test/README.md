# DORSI Tests

## Labs
This repository contains [Containerlab](https://containerlab.dev/)-based
labs/development environments which you can run:
* **[fabric-3stage](fabric-3stage/README.md)** and **[fabric-5stage](fabric-5stage/README.md)**
  are IP fabric labs of Nokia SR Linux switches and servers (3-stage and 5-stage Clos).
  * `fabric-3stage` needs about 9 GB of memory and has been run. `fabric-5stage` needs
    much more and has not been deployed.
* **[fabric-3stage-mixed](fabric-3stage-mixed/README.md)** is `fabric-3stage` with leaf3
  and spine2 running Arista cEOS. Its image has to be downloaded and imported by hand.
* **[fabric-5stage-mixed](fabric-5stage-mixed/README.md)** is a five-stage fabric of
  SR Linux and cEOS cut down to five switches, which fits in about 8 GB. It has been run.
* **[fabric-5stage-srl](fabric-5stage-srl/README.md)** is the same five-switch fabric all
  on SR Linux, with the EVPN-VXLAN overlay through the super-spine.

The SR Linux image (`ghcr.io/nokia/srlinux`) is public, no account or license is
needed.

### Container image path

You may override the container image path of the DORSI images by setting the
`IMAGE_PATH` environment variable to a prefix pointing to a private registry. If
the images only exist locally on your machine without a registry prefix, set
`export IMAGE_PATH=`.
