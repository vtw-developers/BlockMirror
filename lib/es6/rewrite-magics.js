/**
 * Utility to rewrite IPython code to remove magics.
 * Should be applied at to cells, not the entire program, to properly handle cell magics.
 * One of the most important aspects of the rewriter is that it shouldn't change the line number
 * of any of the statements in the program. If it does, this will make it impossible to
 * map back from the results of code analysis to the relevant code in the editor.
 */
var MagicsRewriter = /** @class */ (function () {
    /**
     * Construct a magics rewriter.
     */
    function MagicsRewriter(lineMagicRewriters) {
        this._defaultLineMagicRewriters = [
            new TimeLineMagicRewriter(),
            new PylabLineMagicRewriter(),
        ];
        this._lineMagicRewriters =
            lineMagicRewriters || this._defaultLineMagicRewriters;
    }
    /**
     * Rewrite code so that it doesn't contain magics.
     */
    MagicsRewriter.prototype.rewrite = function (text, lineMagicRewriters) {
        text = this.rewriteCellMagic(text);
        text = this.rewriteLineMagic(text, this._lineMagicRewriters);
        return text;
    };
    /**
     * Default rewrite rule for cell magics.
     */
    MagicsRewriter.prototype.rewriteCellMagic = function (text) {
        // 
        if (text.match(/^[^#\s]*\s*%%/gm)) {
            return text
                .split('\n')
                .map(function (l) { return '##' + l; }) // #%% is used for VS Code Python cell markers, so avoid that combo
                .join('\n');
        }
        return text;
    };
    /**
     * Default rewrite rule for line magics.
     */
    MagicsRewriter.prototype.rewriteLineMagic = function (text, lineMagicRewriters) {
        // Create a mapping from character offsets to line starts.
        var lines = text.split('\n');
        var lastLineStart = 0;
        var lineStarts = lines.map(function (line, i) {
            if (i == 0) {
                return 0;
            }
            var lineStart = lastLineStart + lines[i - 1].length + 1;
            lastLineStart = lineStart;
            return lineStart;
        });
        // Map magic to comment and location.
        return text.replace(/^\s*(%(?:\\\s*\n|[^\n])+)/gm, function (match, magicStmt) {
            // Find the start and end lines where the character appeared.
            var startLine = -1, startCol = -1;
            var endLine = -1, endCol = -1;
            var offset = match.length - magicStmt.length;
            for (var i = 0; i < lineStarts.length; i++) {
                if (offset >= lineStarts[i]) {
                    startLine = i;
                    startCol = offset - lineStarts[i];
                }
                if (offset + magicStmt.length >= lineStarts[i]) {
                    endLine = i;
                    endCol = offset + magicStmt.length - lineStarts[i];
                }
            }
            var position = [
                { line: startLine, col: startCol },
                { line: endLine, col: endCol },
            ];
            var magicStmtCleaned = magicStmt.replace(/\\\s*\n/g, '');
            var commandMatch = magicStmtCleaned.match(/^%(\w+).*/);
            var rewriteText;
            var annotations = [];
            // Look for command-specific rewrite rules.
            if (commandMatch && commandMatch.length >= 2) {
                var command = commandMatch[1];
                if (lineMagicRewriters) {
                    for (var _i = 0, lineMagicRewriters_1 = lineMagicRewriters; _i < lineMagicRewriters_1.length; _i++) {
                        var lineMagicRewriter = lineMagicRewriters_1[_i];
                        if (lineMagicRewriter.commandName == command) {
                            var rewrite = lineMagicRewriter.rewrite(match, magicStmtCleaned, position);
                            if (rewrite.text) {
                                rewriteText = rewrite.text;
                            }
                            if (rewrite.annotations) {
                                annotations = annotations.concat(rewrite.annotations);
                            }
                            break;
                        }
                    }
                }
            }
            // Default rewrite: comment out all lines.
            if (!rewriteText) {
                rewriteText = match
                    .split('\n')
                    .map(function (s) { return '#' + s; })
                    .join('\n');
            }
            // Add annotations to the beginning of the magic.
            for (var _a = 0, annotations_1 = annotations; _a < annotations_1.length; _a++) {
                var annotation = annotations_1[_a];
                rewriteText =
                    "'''" +
                        annotation.key +
                        ': ' +
                        annotation.value +
                        "'''" +
                        ' ' +
                        rewriteText;
            }
            return rewriteText;
        });
    };
    return MagicsRewriter;
}());
export { MagicsRewriter };
/**
 * Line magic rewriter for the "time" magic.
 */
var TimeLineMagicRewriter = /** @class */ (function () {
    function TimeLineMagicRewriter() {
        this.commandName = 'time';
    }
    TimeLineMagicRewriter.prototype.rewrite = function (matchedText, magicStmt, position) {
        return {
            text: matchedText.replace(/^\s*%time/, function (match) {
                return '"' + ' '.repeat(match.length - 2) + '"';
            }),
        };
    };
    return TimeLineMagicRewriter;
}());
export { TimeLineMagicRewriter };
/**
 * Line magic rewriter for the "pylab" magic.
 */
var PylabLineMagicRewriter = /** @class */ (function () {
    function PylabLineMagicRewriter() {
        this.commandName = 'pylab';
    }
    PylabLineMagicRewriter.prototype.rewrite = function (matchedText, magicStmt, position) {
        var defData = [
            'numpy',
            'matplotlib',
            'pylab',
            'mlab',
            'pyplot',
            'np',
            'plt',
            'display',
            'figsize',
            'getfigs',
        ].map(function (symbolName) {
            return {
                name: symbolName,
                pos: [
                    [position[0].line, position[0].col],
                    [position[1].line, position[1].col],
                ],
            };
        });
        return {
            annotations: [{ key: 'defs', value: JSON.stringify(defData) }],
        };
    };
    return PylabLineMagicRewriter;
}());
export { PylabLineMagicRewriter };
//# sourceMappingURL=rewrite-magics.js.map