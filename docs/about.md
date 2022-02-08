Columba blockchain is a system for integrating microservices and
blockchain.  The purpose of columba is to allow integration of
enterprise computing, scientific computing, and cryptocurrency.

Columba works with a set of services known as flocks.  Flocks are
podman services running locally on the machine which communicate with
a messaging hub known as beacon.  Beacon allows the flocks to
communicate with other flocks through the blockchain.

The contents of this repository are as follows:

* flock-manager - manages the creation and distribution of flocks
* beacon - messaging hub that manages the central columba blockchain
* flock-cli - simple cli that sends messages to a flock
* flock-monitor - executable that dumps out messages send by a flock

Quickstart
----------
Look at the file [quickstart.md](quickstart.md) to see a demo.

Flock-cli
---------
Flock cli sends messages to and from a flock.  Messages are of the form

    flock-name/command.subcommand arguments

Arguments are of JSON5 form, and are parsed into objects from JSON5
before being sent to the flock.

