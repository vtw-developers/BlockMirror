var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as ast from './python-parser.js';
import { ControlFlowGraph } from './control-flow.js';
import { Set } from './set.js';
import { DefaultSpecs } from './specs/index.js';
import { SymbolTable } from './symbol-table.js';
var DefUse = /** @class */ (function () {
    function DefUse(DEFINITION, UPDATE, USE) {
        if (DEFINITION === void 0) { DEFINITION = new RefSet(); }
        if (UPDATE === void 0) { UPDATE = new RefSet(); }
        if (USE === void 0) { USE = new RefSet(); }
        this.DEFINITION = DEFINITION;
        this.UPDATE = UPDATE;
        this.USE = USE;
    }
    Object.defineProperty(DefUse.prototype, "defs", {
        get: function () { return this.DEFINITION.union(this.UPDATE); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DefUse.prototype, "uses", {
        get: function () { return this.UPDATE.union(this.USE); },
        enumerable: true,
        configurable: true
    });
    DefUse.prototype.union = function (that) {
        return new DefUse(this.DEFINITION.union(that.DEFINITION), this.UPDATE.union(that.UPDATE), this.USE.union(that.USE));
    };
    DefUse.prototype.update = function (newRefs) {
        var GEN_RULES = {
            USE: [ReferenceType.UPDATE, ReferenceType.DEFINITION],
            UPDATE: [ReferenceType.DEFINITION],
            DEFINITION: []
        };
        var KILL_RULES = {
            // Which types of references "kill" which other types of references?
            // In general, the rule of thumb here is, if x depends on y, x kills y, because anything that
            // depends on x will now depend on y transitively.
            // If x overwrites y, x also kills y.
            // The one case where a variable doesn't kill a previous variable is the global configuration, because
            // it neither depends on initializations or updates, nor clobbers them.
            DEFINITION: [ReferenceType.DEFINITION, ReferenceType.UPDATE],
            UPDATE: [ReferenceType.DEFINITION, ReferenceType.UPDATE],
            USE: []
        };
        var _loop_1 = function (level) {
            var genSet = new RefSet();
            for (var _i = 0, _a = GEN_RULES[level]; _i < _a.length; _i++) {
                var genLevel = _a[_i];
                genSet = genSet.union(newRefs[genLevel]);
            }
            var killSet = this_1[level].filter(function (def) {
                return genSet.items.some(function (gen) {
                    return gen.name == def.name && KILL_RULES[gen.level].indexOf(def.level) != -1;
                });
            });
            this_1[level] = this_1[level].minus(killSet).union(genSet);
        };
        var this_1 = this;
        for (var _i = 0, _a = Object.keys(ReferenceType); _i < _a.length; _i++) {
            var level = _a[_i];
            _loop_1(level);
        }
    };
    DefUse.prototype.equals = function (that) {
        return this.DEFINITION.equals(that.DEFINITION) &&
            this.UPDATE.equals(that.UPDATE) &&
            this.USE.equals(that.USE);
    };
    DefUse.prototype.createFlowsFrom = function (fromSet) {
        var toSet = this;
        var refsDefined = new RefSet();
        var newFlows = new Set(getDataflowId);
        for (var _i = 0, _a = Object.keys(ReferenceType); _i < _a.length; _i++) {
            var level = _a[_i];
            for (var _b = 0, _c = toSet[level].items; _b < _c.length; _b++) {
                var to = _c[_b];
                for (var _d = 0, _e = fromSet[level].items; _d < _e.length; _d++) {
                    var from = _e[_d];
                    if (from.name == to.name) {
                        refsDefined.add(to);
                        newFlows.add({ fromNode: from.node, toNode: to.node, fromRef: from, toRef: to });
                    }
                }
            }
        }
        return [newFlows, refsDefined];
    };
    return DefUse;
}());
/**
 * Use a shared dataflow analyzer object for all dataflow analysis / querying for defs and uses.
 * It caches defs and uses for each statement, which can save time.
 * For caching to work, statements must be annotated with a cell's ID and execution count.
 */
var DataflowAnalyzer = /** @class */ (function () {
    function DataflowAnalyzer(moduleMap) {
        this._defUsesCache = {};
        this._symbolTable = new SymbolTable(moduleMap || DefaultSpecs);
    }
    DataflowAnalyzer.prototype.getDefUseForStatement = function (statement, defsForMethodResolution) {
        var cacheKey = ast.locationString(statement.location);
        var cached = this._defUsesCache[cacheKey];
        if (cached) {
            return cached;
        }
        var defSet = this.getDefs(statement, defsForMethodResolution);
        var useSet = this.getUses(statement);
        var result = new DefUse(defSet.filter(function (r) { return r.level === ReferenceType.DEFINITION; }), defSet.filter(function (r) { return r.level === ReferenceType.UPDATE; }), useSet);
        this._defUsesCache[cacheKey] = result;
        return result;
    };
    DataflowAnalyzer.prototype.analyze = function (cfg, refSet) {
        var workQueue = cfg.blocks.reverse();
        var undefinedRefs = new RefSet();
        var dataflows = new Set(getDataflowId);
        var defUsePerBlock = new Map(workQueue.map(function (block) { return [block.id, new DefUse()]; }));
        if (refSet) {
            defUsePerBlock.get(cfg.blocks[0].id).update(new DefUse(refSet));
        }
        while (workQueue.length) {
            var block = workQueue.pop();
            var initialBlockDefUse = defUsePerBlock.get(block.id);
            var blockDefUse = cfg.getPredecessors(block)
                .reduce(function (defuse, predBlock) { return defuse.union(defUsePerBlock.get(predBlock.id)); }, initialBlockDefUse);
            for (var _i = 0, _a = block.statements; _i < _a.length; _i++) {
                var statement = _a[_i];
                var statementDefUse = this.getDefUseForStatement(statement, blockDefUse.defs);
                var _b = statementDefUse.createFlowsFrom(blockDefUse), newFlows = _b[0], definedRefs = _b[1];
                dataflows = dataflows.union(newFlows);
                undefinedRefs = undefinedRefs.union(statementDefUse.uses).minus(definedRefs);
                blockDefUse.update(statementDefUse);
            }
            if (!initialBlockDefUse.equals(blockDefUse)) {
                defUsePerBlock.set(block.id, blockDefUse);
                // We've updated this block's info, so schedule its successor blocks.
                for (var _c = 0, _d = cfg.getSuccessors(block); _c < _d.length; _c++) {
                    var succ = _d[_c];
                    if (workQueue.indexOf(succ) < 0) {
                        workQueue.push(succ);
                    }
                }
            }
        }
        cfg.visitControlDependencies(function (controlStmt, stmt) {
            return dataflows.add({ fromNode: controlStmt, toNode: stmt });
        });
        return { dataflows: dataflows, undefinedRefs: undefinedRefs };
    };
    DataflowAnalyzer.prototype.getDefs = function (statement, defsForMethodResolution) {
        if (!statement)
            return new RefSet();
        var defs = runAnalysis(ApiCallAnalysis, defsForMethodResolution, statement, this._symbolTable)
            .union(runAnalysis(DefAnnotationAnalysis, defsForMethodResolution, statement, this._symbolTable));
        switch (statement.type) {
            case ast.IMPORT:
                defs = defs.union(this.getImportDefs(statement));
                break;
            case ast.FROM:
                defs = defs.union(this.getImportFromDefs(statement));
                break;
            case ast.DEF:
                defs = defs.union(this.getFuncDefs(statement, defsForMethodResolution));
                break;
            case ast.CLASS:
                defs = defs.union(this.getClassDefs(statement));
                break;
            case ast.ASSIGN:
                defs = defs.union(this.getAssignDefs(statement));
                break;
        }
        return defs;
    };
    DataflowAnalyzer.prototype.getClassDefs = function (classDecl) {
        return new RefSet({
            type: SymbolType.CLASS,
            level: ReferenceType.DEFINITION,
            name: classDecl.name,
            location: classDecl.location,
            node: classDecl,
        });
    };
    DataflowAnalyzer.prototype.getFuncDefs = function (funcDecl, defsForMethodResolution) {
        runAnalysis(ParameterSideEffectAnalysis, defsForMethodResolution, funcDecl, this._symbolTable);
        return new RefSet({
            type: SymbolType.FUNCTION,
            level: ReferenceType.DEFINITION,
            name: funcDecl.name,
            location: funcDecl.location,
            node: funcDecl,
        });
    };
    DataflowAnalyzer.prototype.getAssignDefs = function (assign) {
        var targetsDefListener = new TargetsDefListener(assign, this._symbolTable);
        return targetsDefListener.defs;
    };
    DataflowAnalyzer.prototype.getImportFromDefs = function (from) {
        this._symbolTable.importModuleDefinitions(from.base, from.imports);
        return new (RefSet.bind.apply(RefSet, [void 0].concat(from.imports.map(function (i) {
            return {
                type: SymbolType.IMPORT,
                level: ReferenceType.DEFINITION,
                name: i.name || i.path,
                location: i.location,
                node: from,
            };
        }))))();
    };
    DataflowAnalyzer.prototype.getImportDefs = function (imprt) {
        var _this = this;
        imprt.names.forEach(function (imp) {
            var spec = _this._symbolTable.importModule(imp.path, imp.name);
        });
        return new (RefSet.bind.apply(RefSet, [void 0].concat(imprt.names.map(function (nameNode) {
            return {
                type: SymbolType.IMPORT,
                level: ReferenceType.DEFINITION,
                name: nameNode.name || nameNode.path,
                location: nameNode.location,
                node: imprt,
            };
        }))))();
    };
    DataflowAnalyzer.prototype.getUses = function (statement) {
        switch (statement.type) {
            case ast.ASSIGN:
                return this.getAssignUses(statement);
            case ast.DEF:
                return this.getFuncDeclUses(statement);
            case ast.CLASS:
                return this.getClassDeclUses(statement);
            default: {
                return this.getNameUses(statement);
            }
        }
    };
    DataflowAnalyzer.prototype.getNameUses = function (statement) {
        var usedNames = gatherNames(statement);
        return new (RefSet.bind.apply(RefSet, [void 0].concat(usedNames.items.map(function (_a) {
            var name = _a[0], node = _a[1];
            return {
                type: SymbolType.VARIABLE,
                level: ReferenceType.USE,
                name: name,
                location: node.location,
                node: statement,
            };
        }))))();
    };
    DataflowAnalyzer.prototype.getClassDeclUses = function (classDecl) {
        var _this = this;
        return classDecl.code.reduce(function (uses, classStatement) {
            return uses.union(_this.getUses(classStatement));
        }, new RefSet());
    };
    DataflowAnalyzer.prototype.getFuncDeclUses = function (def) {
        var defCfg = new ControlFlowGraph(def);
        var undefinedRefs = this.analyze(defCfg, getParameterRefs(def)).undefinedRefs;
        return undefinedRefs.filter(function (r) { return r.level == ReferenceType.USE; });
    };
    DataflowAnalyzer.prototype.getAssignUses = function (assign) {
        // XXX: Is this supposed to union with funcArgs?
        var targetNames = gatherNames(assign.targets);
        var targets = new (RefSet.bind.apply(RefSet, [void 0].concat(targetNames.items.map(function (_a) {
            var name = _a[0], node = _a[1];
            return {
                type: SymbolType.VARIABLE,
                level: ReferenceType.USE,
                name: name,
                location: node.location,
                node: assign,
            };
        }))))();
        var sourceNames = gatherNames(assign.sources);
        var sources = new (RefSet.bind.apply(RefSet, [void 0].concat(sourceNames.items.map(function (_a) {
            var name = _a[0], node = _a[1];
            return {
                type: SymbolType.VARIABLE,
                level: ReferenceType.USE,
                name: name,
                location: node.location,
                node: assign,
            };
        }))))();
        return sources.union(assign.op ? targets : new RefSet());
    };
    return DataflowAnalyzer;
}());
export { DataflowAnalyzer };
export var ReferenceType;
(function (ReferenceType) {
    ReferenceType["DEFINITION"] = "DEFINITION";
    ReferenceType["UPDATE"] = "UPDATE";
    ReferenceType["USE"] = "USE";
})(ReferenceType || (ReferenceType = {}));
export var SymbolType;
(function (SymbolType) {
    SymbolType[SymbolType["VARIABLE"] = 0] = "VARIABLE";
    SymbolType[SymbolType["CLASS"] = 1] = "CLASS";
    SymbolType[SymbolType["FUNCTION"] = 2] = "FUNCTION";
    SymbolType[SymbolType["IMPORT"] = 3] = "IMPORT";
    SymbolType[SymbolType["MUTATION"] = 4] = "MUTATION";
    SymbolType[SymbolType["MAGIC"] = 5] = "MAGIC";
})(SymbolType || (SymbolType = {}));
var RefSet = /** @class */ (function (_super) {
    __extends(RefSet, _super);
    function RefSet() {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        return _super.apply(this, [function (r) { return r.name + r.level + ast.locationString(r.location); }].concat(items)) || this;
    }
    return RefSet;
}(Set));
export { RefSet };
export function sameLocation(loc1, loc2) {
    return (loc1.first_column === loc2.first_column &&
        loc1.first_line === loc2.first_line &&
        loc1.last_column === loc2.last_column &&
        loc1.last_line === loc2.last_line);
}
function getNameSetId(_a) {
    var name = _a[0], node = _a[1];
    if (!node.location)
        console.log('***', node);
    return name + "@" + ast.locationString(node.location);
}
var NameSet = /** @class */ (function (_super) {
    __extends(NameSet, _super);
    function NameSet() {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        return _super.apply(this, [getNameSetId].concat(items)) || this;
    }
    return NameSet;
}(Set));
function gatherNames(node) {
    var _a;
    if (Array.isArray(node)) {
        return (_a = new NameSet()).union.apply(_a, node.map(gatherNames));
    }
    else {
        return new (NameSet.bind.apply(NameSet, [void 0].concat(ast
            .walk(node)
            .filter(function (e) { return e.type == ast.NAME; })
            .map(function (e) { return [e.id, e]; }))))();
    }
}
var AnalysisWalker = /** @class */ (function () {
    function AnalysisWalker(_statement, symbolTable) {
        this._statement = _statement;
        this.symbolTable = symbolTable;
        this.defs = new RefSet();
    }
    return AnalysisWalker;
}());
function runAnalysis(Analysis, defsForMethodResolution, statement, symbolTable) {
    var walker = new Analysis(statement, symbolTable, defsForMethodResolution);
    ast.walk(statement, walker);
    return walker.defs;
}
/**
 * Tree walk listener for collecting manual def annotations.
 */
var DefAnnotationAnalysis = /** @class */ (function (_super) {
    __extends(DefAnnotationAnalysis, _super);
    function DefAnnotationAnalysis(statement, symbolTable) {
        return _super.call(this, statement, symbolTable) || this;
    }
    DefAnnotationAnalysis.prototype.onEnterNode = function (node) {
        if (node.type == ast.LITERAL) {
            var literal = node;
            // If this is a string, try to parse a def annotation from it
            if (typeof literal.value == 'string' || literal.value instanceof String) {
                var string = literal.value;
                var jsonMatch = string.match(/"defs: (.*)"/);
                if (jsonMatch && jsonMatch.length >= 2) {
                    var jsonString = jsonMatch[1];
                    var jsonStringUnescaped = jsonString.replace(/\\"/g, '"');
                    try {
                        var defSpecs = JSON.parse(jsonStringUnescaped);
                        for (var _i = 0, defSpecs_1 = defSpecs; _i < defSpecs_1.length; _i++) {
                            var defSpec = defSpecs_1[_i];
                            this.defs.add({
                                type: SymbolType.MAGIC,
                                level: ReferenceType.DEFINITION,
                                name: defSpec.name,
                                location: {
                                    first_line: defSpec.pos[0][0] + node.location.first_line,
                                    first_column: defSpec.pos[0][1],
                                    last_line: defSpec.pos[1][0] + node.location.first_line,
                                    last_column: defSpec.pos[1][1],
                                },
                                node: this._statement,
                            });
                        }
                    }
                    catch (e) { }
                }
            }
        }
    };
    return DefAnnotationAnalysis;
}(AnalysisWalker));
/**
 * Tree walk listener for collecting names used in function call.
 */
var ApiCallAnalysis = /** @class */ (function (_super) {
    __extends(ApiCallAnalysis, _super);
    function ApiCallAnalysis(statement, symbolTable, variableDefs) {
        var _this = _super.call(this, statement, symbolTable) || this;
        _this.variableDefs = variableDefs;
        return _this;
    }
    ApiCallAnalysis.prototype.onEnterNode = function (node, ancestors) {
        var _this = this;
        if (node.type !== ast.CALL) {
            return;
        }
        var funcSpec;
        var func = node.func;
        if (func.type === ast.DOT && func.value.type === ast.NAME) {
            // It's a method call or module call.
            var receiver_1 = func.value;
            var moduleSpec = this.symbolTable.modules[receiver_1.id];
            if (moduleSpec) {
                // It's a module call.
                funcSpec = moduleSpec.functions.find(function (f) { return f.name === func.name; });
            }
            else {
                // It's a method call.
                var ref = this.variableDefs.items.find(function (r) { return r.name === receiver_1.id; });
                if (ref) {
                    // The lefthand side of the dot is a variable we're tracking, so it's a method call.
                    var receiverType = ref.inferredType;
                    if (receiverType) {
                        var funcName_1 = func.name;
                        funcSpec = receiverType.methods.find(function (m) { return m.name === funcName_1; });
                    }
                }
            }
        }
        else if (func.type === ast.NAME) {
            // It's a function call.
            funcSpec = this.symbolTable.lookupFunction(func.id);
        }
        if (funcSpec && funcSpec.updates) {
            funcSpec.updates.forEach(function (paramName) {
                var position = typeof paramName === 'string' ? parseInt(paramName) : paramName;
                if (isNaN(position)) {
                    return;
                } // TODO: think about mutation of global variables
                var actualArgName;
                if (0 < position && position - 1 < node.args.length) {
                    var arg = node.args[position - 1].actual;
                    if (arg.type === ast.NAME) {
                        actualArgName = arg.id;
                    }
                }
                else if (position === 0 && node.func.type === ast.DOT && node.func.value.type === ast.NAME) {
                    actualArgName = node.func.value.id;
                }
                if (actualArgName) {
                    _this.defs.add({
                        type: SymbolType.MUTATION,
                        level: ReferenceType.UPDATE,
                        name: actualArgName,
                        location: node.location,
                        node: _this._statement,
                    });
                }
            });
        }
        else {
            // Be conservative. If we don't know what the call does, assume that it mutates its arguments.
            node.args.forEach(function (arg) {
                if (arg.actual.type === ast.NAME) {
                    var name_1 = arg.actual.id;
                    _this.defs.add({
                        type: SymbolType.MUTATION,
                        level: ReferenceType.UPDATE,
                        name: name_1,
                        location: node.location,
                        node: _this._statement,
                    });
                }
            });
            if (node.func.type === ast.DOT && node.func.value.type === ast.NAME) {
                var name_2 = node.func.value.id;
                this.defs.add({
                    type: SymbolType.MUTATION,
                    level: ReferenceType.UPDATE,
                    name: name_2,
                    location: node.location,
                    node: this._statement,
                });
            }
        }
    };
    return ApiCallAnalysis;
}(AnalysisWalker));
/**
 * Tree walk listener for collecting definitions in the target of an assignment.
 */
var TargetsDefListener = /** @class */ (function (_super) {
    __extends(TargetsDefListener, _super);
    function TargetsDefListener(assign, symbolTable) {
        var _this = _super.call(this, assign, symbolTable) || this;
        _this.isAugAssign = !!assign.op;
        if (assign.targets) {
            for (var _i = 0, _a = assign.targets; _i < _a.length; _i++) {
                var target = _a[_i];
                ast.walk(target, _this);
            }
        }
        assign.sources.forEach(function (source, i) {
            if (source.type === ast.CALL) {
                var spec = symbolTable.lookupNode(source.func);
                var target_1 = assign.targets[i];
                if (spec && target_1 && target_1.type === ast.NAME) {
                    var def = _this.defs.items.find(function (d) { return d.name === target_1.id; });
                    if (def) {
                        def.inferredType = spec.returnsType;
                    }
                }
            }
        });
        return _this;
    }
    TargetsDefListener.prototype.onEnterNode = function (target, ancestors) {
        if (target.type == ast.NAME) {
            if (ancestors.length > 1) {
                var parent_1 = ancestors[0];
                if (parent_1.type === ast.INDEX && parent_1.args.some(function (a) { return a === target; })) {
                    return; // target not defined here. For example, i is not defined in A[i]
                }
            }
            var isUpdate = this.isAugAssign || ancestors.some(function (a) { return a.type == ast.DOT || a.type == ast.INDEX; });
            this.defs.add({
                type: SymbolType.VARIABLE,
                level: isUpdate ? ReferenceType.UPDATE : ReferenceType.DEFINITION,
                location: target.location,
                name: target.id,
                node: this._statement,
            });
        }
    };
    return TargetsDefListener;
}(AnalysisWalker));
var ParameterSideEffectAnalysis = /** @class */ (function (_super) {
    __extends(ParameterSideEffectAnalysis, _super);
    function ParameterSideEffectAnalysis(def, symbolTable) {
        var _this = _super.call(this, def, symbolTable) || this;
        _this.def = def;
        var cfg = new ControlFlowGraph(def);
        _this.flows = new DataflowAnalyzer().analyze(cfg, getParameterRefs(def)).dataflows;
        _this.flows = _this.getTransitiveClosure(_this.flows);
        _this.symbolTable.functions[def.name] = _this.spec = { name: def.name, updates: [] };
        return _this;
    }
    ParameterSideEffectAnalysis.prototype.getTransitiveClosure = function (flows) {
        var nodes = flows.map(getNodeId, function (df) { return df.fromNode; }).union(flows.map(getNodeId, function (df) { return df.toNode; }));
        var result = new (Set.bind.apply(Set, [void 0, getDataflowId].concat(flows.items)))();
        nodes.items.forEach(function (from) {
            return nodes.items.forEach(function (to) {
                return nodes.items.forEach(function (middle) {
                    if (flows.has({ fromNode: from, toNode: middle }) &&
                        flows.has({ fromNode: middle, toNode: to })) {
                        result.add({ fromNode: from, toNode: to });
                    }
                });
            });
        });
        return result;
    };
    ParameterSideEffectAnalysis.prototype.checkParameterFlow = function (sideEffect) {
        var _this = this;
        this.def.params.forEach(function (parm, i) {
            // For a method, the first parameter is self, which we assign 0. The other parameters are numbered from 1.
            // For a function def, the parameters are numbered from 1.
            var parmNum = _this.isMethod ? i : i + 1;
            if (_this.flows.has({ fromNode: parm, toNode: sideEffect }) && _this.spec.updates.indexOf(parmNum) < 0) {
                _this.spec.updates.push(parmNum);
            }
        });
    };
    ParameterSideEffectAnalysis.prototype.onEnterNode = function (statement, ancestors) {
        var _this = this;
        switch (statement.type) {
            case ast.ASSIGN:
                for (var _i = 0, _a = statement.targets; _i < _a.length; _i++) {
                    var target = _a[_i];
                    if (target.type === ast.DOT) {
                        this.checkParameterFlow(statement);
                    }
                    else if (target.type === ast.INDEX) {
                        this.checkParameterFlow(statement);
                    }
                }
                break;
            case ast.CALL:
                var funcSpec_1 = this.symbolTable.lookupNode(statement.func);
                var actuals_1 = statement.args.map(function (a) { return a.actual; });
                this.def.params.forEach(function (param, i) {
                    // For a method, the first parameter is self, which we assign 0. The other parameters are numbered from 1.
                    // For a function def, the parameters are numbered from 1.
                    var paramNum = _this.isMethod ? i : i + 1;
                    if (funcSpec_1) {
                        // If we have a spec, see if the parameter is passed as an actual that's side-effected.
                        var paramFlows = _this.flows.filter(function (f) { return f.fromNode === param && f.toNode === statement && f.toRef !== undefined; });
                        var updates_1 = funcSpec_1.updates.filter(function (u) { return typeof u === 'number'; });
                        if (updates_1.length > 0 && !paramFlows.empty && _this.spec.updates.indexOf(paramNum) < 0) {
                            paramFlows.items.forEach(function (pf) {
                                if (updates_1.find(function (i) { return i > 0 && ast.walk(actuals_1[i - 1]).find(function (a) { return a.type === ast.NAME && a.id === pf.toRef.name; }); })) {
                                    _this.spec.updates.push(paramNum);
                                }
                                else if (updates_1.indexOf(0) >= 0 && statement.func.type === ast.DOT && statement.func.value.type === ast.NAME && statement.func.value.id === pf.toRef.name) {
                                    _this.spec.updates.push(0);
                                }
                            });
                        }
                    }
                    else {
                        // No spec, be conservative and assume this parameter is side-effected.
                        _this.spec.updates.push(paramNum);
                    }
                });
                break;
        }
    };
    return ParameterSideEffectAnalysis;
}(AnalysisWalker));
function getParameterRefs(def) {
    return new (RefSet.bind.apply(RefSet, [void 0].concat(def.params.map(function (p) {
        return ({ name: p.name, level: ReferenceType.DEFINITION, type: SymbolType.VARIABLE, location: p.location, node: p });
    }))))();
}
function getNodeId(node) {
    return "" + ast.locationString(node.location);
}
function getDataflowId(df) {
    if (!df.fromNode.location) {
        console.log('*** FROM', df.fromNode, df.fromNode.location);
    }
    if (!df.toNode.location) {
        console.log('*** TO', df.toNode, df.toNode.location);
    }
    return getNodeId(df.fromNode) + "->" + getNodeId(df.toNode);
}
//# sourceMappingURL=data-flow.js.map