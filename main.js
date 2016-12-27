"use strict";
var actions = require('actions');
var debug = require('debug');
var listUtils = require('util.list');
var memoryUtils = require('util.memory');
var militaryManagers = [
    { manager: require('military.creeps'), offset: 0, interval: 1 }, //Checks for destroyed creeps
    { manager: require('military.flags'), offset: 0, interval: 1 }, //Checks for destroyed flags

    { manager: require('military.intel'), offset: 1, interval: 2 }, //Updates power levels in each room
    { manager: require('military.rally'), offset: 1, interval: 2 }, //Processes new rally flags
    
    //Managers that request units (must be the same tick as base.spawns)
    { manager: require('military.claims'), offset: 1, interval: 2 }, //Processes claim flags, requests remote builders
    { manager: require('military.reservations'), offset: 1, interval: 2 }, //Requests reservers
    { manager: require('military.defense'), offset: 1, interval: 2 }, //Requests defenders
    { manager: require('military.squads'), offset: 1, interval: 2 } //Processes attack squads
]
var baseManagers = [
    { manager: require('base.creeps'), offset: 0, interval: 1 }, //Checks for destroyed creeps
    { manager: require('base.storage'), offset: 0, interval: 1 }, //Updates storages/resources needing pickup, and nonfull dropoffs
    
    //Managers that request structures (must be the same tick as base.construction)
    { manager: require('base.structures'), offset: 0, interval: 2 }, //Requests structures
    { manager: require('base.construction'), offset: 0, interval: 2 }, //Checks construction sites, destroyed structures, creates structures

    //Managers that request units (must be the same tick as base.spawns)
    { manager: require('base.harvesters'), offset: 1, interval: 2 }, //Requests harvesters and miners
    { manager: require('base.builders'), offset: 1, interval: 2 }, //Requests builders/repairers and assigns targets
    { manager: require('base.transporters'), offset: 1, interval: 2 }, //Requests collectors/rechargers/scavengers and assigns targets
    { manager: require('base.upgraders'), offset: 1, interval: 2 }, //Requests upgraders/maintainers
    { manager: require('base.territory'), offset: 1, interval: 2 }, //Requests scouts, claims bases/rooms
    { manager: require('base.spawns'), offset: 1, interval: 2 }, //Spawns creeps

    //Must be last:
    { manager: require('base.declump'), offset: 0, interval: 2 }, //Moves creeps away from spawns
]
var unitManagers = {
    builder_remote: require('unit.builder_remote'),
    claimer: require('unit.claimer'),
    healer: require('unit.healer'),
    reserver: require('unit.reserver'),
    scout: require('unit.scout'),
    melee: require('unit.melee'),
    ranged: require('unit.ranged'),
    hybrid: require('unit.hybrid')
}
var creepManagers = {
    builder_defense: require('creep.builder_defense'),
    builder_road: require('creep.builder_road'),
    builder_structure: require('creep.builder_structure'),
    collector: require('creep.collector'),
    harvester: require('creep.harvester'),
    harvester_simple: require('creep.harvester_simple'),
    healer: require('creep.healer'),
    maintainer: require('creep.maintainer'),
    miner: require('creep.miner'),
    recharger: require('creep.recharger'),
    recharger_core: require('creep.recharger_core'),
    repairer: require('creep.repairer'),
    scavenger: require('creep.scavenger'),
    upgrader: require('creep.upgrader')
}
var towerManager = require('structure.tower');

function init() {
    memoryUtils.init();
    
    //Set up military roles
    var militaryMemory = Memory.military;
    for (let manager in unitManagers)
        militaryMemory.roles[manager] = memoryUtils.createRole();

    Memory.init = true;
}

module.exports.loop = function () {
    if (!Memory.init)
        init(); //Init Memory

    Game.debug = debug;
    time = Game.time;
    if (Memory.debug.run === true) {
            
        Game.bases = {};
        var bucketLevel = checkBucket(); //0 = Skip, 1 = Creeps only, 2 = Creeps+Managers

        if (bucketLevel !== 0) {
            var runManagers = bucketLevel >= 2;

            debug.beginLoop();
            updateGlobal(runManagers);            
            for (let name in Memory.bases)
                updateBase(name, runManagers);
            if (bucketLevel >= 1) {
                for(var name in Game.creeps)  
                    updateCreep(Game.creeps[name]);
            }
            debug.endLoop();
        }
    }
}

function updateGlobal(runManagers) {
    try {
        debug.startGlobalSection();

        Game.creepManagers = creepManagers;
        Game.unitManagers = unitManagers;

        //Find spawns and build bases
        for (let spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];
            if (!Memory.bases[spawn.room.name]) {
                createBase(spawn.room);
                Memory.structures[spawn.id] = {};
            }
        }

        if (runManagers) {
            for (let i = 0; i < militaryManagers.length; i++) {
                var manager = militaryManagers[i];
                if (hasElapsed(manager.offset, manager.interval))
                    manager.manager.updateGlobal(actions);
            }
            for (let i = 0; i < baseManagers.length; i++) {
                var manager = baseManagers[i];
                if (hasElapsed(manager.offset, manager.interval))
                    manager.manager.updateGlobal(actions);
            }
        }

        debug.endSection();
    } catch (error) {
        console.log("[!] Global Error: " + error.stack);
    }
}

function updateBase(name, runManagers) {
    var base = {
        name: name,
        memory: Memory.bases[name],
        dropoffs: [],
        pickups: []
    };

    try
    {
        Game.bases[name] = base;

        if (!Game.rooms[name]) {
            destroyBase(base);
            return;
        }

        var creepRequests = [];
        var structureRequests = [];
        var defenseRequests = [];

        if (runManagers) {
            for (let i = 0; i < militaryManagers.length; i++) {
                var manager = militaryManagers[i];
                debug.startBaseSection(base);
                if (hasElapsed(manager.offset, manager.interval))
                    manager.manager.updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
                debug.endSection();
            }
            for (let i = 0; i < baseManagers.length; i++) {
                var manager = baseManagers[i];
                debug.startBaseSection(base);
                if (hasElapsed(manager.offset, manager.interval))
                    manager.manager.updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
                debug.endSection();
            }
        }

        //Update structures
        var towers = base.memory.structures[STRUCTURE_TOWER];
        for(var i = 0; i < towers.length; i++)
            towerManager.updateTower(Game.structures[towers[i]], actions);

    } catch (error) {
        if (base.memory && !base.memory.error)
            base.memory.error = error.stack;
        console.log("[!] Base Error (" + name + "): " + error.stack);
    }
}

function updateCreep(creep) {
    try {
        if (creep.spawning)
            return;

        debug.startCreepSection(creep);

        /*if (creep.ticksToLive < 150 && !actions.hasAction(creep, 'recycle') && !actions.hasAction(creep, 'renew') && !creep.memory.military) {
            var base = Memory.bases[creep.memory.base];
            if (base) {
                var spawn = Game.spawns[base.spawns[0]];
                if (spawn) {
                    actions.renew(creep, spawn, true);
                    return;
                }
            }
        }*/

        if (!actions.hasAnyAction(creep)) {
            if (creep.pos.x === 0 || creep.pos.y === 0 || creep.pos.x === 49 || creep.pos.y === 49)
                actions.flee(creep, creep, 1);
        }

        if (actions.continueAction(creep) !== true) {
            var memory = creep.memory;
            if (memory.military)
                unitManagers[memory.role].update(creep, memory, actions);  
            else
                creepManagers[memory.role].update(creep, memory, actions);
        }

        debug.endSection();
    } catch (error) {
        console.log("[!] Creep Error (" + creep.name + "): " + error.stack);
    }
}

function createBase(room) {
    var baseMemory = memoryUtils.createBase();
    var base = {
        name: room.name,
        memory: baseMemory
    };
    Memory.bases[room.name] = baseMemory;
    Game.bases[room.name] = base;

    baseMemory.structures[STRUCTURE_CONTROLLER] = [];
    for (let structureType in CONSTRUCTION_COST) {
        if (structureType !== STRUCTURE_RAMPART &&
            structureType !== STRUCTURE_WALL && 
            structureType !== STRUCTURE_ROAD &&
            structureType !== STRUCTURE_CONTAINER)
        baseMemory.structures[structureType] = [];
    }

    var structures = room.find(FIND_MY_STRUCTURES);
    for (let i = 0; i < structures.length; i++) {
        var structure = structures[i];
        var list = baseMemory.structures[structure.structureType];
        if (list)
            listUtils.add(list, structure.id);
        if (structure.structureType === STRUCTURE_SPAWN)
            listUtils.add(baseMemory.spawns, structure.name);
    }
    
    for (let manager in creepManagers)
        baseMemory.roles[manager] = memoryUtils.createRole()

    console.log(base.name + ': Created');
}

function destroyBase(base) {
    delete Memory.bases[base.name];
    delete Game.bases[base.name];
    
    console.log(base.name + ': Destroyed');
}

var skipLoops = 0;
function checkBucket() {    
    var bucket = Game.cpu.bucket;

    //Skip partial/full frames if we're having troubles
    if (bucket < 6000) {
        console.log("CPU Bucket is low (" + bucket + "), skipping all ticks");
        skipLoops = 0;
        return 0;                     
    }
    else if ((bucket < 7000 && skipLoops < 1)) {
        console.log("CPU Bucket is low (" + bucket + "), skipping all ticks");
        skipLoops++;
        return 0;
    }
    else if (bucket < 8000) {
        console.log("CPU Bucket is low (" + bucket + "), skipping global/base tick");
        skipLoops = 0;
        return 1;
    }
    else if (bucket < 9000 && skipLoops < 1) {
        console.log("CPU Bucket is low (" + bucket + "), skipping global/base tick");
        skipLoops++;
        return 1;
    }
    else {
        skipLoops = 0;
        return 2;
    }
}

var time = 0;
function hasElapsed(offset, interval) {
    return interval === 1 || (time + offset) % interval === 0;
}