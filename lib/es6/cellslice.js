var CellSlice = /** @class */ (function () {
    /**
     * Construct an instance of a cell slice.
     */
    function CellSlice(cell, slice, executionTime) {
        this.cell = cell;
        this._slice = slice;
        this.executionTime = executionTime;
    }
    Object.defineProperty(CellSlice.prototype, "textSlice", {
        /**
         * Get the text in the slice of a cell.
         */
        get: function () {
            return this.getTextSlice(false);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CellSlice.prototype, "textSliceLines", {
        /**
         * Get the text of all lines in a slice (no deletions from lines).
         */
        get: function () {
            return this.getTextSlice(true);
        },
        enumerable: true,
        configurable: true
    });
    CellSlice.prototype.getTextSlice = function (fullLines) {
        var sliceLocations = this.slice.items;
        var textLines = this.cell.text.split('\n');
        return sliceLocations
            .sort(function (l1, l2) { return l1.first_line - l2.first_line; })
            .map(function (loc) {
            // grab the desired subset of lines (they are one-indexed)
            var lines = textLines.slice(loc.first_line - 1, loc.last_line + (loc.last_column > 0 ? 0 : -1));
            if (!fullLines) {
                // if we don't want full lines, then adjust the first and last lines based on columns
                if (loc.last_line === loc.first_line) {
                    lines[0] = lines[0].slice(loc.first_column, loc.last_column);
                }
                else {
                    lines[0] = lines[0].slice(loc.first_column);
                    var last = lines.length - 1;
                    lines[last] = lines[last].slice(0, loc.last_column);
                }
            }
            return lines.join('\n');
        })
            .filter(function (text) { return text != ''; })
            .join('\n');
    };
    Object.defineProperty(CellSlice.prototype, "slice", {
        /**
         * Get the slice.
         */
        get: function () {
            return this._slice;
        },
        /**
         * Set the slice.
         */
        set: function (slice) {
            this._slice = slice;
        },
        enumerable: true,
        configurable: true
    });
    return CellSlice;
}());
export { CellSlice };
//# sourceMappingURL=cellslice.js.map