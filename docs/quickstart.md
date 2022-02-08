Install
-------
./scripts/install-deps.sh
npm install

Run
---
    node dist/flock-start.js

start up the monitor in another window

    npx flock-monitor --subport <beacon subscription port> --subscribe root

send a message to beacon to add a block to root blockchain

    beacon/block 'hello world'

send a message to beacon to add a block to blockchain test

    beacon/block.test 'hello world'

send a message to the js-algebra flock to listen to root blockchain

    js-algebra/subscribe root

send a message to the blockchain to evaiuate a math expression.
Request and response should appear on monitor.

    beacon/block {cmd: 'js-algebra.eval', eval: '2+2'}

