import { FunctionSpec, TypeSpec, ModuleSpec, ModuleMap, JsonSpecs } from ".";
import * as ast from './python-parser';
export declare class SymbolTable {
    private jsonSpecs;
    modules: ModuleMap<FunctionSpec>;
    types: {
        [name: string]: TypeSpec<FunctionSpec>;
    };
    functions: {
        [name: string]: FunctionSpec;
    };
    constructor(jsonSpecs: JsonSpecs);
    lookupFunction(name: string): FunctionSpec;
    lookupNode(func: ast.SyntaxNode): FunctionSpec;
    lookupModuleFunction(modName: string, funcName: string): FunctionSpec;
    importModule(modulePath: string, alias: string): ModuleSpec<FunctionSpec>;
    importModuleDefinitions(namePath: string, imports: {
        path: string;
        name: string;
    }[]): ModuleSpec<FunctionSpec>;
    private lookupSpec;
}
