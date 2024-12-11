import { expect } from 'chai';
import { parse, walk } from '../python-parser';
describe('python parser', function () {
    // The next two tests were because the lexer was confused about how to handle dots. It
    // couldn't read a dot followed by digits as a floating point number.
    it('can parse floats that have no digits before the dot', function () {
        parse('a = .2\n');
    });
    it('can also parse calls on objects', function () {
        parse('obj.prop\n');
    });
    it('can parse comments', function () {
        var tree = parse('#\n');
        expect(tree.code).to.be.an('array');
        expect(tree.code.length).to.equal(0);
    });
    it('can parse scientific notation', function () {
        parse('1e5\n');
    });
    it('can parse imaginary numbers', function () {
        parse('x = 12j\n');
    });
    it('can parse lambdas with keyword', function () {
        parse('f = (lambda document, **variety: document)\n');
    });
    it('parses a dictionary with a `comp_for`', function () {
        var mod = parse('{k: v for (k, v) in d.items()}\n');
        expect(mod).to.exist;
        expect(mod.code).to.have.length;
        var node = mod.code[0];
        expect(node.entries.length).to.equal(1);
        expect(node.comp_for).to.exist;
    });
    it('can parse line continuations', function () {
        parse(['a = b\\', '.func(1, 2)\\', '.func(3, 4)', ''].join('\n'));
    });
    it('produces the full location of a line for a call statement', function () {
        var node = parse(['obj.func()', ''].join('\n')).code[0];
        expect(node.location).to.deep.equal({
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 10,
        });
    });
    it('does not crash on correct code after parsing bad code', function () {
        expect(function () { return parse('print(1\n'); }).to.throw();
        expect(function () { return parse('a + 1\nb = a\n'); }).not.to.throw();
    });
    it('handles docstrings', function () {
        var node = parse([
            'def foo():',
            '    """',
            '    this function',
            '    does nothing',
            '    """',
            '    pass\n',
        ].join('\n'));
        expect(node).to.exist;
        expect(node.code).to.have.length(1);
        expect(node.code[0].type).to.equal('def');
        var def = node.code[0];
        expect(def.code).to.have.length(2);
        expect(def.code[0].type).to.equal('literal');
        expect(def.code[1].type).to.equal('pass');
        var docstring = def.code[0];
        expect(docstring).to.exist;
        expect(docstring.type).to.equal('literal');
    });
});
describe('ast walker', function () {
    it("doesn't crash on try-execpt blocks", function () {
        var tree = parse(['try:', '    pass', 'except:', '    pass', ''].join('\n'));
        walk(tree);
    });
    it("doesn't crash on with-statements", function () {
        var tree = parse(['with sns.axes_style("white"):', '    pass', ''].join('\n'));
        walk(tree);
    });
});
//# sourceMappingURL=parser.test.js.map