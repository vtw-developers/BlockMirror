import { Set } from ".";
var Graph = /** @class */ (function () {
    function Graph(getIdentifier) {
        this.getIdentifier = getIdentifier;
        this.outgoing = new Map();
        this.incoming = new Map();
        this._nodes = new Set(getIdentifier);
    }
    Graph.prototype.addEdge = function (fromNode, toNode) {
        this._nodes.add(fromNode);
        this._nodes.add(toNode);
        if (!this.outgoing.has(fromNode)) {
            this.outgoing.set(fromNode, new Set(this.getIdentifier));
        }
        if (!this.incoming.has(toNode)) {
            this.incoming.set(toNode, new Set(this.getIdentifier));
        }
        this.outgoing.get(fromNode).add(toNode);
        this.incoming.get(toNode).add(fromNode);
    };
    Object.defineProperty(Graph.prototype, "nodes", {
        // tslint:disable-next-line: prefer-array-literal
        get: function () { return this._nodes.items; },
        enumerable: true,
        configurable: true
    });
    Graph.prototype.topoSort = function () {
        var _this = this;
        var sorted = [];
        var work = new (Set.bind.apply(Set, [void 0, this.getIdentifier].concat(this.nodes.filter(function (n) { return !_this.incoming.has(n); }))))();
        var _loop_1 = function () {
            var n = work.pop();
            sorted.push(n);
            if (this_1.outgoing.has(n)) {
                this_1.outgoing.get(n).items.forEach(function (m) {
                    _this.outgoing.get(n).remove(m);
                    _this.incoming.get(m).remove(n);
                    if (_this.incoming.get(m).empty) {
                        work.add(m);
                    }
                });
            }
        };
        var this_1 = this;
        while (!work.empty) {
            _loop_1();
        }
        return sorted;
    };
    return Graph;
}());
export { Graph };
//# sourceMappingURL=graph.js.map