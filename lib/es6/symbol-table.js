import * as ast from './python-parser.js';
function mapDict(obj, f) {
    var result = {};
    Object.keys(obj).forEach(function (k) { return result[k] = f(obj[k]); });
    return result;
}
function cleanFunc(fdesc) {
    if (typeof fdesc === 'string') {
        return { name: fdesc, reads: [], updates: [] };
    }
    else {
        if (!fdesc.reads) {
            fdesc.reads = [];
        }
        if (!fdesc.updates) {
            fdesc.updates = [];
        }
        return fdesc;
    }
}
function cleanType(tdesc) {
    return {
        methods: tdesc.methods ? tdesc.methods.map(function (m) { return cleanFunc(m); }) : []
    };
}
function cleanModule(mdesc) {
    var mod = {
        functions: mdesc.functions ? mdesc.functions.map(function (f) { return cleanFunc(f); }) : [],
        types: mdesc.types ? mapDict(mdesc.types, cleanType) : {},
        modules: mdesc.modules ? mapDict(mdesc.modules, cleanModule) : {}
    };
    mod.functions.forEach(function (f) {
        if (f.returns) {
            f.returnsType = mod.types[f.returns];
        }
    });
    Object.keys(mod.types).forEach(function (typename) {
        var ty = mod.types[typename];
        ty.methods.forEach(function (f) {
            if (f.returns) {
                f.returnsType = mod.types[f.returns];
            }
        });
    });
    return mod;
}
var SymbolTable = /** @class */ (function () {
    function SymbolTable(jsonSpecs) {
        this.jsonSpecs = jsonSpecs;
        this.modules = {};
        this.types = {};
        this.functions = {};
        // preload all the built-in functions.
        this.importModuleDefinitions('__builtins__', [{ path: '*', name: '' }]);
    }
    SymbolTable.prototype.lookupFunction = function (name) {
        var spec = this.functions[name];
        if (spec) {
            return spec;
        }
        var clss = this.types[name];
        if (clss) {
            return clss.methods.find(function (fn) { return fn.name === '__init__'; }) ||
                { name: '__init__', updates: ['0'], returns: name, returnsType: clss };
        }
        return undefined;
    };
    SymbolTable.prototype.lookupNode = function (func) {
        return func.type === ast.NAME ? this.lookupFunction(func.id) :
            func.type === ast.DOT && func.value.type === ast.NAME ? this.lookupModuleFunction(func.value.id, func.name)
                : undefined;
    };
    SymbolTable.prototype.lookupModuleFunction = function (modName, funcName) {
        var mod = this.modules[modName];
        return mod ? mod.functions.find(function (f) { return f.name === funcName; }) : undefined;
    };
    SymbolTable.prototype.importModule = function (modulePath, alias) {
        var spec = this.lookupSpec(this.jsonSpecs, modulePath.split('.'));
        if (!spec) {
            console.log("*** WARNING no spec for module " + modulePath);
            return;
        }
        if (modulePath) {
            this.modules[modulePath] = spec;
            if (alias && alias.length) {
                this.modules[alias] = spec;
            }
        }
    };
    SymbolTable.prototype.importModuleDefinitions = function (namePath, imports) {
        var _this = this;
        var spec = this.lookupSpec(this.jsonSpecs, namePath.split('.'));
        if (!spec) {
            console.log("*** WARNING no spec for module " + namePath);
            return;
        }
        if (spec) {
            imports.forEach(function (imp) {
                var funs = spec.functions ? spec.functions.map(function (f) { return cleanFunc(f); }) : [];
                if (imp.path === '*') {
                    funs.forEach(function (f) { return _this.functions[f.name] = f; });
                    if (spec.types) {
                        Object.keys(spec.types).forEach(function (fname) { return _this.types[fname] = spec.types[fname]; });
                    }
                }
                else if (spec.types && spec.types[imp.name]) {
                    _this.types[imp.name] = spec.types[imp.name];
                }
                else {
                    var fspec = funs.find(function (f) { return f.name === imp.name; });
                    if (fspec) {
                        _this.functions[fspec.name] = fspec;
                    }
                }
            });
        }
        else {
            console.log("*** WARNING no spec for module " + namePath);
        }
    };
    SymbolTable.prototype.lookupSpec = function (map, parts) {
        if (!map || parts.length == 0) {
            return undefined;
        }
        var spec = map[parts[0]];
        if (!spec) {
            return undefined;
        }
        if (parts.length > 1) {
            return this.lookupSpec(spec.modules, parts.slice(1));
        }
        else {
            return cleanModule(spec);
        }
    };
    return SymbolTable;
}());
export { SymbolTable };
//# sourceMappingURL=symbol-table.js.map