import { expect } from 'chai';
import { parse } from '../python-parser';
import { ControlFlowGraph } from '../control-flow';
describe('ControlFlowGraph', function () {
    function makeCfg() {
        var codeLines = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            codeLines[_i] = arguments[_i];
        }
        var code = codeLines.concat('').join('\n'); // add newlines to end of every line.
        return new ControlFlowGraph(parse(code));
    }
    it('builds the right successor structure for try-except', function () {
        var cfg = makeCfg('try:', '    return 0', 'except:', '    return 1');
        var handlerHead = cfg.blocks.filter(function (b) { return b.hint == 'handlers'; }).pop();
        expect(cfg.getPredecessors(handlerHead).pop().hint).to.equal('try body');
    });
    it('builds a cfg for a function body', function () {
        var ast = parse([
            'def foo(n):',
            '    if n < 4:',
            '        return 1',
            '    else:',
            '        return 2'
        ].join('\n'));
        expect(ast.code.length).to.be.equal(1);
        expect(ast.code[0].type).to.be.equal('def');
        var cfg = new ControlFlowGraph(ast.code[0]);
        expect(cfg.blocks).to.exist;
        expect(cfg.blocks.length).to.be.equal(6);
    });
});
//# sourceMappingURL=cfg.test.js.map