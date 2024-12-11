import { expect } from 'chai';
import { MagicsRewriter, PylabLineMagicRewriter, TimeLineMagicRewriter, } from '../rewrite-magics';
describe('MagicsRewriter', function () {
    var magicsTranslator;
    beforeEach(function () {
        magicsTranslator = new MagicsRewriter();
    });
    function rewrite() {
        var codeLines = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            codeLines[_i] = arguments[_i];
        }
        return magicsTranslator.rewrite(codeLines.join('\n'));
    }
    it('comments out line magics and annotates them with their position', function () {
        var rewritten = rewrite('%some_magic arg1 arg2');
        expect(rewritten).to.equal('#%some_magic arg1 arg2');
    });
    it('rewrites line magics with line continuations', function () {
        var rewritten = rewrite('%some_magic arg1 \\ ', '    arg2');
        expect(rewritten).to.equal(['#%some_magic arg1 \\ ', '#    arg2'].join('\n'));
    });
    it('allows line magics to start after any number of whitespaces', function () {
        var rewritten = rewrite('   %some_magic arg1 arg2');
        expect(rewritten).to.equal('#   %some_magic arg1 arg2');
    });
    it("doesn't detect a % mid-line as a magic", function () {
        var rewritten = rewrite('print(a) %some_magic');
        expect(rewritten).to.equal('print(a) %some_magic');
    });
    it('by default comments out cell magics', function () {
        var rewritten = rewrite('%%some_cell_magic', 'line 1', 'line 2');
        expect(rewritten).to.equal(['##%%some_cell_magic', '##line 1', '##line 2'].join('\n'));
    });
    it('allows cell magics to start after any number of whitespaces', function () {
        var rewritten = rewrite('   %%some_cell_magic');
        expect(rewritten).to.equal('##   %%some_cell_magic');
    });
    it('does not treat VS Code cell markers as magic', function () {
        var code = ['#%%', 'x=3'];
        var rewritten = rewrite.apply(void 0, code);
        expect(rewritten).to.equal(code.join('\n'));
    });
    it("does nothing to text that doesn't have magics", function () {
        var rewritten = rewrite('print(a)');
        expect(rewritten).to.equal('print(a)');
    });
    it('applies custom rewrite rules and annotations', function () {
        var magicsTranslator = new MagicsRewriter([
            {
                commandName: 'foo',
                rewrite: function (_, __, ___) {
                    return {
                        text: '# foo_found',
                        annotations: [{ key: 'foo_tag', value: 'bar_value' }],
                    };
                },
            },
        ]);
        var rewritten = magicsTranslator.rewrite('%foo arg1 arg2');
        expect(rewritten).to.equal("'''foo_tag: bar_value''' # foo_found");
    });
    var EXAMPLE_POSITION = [
        { line: 0, col: 0 },
        { line: 0, col: 10 },
    ];
    describe('TimeLineMagicRewriter', function () {
        it('replaces %time with an equivalent-length string literal', function () {
            var rewrite = new TimeLineMagicRewriter().rewrite('%time print(a)', '', EXAMPLE_POSITION);
            expect(rewrite.text).to.equal('"   " print(a)');
        });
    });
    describe('MatplotlibLineMagicRewriter', function () {
        it('adds annotations for its position and defined symbols', function () {
            var rewrite = new PylabLineMagicRewriter().rewrite('%pylab inline', '%pylab inline', EXAMPLE_POSITION);
            expect(rewrite.text).to.be.undefined;
            expect(rewrite.annotations).to.deep.equal([
                {
                    key: 'defs',
                    value: JSON.stringify([
                        { name: 'numpy', pos: [[0, 0], [0, 10]] },
                        { name: 'matplotlib', pos: [[0, 0], [0, 10]] },
                        { name: 'pylab', pos: [[0, 0], [0, 10]] },
                        { name: 'mlab', pos: [[0, 0], [0, 10]] },
                        { name: 'pyplot', pos: [[0, 0], [0, 10]] },
                        { name: 'np', pos: [[0, 0], [0, 10]] },
                        { name: 'plt', pos: [[0, 0], [0, 10]] },
                        { name: 'display', pos: [[0, 0], [0, 10]] },
                        { name: 'figsize', pos: [[0, 0], [0, 10]] },
                        { name: 'getfigs', pos: [[0, 0], [0, 10]] },
                    ]),
                },
            ]);
        });
    });
});
//# sourceMappingURL=magics-rewriter.test.js.map