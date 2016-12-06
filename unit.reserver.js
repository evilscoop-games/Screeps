"use strict";
var listUtils = require('util.list');
var memoryUtils = require('util.memory');
var partUtils = require('util.parts');

const CORE_PARTS = [MOVE,MOVE,CLAIM,CLAIM];
const REPEAT_PARTS = [MOVE,CLAIM];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
    var roomMemory = Memory.rooms[memory.target];
    roomMemory.reserver = name;
}

module.exports.onDestroy = function(name, memory) {
    var roomMemory = Memory.rooms[memory.target];
    if (roomMemory && roomMemory.reserver === name)
        delete roomMemory.reserver;
}

module.exports.update = function(creep, memory, actions) {
    if (creep.pos.roomName === memory.target)
        actions.reserve(creep, Game.rooms[memory.target].controller, true);
    else {
        var pos = creep.pos.findClosestByPath(creep.room.findExitTo(memory.target));
        if (pos) {
            if (actions.moveTo(creep, pos, true))
                return;
        }
    }
}