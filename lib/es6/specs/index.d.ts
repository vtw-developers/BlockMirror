export interface FunctionSpec {
    name: string;
    updates?: (string | number)[];
    reads?: string[];
    returns?: string;
    returnsType?: TypeSpec<FunctionSpec>;
    higherorder?: number;
}
export declare type FunctionDescription = string | FunctionSpec;
export interface TypeSpec<FD> {
    methods?: FD[];
}
export interface ModuleSpec<FD> extends TypeSpec<FD> {
    functions?: FD[];
    modules?: ModuleMap<FD>;
    types?: {
        [typeName: string]: TypeSpec<FD>;
    };
}
export interface ModuleMap<FD> {
    [moduleName: string]: ModuleSpec<FD>;
}
export declare type JsonSpecs = ModuleMap<FunctionDescription>;
export declare const DefaultSpecs: JsonSpecs;
