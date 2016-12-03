"use strict";
module.exports.init = function() {    
    //Remove defaults
    delete Memory.creeps;
    delete Memory.flags;
    delete Memory.rooms;
    delete Memory.spawns;

    //Add our defaults
    Memory.version = 1;
    Memory.bases = {};
    Memory.constructionSites = {};
    Memory.creeps = {};
    Memory.debug = {
        run: true,
        enableSay: false,
        logNext: false
    };
    Memory.flags = {};
    Memory.rooms = {};
    Memory.military = {
        roles: {}
    };
    Memory.minerals = {};
    Memory.sources = {};
    Memory.structures = {};

    Game.bases = {};
}

module.exports.createBase = function() {
    return {
        construction: {
            //creeps: [],
            structures: [],
            roads: [],
            defenses: [],
            requestedCreepPriority: 0.0
        },
        rooms: [],
        spawns: [],
        sources: [],
        minerals: [],
        roles: {},
        structures: {},
        plan: {
            queued: {},
            built: {}
        }
    };
}

module.exports.createRoom = function() {
    return {
        scanned: false,
        minerals: [],
        sources: [],
        defenseLevel: 0,
        threatLevel: 0,
        hostiles: []
    };
}

module.exports.createSource = function() {
    return {
        room: null,
        owner: null,
        distance: 0,
        harvesters: [],
        collectors: [],
        pos: null,
        maxHarvesters: 0,
        container: {
            id: null,
            site: null,
            pos: null,
            amount: 0,
            ready: false
        },
    }
}

module.exports.createMineral = function() {
    return {
        room: null,
        owner: null,
        distance: 0,
        harvesters: [],
        collectors: [],
        pos: null,
        maxHarvesters: 0,
        container: {
            id: null,
            site: null,
            pos: null,
            amount: 0,
            ready: false
        },
        type: null
    }
}