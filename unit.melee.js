"use strict";
var listUtils = require('util.list');
var mapUtils = require('util.memory');
var partUtils = require('util.parts');

const CORE_PARTS = [TOUGH,TOUGH,ATTACK,MOVE,MOVE,MOVE];
const REPEAT_PARTS = [];

module.exports.getBodyInfo = function(energy) {
    return partUtils.get(CORE_PARTS, REPEAT_PARTS, energy);
}

module.exports.onCreate = function(name, memory) {
}

module.exports.onDestroy = function(name, memory) {
}

module.exports.update = function(creep, memory, actions) {
    if (memory.room) {
        var pos = creep.pos.findClosestByPath(creep.room.findExitTo(memory.room));
        if (pos) {
            actions.moveTo(creep, pos, true);
            return;
        }
    }
    var roomMemory = Memory.rooms[memory.room];
    if (roomMemory) {
        var hostile = mapUtils.findClosestCreepByPath(creep.pos, roomMemory.hostiles);
        if (hostile)
            actions.attack(creep, hostile, true);
    }
}