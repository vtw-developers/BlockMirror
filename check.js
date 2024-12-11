
Object.defineProperty(exports, \"__esModule\", { value: true });
var python3_1 = __webpack_require__(/*! ./python3 */ \"./src/python3.js\");
var printNode_1 = __webpack_require__(/*! ./printNode */ \"./src/printNode.ts\");
/**
 * Reset the lexer state after an error. Otherwise, parses after a failed parse can fail too.
 */
var yy = python3_1.parser.yy;
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
function parse(program) {
    if (program.charCodeAt(0) === 65279) {
        // eliminate byte order mark
        program = program.slice(1);
    }
    // The parser is fussy about line endings, so remote
    // carriage returns and make sure we end with a newline.
    return python3_1.parse(program.replace(/\/g, '') + '\
');
}
exports.parse = parse;
function locationString(loc) {
    return \"\" + loc.path + loc.last_line + \":\" + loc.first_column + \"-\" + loc.last_line + \":\" + loc.last_column;
}
exports.locationString = locationString;
// loc2 is inside loc1
function locationContains(loc1, loc2) {
    function contains(loc, line, col) {
        return ((loc.first_line < line ||
            (loc.first_line === line && loc.first_column <= col)) &&
            (line < loc.last_line ||
                (line === loc.last_line && col <= loc.last_column)));
    }
    return (contains(loc1, loc2.first_line, loc2.first_column) &&
        contains(loc1, loc2.last_line, loc2.last_column));
}
exports.locationContains = locationContains;
var LocatableFields = ['location', 'cellId', 'executionCount'];
exports.MODULE = 'module';
exports.IMPORT = 'import';
exports.FROM = 'from';
exports.DECORATOR = 'decorator';
exports.DECORATE = 'decorate';
exports.DEF = 'def';
exports.PARAMETER = 'parameter';
exports.ASSIGN = 'assign';
exports.ASSERT = 'assert';
exports.PASS = 'pass';
exports.RETURN = 'return';
exports.YIELD = 'yield';
exports.RAISE = 'raise';
exports.BREAK = 'break';
exports.CONTINUE = 'continue';
exports.GLOBAL = 'global';
exports.NONLOCAL = 'nonlocal';
exports.IF = 'if';
exports.WHILE = 'while';
exports.ELSE = 'else';
exports.FOR = 'for';
exports.COMPFOR = 'comp_for';
exports.COMPIF = 'comp_if';
exports.TRY = 'try';
exports.WITH = 'with';
exports.CALL = 'call';
exports.ARG = 'arg';
exports.INDEX = 'index';
exports.SLICE = 'slice';
exports.DOT = 'dot';
exports.IFEXPR = 'ifexpr';
exports.LAMBDA = 'lambda';
exports.UNOP = 'unop';
exports.BINOP = 'binop';
exports.STARRED = 'starred';
exports.TUPLE = 'tuple';
exports.LIST = 'list';
exports.SET = 'set';
exports.DICT = 'dict';
exports.NAME = 'name';
exports.LITERAL = 'literal';
exports.CLASS = 'class';
/*
    UTILITY FUNCTIONS
*/
/**
 * returns whether two syntax nodes are semantically equivalent
 */
function isEquivalent(node1, node2) {
    if (!node1 || !node2) {
        return node1 === node2;
    }
    return printNode_1.printNode(node1) === printNode_1.printNode(node2);
}
exports.isEquivalent = isEquivalent;
function flatten(arrayArrays) {
    return [].concat.apply([], arrayArrays);
}
exports.flatten = flatten;
/**
 * Preorder tree traversal with optional listener.
 */
function walk(node, walkListener) {
    return walkRecursive(node, [], walkListener);
}
exports.walk = walk;
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
        case exports.MODULE:
        case exports.DEF:
        case exports.CLASS:
            children = node.code;
            break;
        case exports.IF:
            children = [node.cond]
                .concat(node.code)
                .concat(node.elif ? flatten(node.elif.map(function (e) { return [e.cond].concat(e.code); })) : [])
                .concat(node.else ? [node.else] : []);
            break;
        case exports.ELSE:
            children = node.code;
            break;
        case exports.WHILE:
            children = [node.cond].concat(node.code);
            break;
        case exports.WITH:
            children = flatten(node.items.map(function (r) { return [r.with, r.as]; })).concat(node.code);
            break;
        case exports.FOR:
            children = node.iter.concat(node.target).concat(node.code);
            break;
        case exports.TRY:
            children = node.code
                .concat(flatten((node.excepts || []).map(function (e) {
                return (e.cond ? [e.cond] : []).concat(e.code);
            })))
                .concat(node.else || [])
                .concat(node.finally || []);
            break;
        case exports.DECORATE:
            children = [node.def];
            break;
        case exports.LAMBDA:
            children = [node.code];
            break;
        case exports.CALL:
            children = [node.func].concat(node.args.map(function (a) { return a.actual; }));
            break;
        case exports.IFEXPR:
            children = [node.test, node.then, node.else];
            break;
        case exports.COMPFOR:
            children = node.for.concat([node.in]);
            break;
        case exports.UNOP:
            children = [node.operand];
            break;
        case exports.BINOP:
            children = [node.left, node.right];
            break;
        case exports.STARRED:
            children = [node.value];
            break;
        case exports.SET:
            children = node.entries.concat(node.comp_for ? node.comp_for : []);
            break;
        case exports.LIST:
            children = node.items;
            break;
        case exports.TUPLE:
            children = node.items;
            break;
        case exports.DICT:
            children = flatten(node.entries.map(function (p) { return [p.k, p.v]; })).concat(node.comp_for ? node.comp_for : []);
            break;
        case exports.ASSIGN:
            if (!node.sources)
                console.log(node);
            children = node.sources.concat(node.targets);
            break;
        case exports.ASSERT:
            children = [node.cond].concat(node.err ? [node.err] : []);
            break;
        case exports.DOT:
            children = [node.value];
            break;
        case exports.INDEX:
            children = [node.value].concat(node.args);
            break;
        case exports.SLICE:
            children = (node.start ? [node.start] : [])
                .concat(node.stop ? [node.stop] : [])
                .concat(node.step ? [node.step] : []);
            break;
        case exports.COMPFOR:
            children = node.for.concat([node.in]);
            break;
        case exports.COMPIF:
            children = [node.test];
            break;
        case exports.YIELD:
            children = node.value ? node.value : [];
            break;
        case exports.RETURN:
            children = node.values ? node.values : [];
            break;
        case exports.RAISE:
            children = node.err ? [node.err] : [];
            break;
        case exports.IFEXPR:
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


//# sourceURL=webpack:///./src/python-parser.ts?