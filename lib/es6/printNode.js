var comma = ', ';
// tslint:disable-next-line: max-func-body-length
function printTabbed(node, tabLevel) {
    var tabs = ' '.repeat(4 * tabLevel);
    switch (node.type) {
        case 'assert':
            return tabs + 'assert ' + printNode(node.cond);
        case 'assign':
            return (tabs +
                commaSep(node.targets) +
                ' ' +
                (node.op || '=') +
                ' ' +
                commaSep(node.sources));
        case 'binop':
            return '(' + printNode(node.left) + node.op + printNode(node.right) + ')';
        case 'break':
            return tabs + 'break';
        case 'call':
            return printNode(node.func) + '(' + node.args.map(printArg) + ')';
        case 'class':
            return (tabs +
                'class ' +
                node.name +
                (node.extends ? '(' + commaSep(node.extends) + ')' : '') +
                ':' +
                lines(node.code, tabLevel + 1));
        case 'comp_for':
        case 'comp_if':
            throw 'not implemented';
        case 'continue':
            return tabs + 'continue';
        case 'decorator':
            return ('@' +
                node.decorator +
                (node.args ? '(' + commaSep(node.args) + ')' : ''));
        case 'decorate':
            return (tabs +
                lines(node.decorators, tabLevel) +
                printTabbed(node.def, tabLevel));
        case 'def':
            return (tabs +
                'def ' +
                node.name +
                '(' +
                node.params.map(printParam).join(comma) +
                '):' +
                lines(node.code, tabLevel + 1));
        case 'dict':
            return '{' + node.entries.map(function (e) { return e.k + ':' + e.v; }) + '}';
        case 'dot':
            return printNode(node.value) + '.' + node.name;
        case 'else':
            return tabs + 'else:' + lines(node.code, tabLevel + 1);
        case 'for':
            return (tabs +
                'for ' +
                commaSep(node.target) +
                ' in ' +
                commaSep(node.iter) +
                ':' +
                lines(node.code, tabLevel + 1) +
                (node.else ? lines(node.else, tabLevel + 1) : ''));
        case 'from':
            return (tabs +
                'from ' +
                node.base +
                ' import ' +
                node.imports
                    .map(function (im) { return im.path + (im.name ? ' as ' + im.name : ''); })
                    .join(comma));
        case 'global':
            return tabs + 'global ' + node.names.join(comma);
        case 'if':
            return (tabs +
                'if ' +
                printNode(node.cond) +
                ':' +
                lines(node.code, tabLevel + 1) +
                (node.elif
                    ? node.elif.map(function (elif) {
                        return tabs +
                            'elif ' +
                            elif.cond +
                            ':' +
                            lines(elif.code, tabLevel + 1);
                    })
                    : '') +
                (node.else ? tabs + 'else:' + lines(node.else.code, tabLevel + 1) : ''));
        case 'ifexpr':
            return (printNode(node.then) +
                ' if ' +
                printNode(node.test) +
                ' else ' +
                printNode(node.else));
        case 'import':
            return (tabs +
                'import ' +
                node.names
                    .map(function (n) { return n.path + (n.name ? ' as ' + n.name : ''); })
                    .join(comma));
        case 'index':
            return printNode(node.value) + '[' + commaSep(node.args) + ']';
        case 'lambda':
            return ('lambda ' +
                node.args.map(printParam).join(comma) +
                ': ' +
                printNode(node.code));
        case 'list':
            return '[' + node.items.map(function (item) { return printNode(item); }).join(comma) + ']';
        case 'literal':
            return typeof node.value === 'string' && node.value.indexOf('\n') >= 0
                ? '""' + node.value + '""'
                : node.value.toString();
        case 'module':
            return lines(node.code, tabLevel);
        case 'name':
            return node.id;
        case 'nonlocal':
            return tabs + 'nonlocal ' + node.names.join(comma);
        case 'raise':
            return tabs + 'raise ' + printNode(node.err);
        case 'return':
            return tabs + 'return ' + (node.values ? commaSep(node.values) : '');
        case 'set':
            return '{' + commaSep(node.entries) + '}';
        case 'slice':
            return ((node.start ? printNode(node.start) : '') +
                ':' +
                (node.stop ? printNode(node.stop) : '') +
                (node.step ? ':' + printNode(node.step) : ''));
        case 'starred':
            return '*' + printNode(node.value);
        case 'try':
            return (tabs +
                'try:' +
                lines(node.code, tabLevel + 1) +
                (node.excepts
                    ? node.excepts.map(function (ex) {
                        return tabs +
                            'except ' +
                            (ex.cond
                                ? printNode(ex.cond) + (ex.name ? ' as ' + ex.name : '')
                                : '') +
                            ':' +
                            lines(ex.code, tabLevel + 1);
                    })
                    : '') +
                (node.else ? tabs + 'else:' + lines(node.else, tabLevel + 1) : '') +
                (node.finally
                    ? tabs + 'finally:' + lines(node.finally, tabLevel + 1)
                    : ''));
        case 'tuple':
            return '(' + commaSep(node.items) + ')';
        case 'unop':
            return node.op + '(' + printNode(node.operand) + ')';
        case 'while':
            return (tabs +
                'while ' +
                printNode(node.cond) +
                ':' +
                lines(node.code, tabLevel + 1));
        case 'with':
            return (tabs +
                'with ' +
                node.items.map(function (w) { return w.with + (w.as ? ' as ' + w.as : ''); }).join(comma) +
                ':' +
                lines(node.code, tabLevel + 1));
        case 'yield':
            return (tabs +
                'yield ' +
                (node.from ? printNode(node.from) : '') +
                (node.value ? commaSep(node.value) : ''));
    }
}
function printParam(param) {
    return ((param.star ? '*' : '') +
        (param.starstar ? '**' : '') +
        param.name +
        (param.default_value ? '=' + printNode(param.default_value) : '') +
        (param.anno ? printNode(param.anno) : ''));
}
function printArg(arg) {
    return ((arg.kwargs ? '**' : '') +
        (arg.varargs ? '*' : '') +
        (arg.keyword ? printNode(arg.keyword) + '=' : '') +
        printNode(arg.actual) +
        (arg.loop ? ' for ' + arg.loop.for + ' in ' + arg.loop.in : ''));
}
function commaSep(items) {
    return items.map(printNode).join(comma);
}
function lines(items, tabLevel) {
    return items
        .map(function (i) { return printTabbed(i, tabLevel); })
        .join(tabLevel === 0 ? '\n\n' : '\n'); // seperate top-level definitons with an extra newline
}
export function printNode(node) {
    return printTabbed(node, 0);
}
//# sourceMappingURL=printNode.js.map