const bindEvents = require('./bind-events')
const log = require('debug')('assemble:namespaces')

module.exports = server => ({
  has: room => server.nsps['/' + room] !== undefined,
  create: room => bindEvents(server, server.of(room), room),
  destroy: room =>
    (server.nsps['/' + room].implode(), delete server.nsps[room]),
})
