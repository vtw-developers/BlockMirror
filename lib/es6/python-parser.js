import { parse as python3Parse, parser } from './python3.js';
import { printNode } from './printNode.js';
/**
 * Reset the lexer state after an error. Otherwise, parses after a failed parse can fail too.
 */
var yy = parser.yy;
var oldParseError = yy.parseError;
oldParseError = function (text, hash) {
    this.indents = [0];
    this.indent = 0;
    this.dedents = 0;
    this.brackets_count = 0;
    oldParseError.call(this, text, hash);
};
/**
 * This is the main interface for parsing code.
 * Call this instead of the `parse` method in python3.js.
 * If the `parse` method gets an error, all later calls will throw an error.
 * This method resets the state of the `parse` method so that doesn't happen.
 */
export function parse(program) {
    if (program.charCodeAt(0) === 65279) {
        // eliminate byte order mark
        program = program.slice(1);
    }
    // The parser is fussy about line endings, so remote
    // carriage returns and make sure we end with a newline.
    return python3Parse(program.replace(/\r/g, '') + '\n');
}
export function locationString(loc) {
    return "" + loc.path + loc.last_line + ":" + loc.first_column + "-" + loc.last_line + ":" + loc.last_column;
}
// loc2 is inside loc1
export function locationContains(loc1, loc2) {
    function contains(loc, line, col) {
        return ((loc.first_line < line ||
            (loc.first_line === line && loc.first_column <= col)) &&
            (line < loc.last_line ||
                (line === loc.last_line && col <= loc.last_column)));
    }
    return (contains(loc1, loc2.first_line, loc2.first_column) &&
        contains(loc1, loc2.last_line, loc2.last_column));
}
var LocatableFields = ['location', 'cellId', 'executionCount'];
export var MODULE = 'module';
export var IMPORT = 'import';
export var FROM = 'from';
export var DECORATOR = 'decorator';
export var DECORATE = 'decorate';
export var DEF = 'def';
export var PARAMETER = 'parameter';
export var ASSIGN = 'assign';
export var ASSERT = 'assert';
export var PASS = 'pass';
export var RETURN = 'return';
export var YIELD = 'yield';
export var RAISE = 'raise';
export var BREAK = 'break';
export var CONTINUE = 'continue';
export var GLOBAL = 'global';
export var NONLOCAL = 'nonlocal';
export var IF = 'if';
export var WHILE = 'while';
export var ELSE = 'else';
export var FOR = 'for';
export var COMPFOR = 'comp_for';
export var COMPIF = 'comp_if';
export var TRY = 'try';
export var WITH = 'with';
export var CALL = 'call';
export var ARG = 'arg';
export var INDEX = 'index';
export var SLICE = 'slice';
export var DOT = 'dot';
export var IFEXPR = 'ifexpr';
export var LAMBDA = 'lambda';
export var UNOP = 'unop';
export var BINOP = 'binop';
export var STARRED = 'starred';
export var TUPLE = 'tuple';
export var LIST = 'list';
export var SET = 'set';
export var DICT = 'dict';
export var NAME = 'name';
export var LITERAL = 'literal';
export var CLASS = 'class';
/*
    UTILITY FUNCTIONS
*/
/**
 * returns whether two syntax nodes are semantically equivalent
 */
export function isEquivalent(node1, node2) {
    if (!node1 || !node2) {
        return node1 === node2;
    }
    return printNode(node1) === printNode(node2);
}
export function flatten(arrayArrays) {
    return [].concat.apply([], arrayArrays);
}
/**
 * Preorder tree traversal with optional listener.
 */
export function walk(node, walkListener) {
    return walkRecursive(node, [], walkListener);
}
/**
 * Recursive implementation of pre-order tree walk.
 */
// tslint:disable-next-line: max-func-body-length
function walkRecursive(node, ancestors, walkListener) {
    if (!node) {
        console.error('Node undefined. Ancestors:', ancestors);
        return [];
    }
    ancestors.push(node);
    if (walkListener && walkListener.onEnterNode) {
        walkListener.onEnterNode(node, ancestors);
    }
    var children = [];
    switch (node.type) {
        case MODULE:
        case DEF:
        case CLASS:
            children = node.code;
            break;
        case IF:
            children = [node.cond]
                .concat(node.code)
                .concat(node.elif ? flatten(node.elif.map(function (e) { return [e.cond].concat(e.code); })) : [])
                .concat(node.else ? [node.else] : []);
            break;
        case ELSE:
            children = node.code;
            break;
        case WHILE:
            children = [node.cond].concat(node.code);
            break;
        case WITH:
            children = flatten(node.items.map(function (r) { return [r.with, r.as]; })).concat(node.code);
            break;
        case FOR:
            children = node.iter.concat(node.target).concat(node.code);
            break;
        case TRY:
            children = node.code
                .concat(flatten((node.excepts || []).map(function (e) {
                return (e.cond ? [e.cond] : []).concat(e.code);
            })))
                .concat(node.else || [])
                .concat(node.finally || []);
            break;
        case DECORATE:
            children = [node.def];
            break;
        case LAMBDA:
            children = [node.code];
            break;
        case CALL:
            children = [node.func].concat(node.args.map(function (a) { return a.actual; }));
            break;
        case IFEXPR:
            children = [node.test, node.then, node.else];
            break;
        case COMPFOR:
            children = node.for.concat([node.in]);
            break;
        case UNOP:
            children = [node.operand];
            break;
        case BINOP:
            children = [node.left, node.right];
            break;
        case STARRED:
            children = [node.value];
            break;
        case SET:
            children = node.entries.concat(node.comp_for ? node.comp_for : []);
            break;
        case LIST:
            children = node.items;
            break;
        case TUPLE:
            children = node.items;
            break;
        case DICT:
            children = flatten(node.entries.map(function (p) { return [p.k, p.v]; })).concat(node.comp_for ? node.comp_for : []);
            break;
        case ASSIGN:
            if (!node.sources)
                console.log(node);
            children = node.sources.concat(node.targets);
            break;
        case ASSERT:
            children = [node.cond].concat(node.err ? [node.err] : []);
            break;
        case DOT:
            children = [node.value];
            break;
        case INDEX:
            children = [node.value].concat(node.args);
            break;
        case SLICE:
            children = (node.start ? [node.start] : [])
                .concat(node.stop ? [node.stop] : [])
                .concat(node.step ? [node.step] : []);
            break;
        case COMPFOR:
            children = node.for.concat([node.in]);
            break;
        case COMPIF:
            children = [node.test];
            break;
        case YIELD:
            children = node.value ? node.value : [];
            break;
        case RETURN:
            children = node.values ? node.values : [];
            break;
        case RAISE:
            children = node.err ? [node.err] : [];
            break;
        case IFEXPR:
            children = [node.test, node.then, node.else];
            break;
    }
    var nodes = [node];
    if (children.some(function (c) { return !c; })) {
        console.log('BAD CHILDREN', node);
    }
    var subtreeNodes = flatten(children.map(function (node) { return walkRecursive(node, ancestors, walkListener); }));
    nodes = nodes.concat(subtreeNodes);
    if (walkListener && walkListener.onExitNode) {
        walkListener.onExitNode(node, ancestors);
    }
    ancestors.pop();
    return nodes;
}
//# sourceMappingURL=python-parser.js.map