"use strict";
var listUtils = require('util.list');
var memoryUtils = require('util.memory');
var partUtils = require('util.parts');
var scanner = require('util.scanner');

const CORE_PARTS = [MOVE];
const REPEAT_PARTS = [];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
    var roomMemory = Memory.rooms[memory.target];
    if (!roomMemory) {
        roomMemory = memoryUtils.createRoom();
        Memory.rooms[memory.target] = roomMemory;
    }
    roomMemory.scout = name;
}

module.exports.onDestroy = function(name, memory) {
    var roomMemory = Memory.rooms[memory.target];
    if (roomMemory && roomMemory.scout === name)
        delete roomMemory.scout;
}

module.exports.update = function(creep, memory, actions) {
    var roomMemory = Memory.rooms[memory.target];
    var baseMemory = Memory.bases[memory.base];
    if (!roomMemory.scanned) {
        if (creep.pos.roomName === memory.target)
            scanner.scanRoom(Game.rooms[memory.target]);
        else {
            var pos = creep.pos.findClosestByPath(creep.room.findExitTo(memory.target));
            if (pos) {
                if (actions.moveTo(creep, pos, true))
                    return;
            }
        }
    }
    else if (listUtils.contains(baseMemory.rooms, memory.target)) { //Is it claimed yet?
        var spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, { filter: (x) => {
            return x.structureType === STRUCTURE_SPAWN;
        }});
        if (spawn) {
            actions.recycle(creep, spawn, true);
            return;
        }
    }
}