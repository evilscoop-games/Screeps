"use strict";
var listUtils = require('util.list');
var mapUtils = require('util.map');
var memoryUtils = require('util.memory');
var requestUtils = require('util.requests');
var scanner = require('util.scanner');
var planner = require('util.planner');
var managers = [
    require('base.storage'),
    require('base.builders'),
    require('base.defense'),
    require('base.harvesters'),
    require('base.miners'),
    require('base.transporters'),
    require('base.upgraders')
]
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
    repairer: require('creep.repairer'),
    scavenger: require('creep.scavenger'),
    upgrader: require('creep.upgrader')
}
var towerManager = require('structure.tower');

module.exports.initMemory = function() {
    //Find spawns and build bases
    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        Memory.structures[spawn.id] = {};
        if (!Memory.bases[spawn.room.name]) {
            var baseMemory = createBase(spawn.room).memory;
            for (var manager in creepManagers) {
                baseMemory.roles[manager] = {
                    parts: {
                        move: 0,
                        work: 0,
                        carry: 0,
                        attack: 0,
                        ranged_attack: 0,
                        tough: 0,
                        heal: 0,
                        claim: 0
                    },
                    creeps: []
                };
            }
        }
    }
}

module.exports.updateGlobal = function(actions) {
    //Check for new construction sites
    for (var id in Game.constructionSites) {
        var site = Game.constructionSites[id];
        var siteMemory = Memory.constructionSites[id];
        if (!siteMemory) {
            if (site.structureType !== STRUCTURE_CONTAINER) {
                var bases = [];
                for (var baseName in Memory.bases) {
                    var baseMemory = Memory.bases[baseName];
                    if (listUtils.contains(baseMemory.rooms, site.room.name)) {
                        if (site.structureType === STRUCTURE_ROAD)
                            listUtils.add(baseMemory.construction.roads, site.id);
                        else if (site.structureType === STRUCTURE_WALL || site.structureType === STRUCTURE_RAMPART)
                            listUtils.add(baseMemory.construction.defenses, site.id);
                        else
                            listUtils.add(baseMemory.construction.structures, site.id);
                        listUtils.add(bases, baseName);
                    }
                }

                siteMemory = {
                    bases: bases,
                    pos: mapUtils.serializePos(site.pos),
                    type: site.structureType
                }
            }
            Memory.constructionSites[id] = siteMemory;
        }
    }

    //Check for completed construction sites
    for (var id in Memory.constructionSites) {
        var site = Game.constructionSites[id];
        if (!site) {
            var siteMemory = Memory.constructionSites[id];
            if (siteMemory.type !== STRUCTURE_CONTAINER) {
                for (var i = 0; i < siteMemory.bases.length; i++) {
                    var baseMemory = Memory.bases[siteMemory.bases[i]];
                    
                    if (siteMemory.type === STRUCTURE_ROAD)
                        listUtils.remove(baseMemory.construction.roads, id);
                    else if (siteMemory.type === STRUCTURE_WALL || siteMemory.type === STRUCTURE_RAMPART)
                        listUtils.remove(baseMemory.construction.defenses, id);
                    else if (siteMemory.type !== STRUCTURE_CONTAINER)
                        listUtils.remove(baseMemory.construction.structures, id);

                    if (siteMemory.type !== STRUCTURE_ROAD &&
                            siteMemory.type !== STRUCTURE_WALL &&
                            siteMemory.type !== STRUCTURE_RAMPART) {
                        var structures = mapUtils.deserializePos(siteMemory.pos).lookFor(LOOK_STRUCTURES);
                        var success = false;
                        for (var i = 0; i < structures.length; i++) {
                            if (structures[i].structureType === siteMemory.type) {
                                listUtils.add(baseMemory.structures[siteMemory.type], structures[i].id);
                                Memory.structures[structures[i].id] = {};
                                success = true;
                                break;
                            }
                        }
                        if (success === false)
                            recheckPlan(baseMemory); //Construction site destroyed or cancelled
                    }
                }
            }

            delete Memory.constructionSites[id];
        }
    }
    
    for (var i = 0; i < managers.length; i++)
        managers[i].updateGlobal(actions);
}
module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;

    //Claim adjacent rooms
    var exits = Game.map.describeExits(base.name);
    for (var dir in exits) {
        var roomName = exits[dir];
        if (!listUtils.contains(baseMemory.rooms, roomName)) {
            var roomMemory = Memory.rooms[roomName];
            var room = Game.rooms[roomName];
            if (room && roomMemory && roomMemory.scanned && !roomMemory.claimed)
                claimRoom(base, room);
        }
    }
    
    //Check for destroyed creeps
    for (var role in baseMemory.roles) {
        var creepNames = baseMemory.roles[role].creeps;
        for (var i = 0; i < creepNames.length; i++) {
            var name = creepNames[i];
            if (Game.creeps[name] === undefined) {
                var creepMemory = Memory.creeps[name];
                var role;
                if (creepMemory) {
                    if (creepMemory.parts) {
                        for (var key in creepMemory.parts)
                            baseMemory.roles[creepMemory.role].parts[key] -= creepMemory.parts[key];
                    }

                    var manager = creepManagers[creepMemory.role];
                    if (manager)
                        creepManagers[creepMemory.role].onDestroy(name, creepMemory);
                    role = creepMemory.role;

                    delete Memory.creeps[name];
                }
                else
                    role = 'unknown';
                listUtils.removeAt(creepNames, i);
                i--;
                console.log(base.name + ": Lost " + role + " (" + creepNames.length  + " left)");
            }
        }
    }
    //Check for destroyed structures
    var lostStructure = false;
    for (var structureType in baseMemory.structures) {
        var structureIds = baseMemory.structures[structureType];
        for (var i = 0; i < structureIds.length; i++) {
            var id = structureIds[i];
            if (Game.structures[id] === undefined) {
                var structureMemory = Memory.structures[id];
                if (structureMemory)
                    delete Memory.structures[id];
                listUtils.removeAt(structureIds, i);
                lostStructure = true;
                i--;
                console.log(base.name + ": Lost " + structureType + " (" + structureIds.length  + " left)");
            }
        }
    }
    if (lostStructure)
        recheckPlan(baseMemory);

    //Declump around spawns        
    for (var i = 0; i < baseMemory.spawns.length; i++) {
        var spawn = Game.spawns[baseMemory.spawns[i]];
        if (spawn) {
            var pos = spawn.pos;
            var targets = spawn.room.lookForAtArea(LOOK_CREEPS, pos.y - 2, pos.x - 2, pos.y + 2, pos.x + 2, true);
            for (var j = 0; j < targets.length; j++) {
                if (!actions.hasAnyAction(targets[j].creep))
                    actions.flee(targets[j].creep, spawn, 3, true);
            }
        }
    }

    for (var i = 0; i < managers.length; i++)
        managers[i].updateBase(base, actions, creepRequests, structureRequests, defenseRequests);

    //Spawn creeps
    baseMemory.construction.requestedCreepPriority = 0.0;

    for (var i = 0; i < baseMemory.spawns.length; i++) {
        var spawn = Game.spawns[baseMemory.spawns[i]];
        if (!spawn.spawning) {
            while (true) {
                var request = requestUtils.pop(creepRequests);
                if (request !== null) {
                    var memory = request.data;
                    var maxEnergy;
                    if (request.priority < 0.90)
                        maxEnergy = spawn.room.energyCapacityAvailable;
                    else
                        maxEnergy = spawn.room.energyAvailable;

                    var manager;
                    if (memory.military)
                        manager = Game.militaryManager.getRoleManager(memory.role);
                    else
                        manager = creepManagers[memory.role];
                    var bodyInfo = manager.getBodyInfo(spawn.room.energyAvailable);

                    if (bodyInfo.cost > spawn.room.energyCapacityAvailable) {
                        //console.log("Could not afford " + memory.role + ": " + bodyInfo.cost + "/" + spawn.room.energyCapacityAvailable);
                        continue;
                    }
                    
                    if (request.priority < 0.70 && spawn.room.energyAvailable !== spawn.room.energyCapacityAvailable)
                        continue; // Excess energy tier

                    /*if (request.upgradeCost > 0)
                        memory.upgradeCost = bodyInfo.upgradeCost;*/

                    memory.base = base.name;
                    
                    var parts = { };
                    for (var i = 0; i < bodyInfo.body.length; i++) {
                        var part = bodyInfo.body[i];
                        if (!parts[part])
                            parts[part] = 1;
                        else
                            parts[part]++;
                    }
                    memory.parts = parts;

                    var name = spawn.createCreep(bodyInfo.body, null, memory);
                    if (_.isString(name)) {
                        if (!memory.military) {
                            for (var key in parts)
                                baseMemory.roles[memory.role].parts[key] += parts[key];
                            var creepNames = baseMemory.roles[memory.role].creeps;
                            listUtils.add(creepNames, name);
                            manager.onCreate(name, memory);
                        }
                        else {
                            var creepNames = Memory.military.roles[memory.role].creeps;
                            listUtils.add(creepNames, name);
                            manager.onCreate(name, memory);
                        }
                        console.log(spawn.room.name + ": Spawning " + memory.role + " (" + request.priority + ", " + creepNames.length  + " total)");
                    }
                    else {
                        if (request.priority > baseMemory.construction.requestedCreepPriority) 
                            baseMemory.construction.requestedCreepPriority = request.priority;
                    }
                }
                break;
            }
        }        
    }

    //Construct structures
    if (baseMemory.construction.structures.length === 0) {
        while (true) {
            var request = requestUtils.pop(structureRequests);
            if (request !== null) {
                var structureName = request.data;
                var queuedStructures = baseMemory.plan.queued[structureName];
                var success = false;
                for (var i = 0; i < queuedStructures.length; i++) {
                    var pos = mapUtils.deserializePos(queuedStructures[i]);                
                    var structures = pos.lookFor(LOOK_STRUCTURES);
                    var alreadyExists = false;

                    for (var i = 0; i < structures.length; i++) {
                        if (structures[i].structureType === structureName) {
                            alreadyExists = true;
                            break;
                        }
                    }

                    if (alreadyExists === false) {
                        var room = Game.rooms[pos.roomName];              
                        if (room && room.createConstructionSite(pos, structureName) === OK) {
                            console.log(spawn.room.name + ": Creating " + structureName + " (" + request.priority + ")");
                            success = true;
                            break;
                        }
                    }

                    listUtils.removeAt(queuedStructures, 0);
                    listUtils.add(baseMemory.plan.built[structureName], queuedStructures[i]);
                }
                if (success)
                    break;
            }
            else
                break;
        }
    }

    //Construct defenses
    if (baseMemory.construction.defenses.length === 0) {
        while (true) {
            var request = requestUtils.pop(defenseRequests);
            if (request !== null) {
                var structureName = request.data;
                var queuedStructures = baseMemory.plan.queued[structureName];
                var success = false;
                if (queuedStructures.length > 0) {
                    var pos = mapUtils.deserializePos(queuedStructures[0]);                
                    var structures = pos.lookFor(LOOK_STRUCTURES);
                    var alreadyExists = false;

                    for (var i = 0; i < structures.length; i++) {
                        if (structures[i].structureType === structureName) {
                            alreadyExists = true;
                            break;
                        }
                    }

                    if (alreadyExists === false) {
                        var room = Game.rooms[pos.roomName];
                        if (room && room.createConstructionSite(pos, structureName) === OK) {
                            console.log(spawn.room.name + ": Creating " + structureName + " (" + request.priority + ")");
                            success = true;
                            break;
                        }
                    }

                    listUtils.removeAt(queuedStructures, 0);
                    listUtils.add(baseMemory.plan.built[structureName], queuedStructures[i]);
                }
                if (success)
                    break;
            }
            else
                break;
        }
    }

    //Construct roads
    if (baseMemory.construction.roads.length === 0) {
        var queuedRoads = baseMemory.plan.queued.road;
        if (queuedRoads.length > 0) {
            var path = queuedRoads[0];
            var isComplete = true;
            for (var i = 0; i < path.length; i++) {
                var pos = mapUtils.deserializePos(path[i]);
                var structures = pos.lookFor(LOOK_STRUCTURES);

                var skip = false;
                if (pos.x !== 0 && pos.y !== 0 && pos.x !== 49 && pos.y !== 49) {
                    for (var j = 0; j < structures.length; j++) {
                        if (structures[j].structureType === STRUCTURE_ROAD ||
                                structures[j].structureType === STRUCTURE_WALL)
                            skip = true;
                    }
                    if (skip === false) {
                        var room = Game.rooms[pos.roomName];
                        if (room && room.createConstructionSite(pos, STRUCTURE_ROAD) === OK)
                            console.log(spawn.room.name + ": Creating road");
                        isComplete = false;
                        break;
                    }
                }
            }
            if (isComplete) {
                listUtils.removeAt(queuedRoads, 0);
                listUtils.add(baseMemory.plan.built.road, path);
            }
        }
    }
    
    //Towers
    var towers = baseMemory.structures[STRUCTURE_TOWER];
    for(var i = 0; i < towers.length; i++)
        towerManager.updateTower(Game.structures[towers[i]], actions);
}

module.exports.updateCreep = function(creep, memory, actions) {
    creepManagers[memory.role].update(creep, memory, actions);
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
    for (var structureType in CONSTRUCTION_COST) {
        if (structureType !== STRUCTURE_RAMPART &&
            structureType !== STRUCTURE_WALL && 
            structureType !== STRUCTURE_ROAD &&
            structureType !== STRUCTURE_CONTAINER)
        baseMemory.structures[structureType] = [];
    }

    var structures = room.find(FIND_MY_STRUCTURES);
    for (var i = 0; i < structures.length; i++) {
        var structure = structures[i];
        var list = baseMemory.structures[structure.structureType];
        if (list)
            listUtils.add(list, structure.id);
        if (structure.structureType === STRUCTURE_SPAWN)
            listUtils.add(baseMemory.spawns, structure.name);
    }

    scanner.scanRoom(room);
    claimRoom(base, room);
    
    return base;
}

function claimRoom(base, room) {
    var baseMemory = base.memory;
    var roomMemory = Memory.rooms[room.name];
    var spawn = Game.spawns[baseMemory.spawns[0]];

    //Add room
    listUtils.add(baseMemory.rooms, room.name);
    
    //Claim sources/minerals
    for (var i = 0; i < roomMemory.sources.length; i++) {
        var id = roomMemory.sources[i];
        var sourceMemory = Memory.sources[id];

        var distance = mapUtils.getPathDistanceTo(spawn.pos, mapUtils.deserializePos(sourceMemory.pos));
        if (!sourceMemory.owner || distance < sourceMemory.distance) {
            if (sourceMemory.owner)
                listUtils.remove(Memory.bases[sourceMemory.owner].sources, id);
            listUtils.add(baseMemory.sources, id);
            sourceMemory.owner = base.name;
            sourceMemory.distance = distance;
        }
    }
    for (var i = 0; i < roomMemory.minerals.length; i++) {
        var id = roomMemory.minerals[i];
        var mineralMemory = Memory.minerals[id];

        var distance = mapUtils.getPathDistanceTo(spawn.pos, mapUtils.deserializePos(mineralMemory.pos));
        if (!mineralMemory.owner || distance < mineralMemory.distance) {
            if (mineralMemory.owner)
                listUtils.remove(Memory.bases[mineralMemory.owner].minerals, id);
            listUtils.add(baseMemory.minerals, id);
            mineralMemory.owner = base.name;
            mineralMemory.distance = distance;
        }
    }

    //Sort by distance
    baseMemory.sources = _.sortBy(baseMemory.sources, x => Memory.sources[x].distance);
    baseMemory.minerals = _.sortBy(baseMemory.minerals, x => Memory.minerals[x].distance);

    //Plan room
    if (room.name === base.name) {
        baseMemory.plan.queued = planner.addCoreRoom(base, room, roomMemory);
        for (var key in baseMemory.plan.queued)
            baseMemory.plan.built[key] = [];
    }
    else {
        var plan = planner.addExtensionRoom(base, room, roomMemory);
        for (var key in plan)
            baseMemory.plan.queued[key] = baseMemory.plan.queued[key].concat(plan[key]);
    }

    console.log(base.name + ": Claimed room " + room.name);
}
function unclaimRoom(base, room) {
    var baseMemory = base.memory;
    var roomMemory = Memory.rooms[room.name];
    var spawn = Game.spawns[baseMemory.spawns[0]];

    //Remove room
    listUtils.remove(baseMemory.rooms, room.name);
    
    //Unclaim sources/minerals
    for (var i = 0; i < roomMemory.sources.length; i++) {
        var id = roomMemory.sources[i];
        var sourceMemory = Memory.sources[id];

        if (sourceMemory.owner === base.name) {
            listUtils.remove(baseMemory.sources, id);
            sourceMemory.owner = null;
            sourceMemory.distance = 0;
        }
    }
    for (var i = 0; i < roomMemory.minerals.length; i++) {
        var id = roomMemory.minerals[i];
        var mineralMemory = Memory.minerals[id];

        if (mineralMemory.owner === base.name) {
            listUtils.remove(baseMemory.minerals, id);
            sourceMemory.owner = null;
            sourceMemory.distance = 0;
        }
    }

    //Unplan room

    console.log(base.name + ": Unclaimed room " + room.name);
}

function recheckPlan(baseMemory) {
    //Reset every structure to queued
    for (var key in baseMemory.plan.built) {
        baseMemory.plan.queued[key] = baseMemory.plan.queued[key].concat(baseMemory.plan.built[key]);
        baseMemory.plan.built[key] = [];
    }
}


module.exports.reclaimRoom = function(baseMemory, room) {
    unclaimRoom(baseMemory, room);
    claimRoom(baseMemory, room);
};
module.exports.recheckPlan = recheckPlan;

