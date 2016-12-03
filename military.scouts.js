"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var exits = Game.map.describeExits(base.name);
    for (var dir in exits) {
        var roomName = exits[dir];
        var roomMemory = Memory.rooms[roomName];
        if ((!roomMemory || (!roomMemory.scanned && !Memory.rooms[roomName].scout)) && Game.map.isRoomAvailable(roomName)) {
            var memory = {
                military: true, 
                role: 'scout', 
                target: roomName 
            };
            requestUtils.add(creepRequests, 0.90, memory);
            break;
        }
    }

    for (var i = 0; i < baseMemory.rooms.length; i++) {
        var room = Game.rooms[baseMemory.rooms[i]];
        var roomMemory = Memory.rooms[roomName];
        if (room && roomMemory && !roomMemory.reserver) {
            var controller = room.controller;
            if (controller && !controller.my) {
                var reservation = controller.reservation;
                if (!reservation ||
                        (reservation.username === "RogueException" || 
                        reservation.username === "Voltana" || 
                        reservation.username === "Shira") ||
                        reservation.ticksToEnd < 3000) {
                    var memory = {
                        military: true, 
                        role: 'reserver', 
                        target: roomName 
                    };
                    requestUtils.add(creepRequests, 0.92, memory);
                    break;
                }
            }
        }
    }

    for (var flagName in Game.flags) {
        var flag = Game.flags[flagName];
        if (flag.color === COLOR_WHITE) {
            var flagMemory = flag.memory;
            if (!flagMemory.unit) {
                var memory = {
                    military: true, 
                    role: 'messenger', 
                    target: flagName 
                };
                requestUtils.add(creepRequests, 0.88, memory);
            }
        }
    }
}