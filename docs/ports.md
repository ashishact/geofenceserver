PORT BINDINGS
=============

3000 - 4000  HTTP (Internal)
4000 - 5000  TCP  (External)
5000 - 6000  UDP  (External)
6000 - 7000  MQTT (External)
7000 - 8000  TCP  (IPV6)


When not specified the default is always 3000/4000/5000
e.g. => When UDP port is set to 5002 it binds to 5002
        When UDP port is set to null it binds to 5000